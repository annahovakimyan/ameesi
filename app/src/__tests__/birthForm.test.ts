import type { Place } from "../api/types";
import { buildRequest, emptyForm, formFromProfile, isComplete, offsetFor, type BirthForm } from "../birthForm";
import { newProfile } from "../profiles/profiles";

const gyumri: Place = {
  geonames_id: 616635, name: "Gyumri", former_names_matched: [], region: "Shirak", country: "Armenia",
  country_code: "AM", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan",
};
const at = (h: number, m = 0) => new Date(2000, 0, 1, h, m);
const base: BirthForm = { ...emptyForm, date: new Date(1992, 7, 14), place: gyumri, adult: true, time: at(14, 30) };

test("exact time needs date, time, place and 18+", () => {
  expect(isComplete(base)).toBe(true);
  expect(isComplete({ ...base, adult: false })).toBe(false);
  expect(isComplete({ ...base, time: null })).toBe(false);
  expect(isComplete({ ...base, place: null })).toBe(false);
});

test("approximate needs a window that ends after it starts", () => {
  const f = { ...base, confidence: "approximate" as const, windowFrom: at(13), windowTo: at(15) };
  expect(isComplete(f)).toBe(true);
  expect(isComplete({ ...f, windowTo: at(12) })).toBe(false);
  expect(buildRequest(f).time_window).toEqual({ from: "13:00", to: "15:00" });
  expect(buildRequest(f).time).toBeNull();
});

test("unknown time needs no time", () => {
  const f = { ...base, confidence: "unknown" as const, time: null };
  expect(isComplete(f)).toBe(true);
  expect(buildRequest(f)).toMatchObject({ time: null, time_window: null, time_confidence: "unknown" });
});

test("request shape matches the server", () => {
  expect(buildRequest(base, 240)).toEqual({
    date: "1992-08-14", time: "14:30", time_confidence: "exact", time_window: null,
    place: { geonames_id: 616635, name: "Gyumri", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan" },
    house_system: "placidus", utc_offset_override: 240,
  });
});

test("offsetFor turns a chosen UTC moment into minutes east of UTC", () => {
  expect(offsetFor("2021-03-14T02:30", "2021-03-14T07:30Z")).toBe(-300);
  expect(offsetFor("2021-03-14T02:30", "2021-03-14T06:30Z")).toBe(-240);
  expect(offsetFor("1992-08-14T14:30", "1992-08-14T10:30Z")).toBe(240);
});

test("someone else's details need a name and a consent choice instead of the 18+ box", () => {
  const other = { ...base, adult: false };
  expect(isComplete(other, "other")).toBe(false);
  expect(isComplete({ ...other, name: "Ani" }, "other")).toBe(false);
  expect(isComplete({ ...other, name: "Ani", consent: "permission" }, "other")).toBe(true);
  expect(isComplete({ ...other, name: "  ", consent: "guardian" }, "other")).toBe(false);
});

test("editing a profile rebuilds the same request", () => {
  const f = { ...base, confidence: "approximate" as const, time: null, windowFrom: at(13), windowTo: at(15, 30) };
  const req = buildRequest(f);
  const p = newProfile({ kind: "self", name: "", request: req, place: gyumri, now: "2026-11-23T00:00:00Z" });
  expect(buildRequest(formFromProfile(p))).toEqual(req);
});
