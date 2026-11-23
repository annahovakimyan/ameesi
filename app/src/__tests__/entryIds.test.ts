import type { Chart } from "../api/types";
import { entriesFor } from "../content/entryIds";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

const chart = exact as Chart;
const ids = (sel: Parameters<typeof entriesFor>[0], c: Chart = chart) => entriesFor(sel, c).map((e) => e.id);

test("a planet: in sign, in house, then the basics", () => {
  // Sun: Leo, 9th house
  expect(ids({ kind: "body", id: "sun" })).toEqual(["sign.sun.leo", "house.sun.09", "basic.planet.sun"]);
});

test("a retrograde planet adds its retrograde entry", () => {
  // Saturn is retrograde in Aquarius, 3rd house
  expect(ids({ kind: "body", id: "saturn" })).toEqual(
    ["sign.saturn.aquarius", "house.saturn.03", "retro.saturn", "basic.planet.saturn"]);
});

test("North and South Node share the nodal-axis entries, keyed on the North Node", () => {
  const north = ids({ kind: "body", id: "north_node" });
  expect(north).toEqual(["node.sign.sagittarius", "node.house.01"]);
  expect(ids({ kind: "body", id: "south_node" })).toEqual(north);
});

test("Chiron has sign and house entries", () => {
  expect(ids({ kind: "body", id: "chiron" })).toEqual(["chiron.sign.leo", "chiron.house.09"]);
});

test("unknown birth time: no house entries", () => {
  expect(ids({ kind: "body", id: "sun" }, unknown as Chart)).toEqual(["sign.sun.capricorn", "basic.planet.sun"]);
});

test("angles: Descendant and IC are explained through the Ascendant and MC entries", () => {
  expect(ids({ kind: "angle", id: "asc" })).toEqual(["angle.asc.scorpio", "basic.angle.ascendant"]);
  expect(ids({ kind: "angle", id: "dsc" })).toEqual(["angle.asc.scorpio", "basic.angle.descendant"]);
  expect(ids({ kind: "angle", id: "mc" })).toEqual(["angle.mc.virgo", "basic.angle.midheaven"]);
  expect(ids({ kind: "angle", id: "ic" })).toEqual(["angle.mc.virgo", "basic.angle.ic"]);
});

test("aspects use the fixed planet order, whatever order they arrive in", () => {
  expect(ids({ kind: "aspect", a: "saturn", b: "sun", type: "opposition" }))
    .toEqual(["aspect.sun.saturn.opposition", "basic.aspect.opposition"]);
});

test("houses and stelliums", () => {
  expect(ids({ kind: "house", n: 7 })).toEqual(["basic.house.07"]);
  expect(ids({ kind: "stellium", stellium: { kind: "sign", where: "leo", members: ["sun", "mercury", "chiron"] } }))
    .toEqual(["stellium.sign.leo"]);
  expect(ids({ kind: "stellium", stellium: { kind: "house", where: 9, members: ["sun", "venus", "chiron"] } }))
    .toEqual(["stellium.house.09"]);
});

test("every entry carries what it explains, for its heading", () => {
  const [sign, house] = entriesFor({ kind: "body", id: "sun" }, chart);
  expect(sign).toMatchObject({ id: "sign.sun.leo", kind: "sign", sign: "leo" });
  expect(house).toMatchObject({ id: "house.sun.09", kind: "house", house: 9 });
});

// The app and the content plan must agree: every id the app asks for exists in content/entry-ids.json.
import planIds from "../../../content/entry-ids.json";
import type { Selection } from "../selection";

test("every entry id the app can request is in the content plan", () => {
  const plan = new Set(planIds.ids);
  for (const c of [chart, unknown as Chart]) {
    const sels: Selection[] = [
      ...c.bodies.map((b) => ({ kind: "body", id: b.id }) as Selection),
      ...(["asc", "mc", "dsc", "ic"] as const).map((id) => ({ kind: "angle", id }) as Selection),
      ...c.aspects.map((a) => ({ kind: "aspect", a: a.a, b: a.b, type: a.type }) as Selection),
      ...Array.from({ length: 12 }, (_, i) => ({ kind: "house", n: i + 1 }) as Selection),
      ...c.stelliums.map((s) => ({ kind: "stellium", stellium: s }) as Selection),
    ];
    for (const sel of sels) {
      for (const e of entriesFor(sel, c)) expect([e.id, plan.has(e.id)]).toEqual([e.id, true]);
    }
  }
});
