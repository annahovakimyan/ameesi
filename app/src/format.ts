// Display formatting only. All astrology comes from the server.
import type { SignId } from "./api/types";

/** 22.21 → "22°12′". Truncates like astro.com, so 29.999 shows 29°59′, never the next sign. */
export function formatDegrees(signDeg: number): string {
  const totalMinutes = Math.floor(signDeg * 60 + 1e-6);
  const deg = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

const TEXT = "︎"; // stops phones drawing glyphs as emoji (design system rule)
const SIGN_GLYPHS: Record<SignId, string> = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍",
  libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};
const BODY_GLYPHS: Record<string, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀", mars: "♂", jupiter: "♃", saturn: "♄",
  uranus: "♅", neptune: "♆", pluto: "♇", north_node: "☊", south_node: "☋", chiron: "⚷",
};

export const signGlyph = (s: SignId) => SIGN_GLYPHS[s] + TEXT;
export const bodyGlyph = (b: string) => BODY_GLYPHS[b] + TEXT;

/** Date → "YYYY-MM-DD" and "HH:MM" in local wall-clock terms (no time zone conversion). */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** "1992-08-14" → "14.08.1992" (the usual format in Armenia and Russia). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/** "1992-08-14T14:30" or "1992-08-14T10:30Z" → "14.08.1992 14:30". */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${iso.slice(11, 16)}`;
}

/** A Date shown in a date field: "14.08.1992". */
export const displayDate = (d: Date) => formatDate(isoDate(d));

/** Parse "14.08.1992" (also "14/08/1992", "14-08-1992") into a local Date, or null. */
export function parseDisplayDate(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

/** Parse "14:30" into a Date on 1 January 2000 (only the time is used), or null. */
export function parseDisplayTime(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return new Date(2000, 0, 1, Number(m[1]), Number(m[2]));
}
