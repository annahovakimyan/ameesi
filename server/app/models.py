from datetime import date as Date, time as Time
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class TimeWindow(BaseModel):
    from_: Time = Field(alias="from")
    to: Time


class Place(BaseModel):
    geonames_id: int | None = None
    name: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    tz: str


class ChartRequest(BaseModel):
    date: Date
    time: Time | None = None
    time_confidence: Literal["exact", "approximate", "unknown"]
    time_window: TimeWindow | None = None
    place: Place
    house_system: Literal["placidus", "whole_sign"] = "placidus"
    utc_offset_override: int | None = Field(default=None, ge=-14 * 60, le=14 * 60)

    @model_validator(mode="after")
    def check_time(self):
        if self.time_confidence == "exact" and self.time is None:
            raise ValueError("time is required when time_confidence is 'exact'")
        if self.time_confidence == "approximate" and self.time_window is None:
            raise ValueError("time_window is required when time_confidence is 'approximate'")
        if not (1800 <= self.date.year <= 2399):
            raise ValueError("date must be between 1800 and 2399 (ephemeris range)")
        return self
