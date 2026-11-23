// Saved birth profiles (PRD FR-09, FR-10). Pure rules; storage is in store.ts.
import type { Chart, ChartRequest, Place } from "../api/types";

/** Free plan: your own chart plus one more (PRD key decisions). More come with Ameesi Plus. */
export const FREE_PROFILES = 2;

export interface Consent {
  kind: "permission" | "guardian"; // "I have their permission" / "I'm their parent or guardian"
  confirmedAt: string;
}

export interface Profile {
  id: string;
  kind: "self" | "other";
  name: string; // empty for your own profile: shown as "Me"
  request: ChartRequest; // exactly what the server is asked to calculate
  place: Place; // for display and editing (region, country, former names)
  placeNames?: Partial<Record<"hy" | "en" | "ru", string>>; // the place's name in each language, when known
  chart?: Chart; // saved result, so the chart opens offline; dropped when birth details change
  consent?: Consent;
  createdAt: string;
  updatedAt: string;
}

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function newProfile(p: {
  kind: Profile["kind"]; name: string; request: ChartRequest; place: Place; chart?: Chart; consent?: Consent; now: string;
}): Profile {
  if (p.kind === "other") {
    if (!p.consent) throw new Error("someone else's profile needs a consent confirmation");
    if (!p.name.trim()) throw new Error("someone else's profile needs a name");
  }
  return { id: newId(), kind: p.kind, name: p.name.trim(), request: p.request, place: p.place, chart: p.chart,
    consent: p.consent, createdAt: p.now, updatedAt: p.now };
}

export function canAdd(profiles: Profile[], kind: Profile["kind"]): { ok: true } | { ok: false; reason: "self_exists" | "limit" } {
  if (kind === "self" && profiles.some((p) => p.kind === "self")) return { ok: false, reason: "self_exists" };
  if (profiles.length >= FREE_PROFILES) return { ok: false, reason: "limit" };
  return { ok: true };
}

const sameBirth = (a: ChartRequest, b: ChartRequest) => JSON.stringify(a) === JSON.stringify(b);

/** Adds or replaces a profile. Changed birth details drop the saved chart (FR-09) unless
 *  `chartIsFresh` says the given chart was just calculated for them. */
export function upsertProfile(profiles: Profile[], profile: Profile, now: string, chartIsFresh = false): Profile[] {
  const old = profiles.find((p) => p.id === profile.id);
  const keepChart = chartIsFresh || !old || sameBirth(old.request, profile.request);
  const next = { ...profile, chart: keepChart ? profile.chart : undefined, updatedAt: now };
  return old ? profiles.map((p) => (p.id === profile.id ? next : p)) : [...profiles, next];
}

export function removeProfile(profiles: Profile[], id: string): Profile[] {
  return profiles.filter((p) => p.id !== id);
}

/** Portable JSON of everything Ameesi keeps about these profiles (FR-09 export). */
export function exportJson(profiles: Profile[], now: string): string {
  return JSON.stringify({
    format: "ameesi-profiles",
    version: 1,
    exported_at: now,
    profiles: profiles.map((p) => ({
      kind: p.kind, name: p.name,
      birth: { date: p.request.date, time: p.request.time, time_confidence: p.request.time_confidence,
        time_window: p.request.time_window, utc_offset_override: p.request.utc_offset_override },
      place: { name: p.place.name, region: p.place.region, country: p.place.country, geonames_id: p.place.geonames_id,
        lat: p.place.lat, lon: p.place.lon, tz: p.place.tz },
      house_system: p.request.house_system,
      consent: p.consent ?? null,
      created_at: p.createdAt, updated_at: p.updatedAt,
      chart: p.chart ?? null,
    })),
  }, null, 2);
}

/** The place name to show in a language: the saved translation, else the name it was saved with. */
export function placeNameIn(p: Profile, lang: "hy" | "en" | "ru"): string {
  return p.placeNames?.[lang] ?? p.place.name;
}
