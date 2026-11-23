import type { Chart, ChartRequest, Place } from "../api/types";
import {
  canAdd, exportJson, FREE_PROFILES, newProfile, removeProfile, upsertProfile, type Profile,
} from "../profiles/profiles";
import exact from "./fixtures/chart-exact.json";

const gyumri: Place = {
  geonames_id: 616635, name: "Gyumri", former_names_matched: [], region: "Shirak", country: "Armenia",
  country_code: "AM", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan",
};
const request = (date = "1992-08-14"): ChartRequest => ({
  date, time: "14:30", time_confidence: "exact", time_window: null,
  place: { geonames_id: 616635, name: "Gyumri", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan" },
  house_system: "placidus", utc_offset_override: null,
});
const NOW = "2026-11-23T10:00:00Z";
const me = newProfile({ kind: "self", name: "", request: request(), place: gyumri, chart: exact as Chart, now: NOW });

test("the free plan is your own chart plus one more (PRD)", () => {
  expect(FREE_PROFILES).toBe(2);
  expect(canAdd([], "self")).toEqual({ ok: true });
  expect(canAdd([me], "self")).toEqual({ ok: false, reason: "self_exists" });
  expect(canAdd([me], "other")).toEqual({ ok: true });
  const friend = newProfile({ kind: "other", name: "Ani", request: request(), place: gyumri, now: NOW,
    consent: { kind: "permission", confirmedAt: NOW } });
  expect(canAdd([me, friend], "other")).toEqual({ ok: false, reason: "limit" });
});

test("someone else's profile needs a consent confirmation", () => {
  expect(() => newProfile({ kind: "other", name: "Ani", request: request(), place: gyumri, now: NOW }))
    .toThrow(/consent/);
  const child = newProfile({ kind: "other", name: "Aram", request: request(), place: gyumri, now: NOW,
    consent: { kind: "guardian", confirmedAt: NOW } });
  expect(child.consent?.kind).toBe("guardian");
});

test("someone else's profile needs a name", () => {
  expect(() => newProfile({ kind: "other", name: "  ", request: request(), place: gyumri, now: NOW,
    consent: { kind: "permission", confirmedAt: NOW } })).toThrow(/name/);
});

test("editing birth details drops the saved chart; renaming keeps it (FR-09)", () => {
  const renamed = upsertProfile([me], { ...me, name: "Anna" }, "2026-11-24T00:00:00Z");
  expect(renamed[0].chart).toBeDefined();
  expect(renamed[0].updatedAt).toBe("2026-11-24T00:00:00Z");
  const moved = upsertProfile([me], { ...me, request: request("1992-08-15") }, "2026-11-24T00:00:00Z");
  expect(moved[0].chart).toBeUndefined();
});

test("a new chart can be saved with new birth details", () => {
  const updated = upsertProfile([me], { ...me, request: request("1992-08-15"), chart: exact as Chart }, NOW, true);
  expect(updated[0].chart).toBeDefined();
});

test("delete removes only that profile", () => {
  const friend = newProfile({ kind: "other", name: "Ani", request: request(), place: gyumri, now: NOW,
    consent: { kind: "permission", confirmedAt: NOW } });
  expect(removeProfile([me, friend], friend.id)).toEqual([me]);
});

test("export is portable JSON with birth details, consent and charts", () => {
  const data = JSON.parse(exportJson([me], "2026-11-23T12:00:00Z"));
  expect(data).toMatchObject({ format: "ameesi-profiles", version: 1, exported_at: "2026-11-23T12:00:00Z" });
  expect(data.profiles[0]).toMatchObject({ kind: "self", birth: { date: "1992-08-14", time: "14:30" },
    place: { name: "Gyumri", country: "Armenia" } });
  expect(data.profiles[0].chart.meta.engine).toMatch(/ameesi-engine/);
});

test("ids are unique", () => {
  const ids = new Set(Array.from({ length: 50 }, () => newProfile({ kind: "self", name: "", request: request(),
    place: gyumri, now: NOW }).id));
  expect(ids.size).toBe(50);
});
