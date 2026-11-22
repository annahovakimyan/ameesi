"""Ameesi calculation server. Run: uvicorn app.main:app --reload"""
from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date, time
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.init()  # fail at startup if the ephemeris files are missing
    yield


app = FastAPI(title="Ameesi calculation server", version="0.1.0", lifespan=lifespan)


class Place(BaseModel):
    geonames_id: int | None = None
    name: str | None = None
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    tz: str


class TimeWindow(BaseModel):
    from_: str = Field(alias="from", pattern=r"^\d{2}:\d{2}$")
    to: str = Field(pattern=r"^\d{2}:\d{2}$")


class ChartRequest(BaseModel):
    date: date
    time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    time_confidence: Literal["exact", "approximate", "unknown"]
    time_window: TimeWindow | None = None
    place: Place
    house_system: Literal["placidus", "whole_sign"] = "placidus"
    utc_offset_override: int | None = Field(default=None, ge=-840, le=840)


@app.get("/health")
def health():
    return {"ok": True, "engine": engine.ENGINE_VERSION}


@app.post("/charts/calculate")
def calculate(req: ChartRequest):
    try:
        return engine.calculate(
            birth_date=req.date,
            birth_time=time.fromisoformat(req.time) if req.time else None,
            time_confidence=req.time_confidence,
            time_window={"from": req.time_window.from_, "to": req.time_window.to} if req.time_window else None,
            lat=req.place.lat, lon=req.place.lon, tz=req.place.tz,
            house_system=req.house_system, utc_offset_override=req.utc_offset_override,
        )
    except (engine.EngineError, ValueError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:  # unknown time zone and similar input errors
        if e.__class__.__name__ == "ZoneInfoNotFoundError":
            raise HTTPException(status_code=422, detail=f"unknown time zone: {req.place.tz}")
        raise
