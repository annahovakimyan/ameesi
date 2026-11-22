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
