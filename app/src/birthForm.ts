import type { ChartRequest, HouseSystem, Place, TimeConfidence } from "./api/types";
import { hhmm, isoDate } from "./format";
import type { Consent, Profile } from "./profiles/profiles";

/** Whose birth details: your own (18+ confirmation) or someone else's (name and consent). */
export type Purpose = "self" | "other";

export interface BirthForm {
  date: Date | null;
  confidence: TimeConfidence;
  time: Date | null;
  windowFrom: Date | null;
  windowTo: Date | null;
  place: Place | null;
  adult: boolean;
  houseSystem: HouseSystem;
  name: string;
  consent: Consent["kind"] | null;
}

export const emptyForm: BirthForm = {
  date: null, confidence: "exact", time: null, windowFrom: null, windowTo: null,
  place: null, adult: false, houseSystem: "placidus", name: "", consent: null,
};

export function isComplete(f: BirthForm, purpose: Purpose = "self"): boolean {
  if (!f.date || !f.place) return false;
  if (purpose === "self" && !f.adult) return false;
  if (purpose === "other" && (!f.name.trim() || !f.consent)) return false;
  if (f.confidence === "exact") return !!f.time;
  if (f.confidence === "approximate") return !!f.windowFrom && !!f.windowTo && hhmm(f.windowTo) > hhmm(f.windowFrom);
  return true;
}

export function buildRequest(f: BirthForm, utcOffsetOverride: number | null = null, purpose: Purpose = "self"): ChartRequest {
  if (!isComplete(f, purpose)) throw new Error("form incomplete");
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

const atTime = (hm: string | null) => {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m);
};

/** The form for editing a saved profile. The 18+ and consent confirmations carry over. */
export function formFromProfile(p: Profile): BirthForm {
  const [y, m, d] = p.request.date.split("-").map(Number);
  return {
    date: new Date(y, m - 1, d),
    confidence: p.request.time_confidence,
    time: atTime(p.request.time),
    windowFrom: atTime(p.request.time_window?.from ?? null),
    windowTo: atTime(p.request.time_window?.to ?? null),
    place: p.place,
    adult: p.kind === "self",
    houseSystem: p.request.house_system,
    name: p.name,
    consent: p.consent?.kind ?? null,
  };
}
