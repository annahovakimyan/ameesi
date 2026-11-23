// Which interpretation entries explain a chart element (docs/content-spec.md, PRD section 9).
// Pure mapping from server data to entry ids; the app never calculates astrology.
import type { AngleId, AspectType, BodyId, Chart, SignId } from "../api/types";
import type { Selection } from "../selection";

export type EntryRef =
  | { id: string; kind: "sign"; body: BodyId; sign: SignId }
  | { id: string; kind: "house"; body: BodyId; house: number }
  | { id: string; kind: "retro"; body: BodyId }
  | { id: string; kind: "basic"; body?: BodyId; angle?: AngleId; aspect?: AspectType; house?: number }
  | { id: string; kind: "angle"; angle: "asc" | "mc"; sign: SignId }
  | { id: string; kind: "aspect"; a: BodyId; b: BodyId; type: AspectType }
  | { id: string; kind: "stellium"; where: SignId | number };

const PLANET_ORDER: BodyId[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const RETRO_ENTRIES = new Set<BodyId>(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);
const BASIC_ANGLE: Record<AngleId, string> = { asc: "ascendant", mc: "midheaven", dsc: "descendant", ic: "ic" };

export const nn = (n: number) => String(n).padStart(2, "0");

export function entriesFor(sel: Selection, chart: Chart): EntryRef[] {
  switch (sel.kind) {
    case "body": {
      // The South Node is explained by the North Node's entries, which cover the whole axis.
      const key = sel.id === "south_node" ? "north_node" : sel.id;
      const b = chart.bodies.find((x) => x.id === key)!;
      const out: EntryRef[] = [];
      if (key === "north_node" || key === "chiron") {
        const prefix = key === "north_node" ? "node" : "chiron";
        // Headings name the North Node: the entry describes the axis from its side.
        out.push({ id: `${prefix}.sign.${b.sign}`, kind: "sign", body: key, sign: b.sign });
        if (b.house) out.push({ id: `${prefix}.house.${nn(b.house)}`, kind: "house", body: key, house: b.house });
        return out;
      }
      out.push({ id: `sign.${key}.${b.sign}`, kind: "sign", body: key, sign: b.sign });
      if (b.house) out.push({ id: `house.${key}.${nn(b.house)}`, kind: "house", body: key, house: b.house });
      if (b.retrograde && RETRO_ENTRIES.has(key)) out.push({ id: `retro.${key}`, kind: "retro", body: key });
      out.push({ id: `basic.planet.${key}`, kind: "basic", body: key });
      return out;
    }
    case "angle": {
      if (!chart.angles) return [];
      // Descendant and IC are explained as the points opposite the Ascendant and MC.
      const base = sel.id === "asc" || sel.id === "dsc" ? "asc" : "mc";
      const sign = chart.angles[base].sign;
      return [
        { id: `angle.${base}.${sign}`, kind: "angle", angle: base, sign },
        { id: `basic.angle.${BASIC_ANGLE[sel.id]}`, kind: "basic", angle: sel.id },
      ];
    }
    case "aspect": {
      const [a, b] = [sel.a, sel.b].sort((x, y) => PLANET_ORDER.indexOf(x) - PLANET_ORDER.indexOf(y));
      return [
        { id: `aspect.${a}.${b}.${sel.type}`, kind: "aspect", a, b, type: sel.type },
        { id: `basic.aspect.${sel.type}`, kind: "basic", aspect: sel.type },
      ];
    }
    case "house":
      return [{ id: `basic.house.${nn(sel.n)}`, kind: "basic", house: sel.n }];
    case "stellium": {
      const w = sel.stellium.where;
      return [{ id: `stellium.${sel.stellium.kind}.${typeof w === "number" ? nn(w) : w}`, kind: "stellium", where: w }];
    }
  }
}
