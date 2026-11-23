import type { AngleId, AspectType, BodyId, Stellium } from "./api/types";

/** A chart element the user tapped. */
export type Selection =
  | { kind: "body"; id: BodyId }
  | { kind: "angle"; id: AngleId }
  | { kind: "aspect"; a: BodyId; b: BodyId; type: AspectType }
  | { kind: "house"; n: number }
  | { kind: "stellium"; stellium: Stellium };

export function sameSelection(x: Selection | null, y: Selection | null): boolean {
  return JSON.stringify(x) === JSON.stringify(y);
}
