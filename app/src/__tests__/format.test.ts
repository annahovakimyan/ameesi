import { bodyGlyph, formatDegrees, hhmm, isoDate, signGlyph } from "../format";

test.each([
  [22.21, "22°12′"], [0, "0°00′"], [29.999, "29°59′"], [13.5, "13°30′"], [5.0167, "5°01′"],
])("formatDegrees(%p) = %p", (deg, out) => {
  expect(formatDegrees(deg)).toBe(out);
});

test("glyphs carry the text-style selector", () => {
  expect(signGlyph("leo")).toBe("♌︎");
  expect(bodyGlyph("sun")).toBe("☉︎");
});

test("dates and times are wall-clock, zero-padded", () => {
  const d = new Date(1992, 7, 4, 9, 5);
  expect(isoDate(d)).toBe("1992-08-04");
  expect(hhmm(d)).toBe("09:05");
});
