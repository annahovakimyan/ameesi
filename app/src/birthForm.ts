import type { ChartRequest, HouseSystem, Place, TimeConfidence } from "./api/types";
import { hhmm, isoDate } from "./format";

export interface BirthForm {
  date: Date | null;
  confidence: TimeConfidence;
  time: Date | null;
  windowFrom: Date | null;
  windowTo: Date | null;
  place: Place | null;
  adult: boolean;
  houseSystem: HouseSystem;
}

export const emptyForm: BirthForm = {
  date: null, confidence: "exact", time: null, windowFrom: null, windowTo: null,
  place: null, adult: false, houseSystem: "placidus",
};

export function isComplete(f: BirthForm): boolean {
  if (!f.date || !f.place || !f.adult) return false;
  if (f.confidence === "exact") return !!f.time;
  if (f.confidence === "approximate") return !!f.windowFrom && !!f.windowTo && hhmm(f.windowTo) > hhmm(f.windowFrom);
  return true;
}

export function buildRequest(f: BirthForm, utcOffsetOverride: number | null = null): ChartRequest {
  if (!isComplete(f)) throw new Error("form incomplete");
  const p = f.place!;
  return {
    date: isoDate(f.date!),
    time: f.confidence === "exact" ? hhmm(f.time!) : null,
    time_confidence: f.confidence,
    time_window: f.confidence === "approximate" ? { from: hhmm(f.windowFrom!), to: hhmm(f.windowTo!) } : null,
    place: { geonames_id: p.geonames_id, name: p.name, lat: p.lat, lon: p.lon, tz: p.tz },
    house_system: f.houseSystem,
    utc_offset_override: utcOffsetOverride,
  };
}

/** Minutes east of UTC that turn the local wall time into the chosen UTC moment (DST confirmation). */
export function offsetFor(localIso: string, utcIso: string): number {
  const local = Date.parse(`${localIso}:00Z`);
  const utc = Date.parse(utcIso.replace("Z", ":00Z"));
  return Math.round((local - utc) / 60000);
}
