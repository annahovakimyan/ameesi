// Mirrors the calculation server's responses (server/app/main.py, docs/engine-spec.md).
// The app never calculates astrology: it only displays these values.

export type Lang = "hy" | "en" | "ru";
export type TimeConfidence = "exact" | "approximate" | "unknown";
export type HouseSystem = "placidus" | "whole_sign";
export type SignId =
  | "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo"
  | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";
export type BodyId =
  | "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn"
  | "uranus" | "neptune" | "pluto" | "north_node" | "south_node" | "chiron";
export type AngleId = "asc" | "mc" | "dsc" | "ic";
export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export interface Place {
  geonames_id: number;
  name: string;
  former_names_matched: { name: string; from: number | null; to: number | null }[];
  region: string | null;
  country: string;
  country_code: string;
  lat: number;
  lon: number;
  tz: string;
}

export interface PlaceSearchResponse {
  results: Place[];
  attribution: string;
}

export interface ChartRequest {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  time_confidence: TimeConfidence;
  time_window: { from: string; to: string } | null;
  place: { geonames_id: number; name: string; lat: number; lon: number; tz: string };
  house_system: HouseSystem;
  utc_offset_override: number | null;
}

export interface Body {
  id: BodyId;
  lon: number;
  lat: number;
  speed: number;
  sign: SignId;
  sign_deg: number;
  house: number | null;
  retrograde: boolean;
  on_cusp: boolean;
  uncertain: boolean;
}

export interface Angle { lon: number; sign: SignId; sign_deg: number; uncertain: boolean }
export interface House { house: number; cusp_lon: number; sign: SignId; uncertain: boolean }
export interface Aspect {
  a: BodyId; b: BodyId; type: AspectType; exact_angle: number;
  separation: number; orb: number; nearly_exact: boolean;
}
export interface Stellium { kind: "sign" | "house"; where: SignId | number; members: BodyId[] }
export interface Warning { code: string; message: string }

export interface Chart {
  meta: {
    engine: string; swisseph: string; tzdata: string; zodiac: "tropical";
    house_system_requested: HouseSystem; house_system_used: HouseSystem | null;
    node: "true"; calculated_at: string;
  };
  time: {
    local: string; utc: string; utc_offset_minutes: number;
    offset_source: "tzdata" | "user_override"; confidence: TimeConfidence;
    dst_ambiguity: { kind: "gap" | "overlap"; candidates_utc: string[] } | null;
    window?: { from: string; to: string };
  };
  bodies: Body[];
  angles: Record<AngleId, Angle> | null;
  houses: House[] | null;
  aspects: Aspect[];
  aspects_uncertain: { a: BodyId; b: BodyId; type: AspectType }[];
  stelliums: Stellium[];
  balance: Record<"fire" | "earth" | "air" | "water" | "cardinal" | "fixed" | "mutable", number> | null;
  warnings: Warning[];
}
