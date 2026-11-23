// Offline test places for development without a calculation server (Gyumri and Yerevan only).
// Same ids, coordinates and time zone as the server's GeoNames data.
import type { Lang, Place } from "../api/types";

const PLACES: { place: Omit<Place, "name" | "region" | "country">; names: Record<Lang, string>;
  region: Record<Lang, string>; former?: { name: string; from: number; to: number }[] }[] = [
  {
    place: { geonames_id: 616635, former_names_matched: [], country_code: "AM", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan" },
    names: { hy: "Գյումրի", en: "Gyumri", ru: "Гюмри" }, region: { hy: "Շիրակ", en: "Shirak", ru: "Ширакская область" },
    former: [{ name: "Leninakan", from: 1924, to: 1990 }, { name: "Ленинакан", from: 1924, to: 1990 },
      { name: "Լենինական", from: 1924, to: 1990 }],
  },
  {
    place: { geonames_id: 616052, former_names_matched: [], country_code: "AM", lat: 40.1811, lon: 44.5136, tz: "Asia/Yerevan" },
    names: { hy: "Երևան", en: "Yerevan", ru: "Ереван" }, region: { hy: "Երևան", en: "Yerevan", ru: "Ереван" },
  },
];
const COUNTRY: Record<Lang, string> = { hy: "Հայաստան", en: "Armenia", ru: "Армения" };

const norm = (s: string) => s.trim().toLowerCase().replace(/և/g, "եւ").replace(/ё/g, "е");

/** Test places matching the query, in the requested language. */
export function offlinePlaces(query: string, lang: Lang): Place[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return PLACES.flatMap((p) => {
    const current = Object.values(p.names).some((n) => norm(n).startsWith(q));
    const former = (p.former ?? []).filter((f) => norm(f.name).startsWith(q));
    if (!current && former.length === 0) return [];
    return [{ ...p.place, name: p.names[lang], region: p.region[lang], country: COUNTRY[lang],
      former_names_matched: current ? [] : former.slice(0, 1) }];
  });
}
