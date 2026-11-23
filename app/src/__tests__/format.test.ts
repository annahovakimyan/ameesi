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

import { formatDate, formatDateTime, parseDisplayDate, parseDisplayTime } from "../format";

test("dates and times are shown as 14.08.1992 14:30", () => {
  expect(formatDate("1992-08-14")).toBe("14.08.1992");
  expect(formatDateTime("1992-08-14T14:30")).toBe("14.08.1992 14:30");
  expect(formatDateTime("1992-08-14T10:30Z")).toBe("14.08.1992 10:30");
});

test("typed dates and times (web preview) are parsed strictly", () => {
  expect(parseDisplayDate("14.08.1992")?.getDate()).toBe(14);
  expect(parseDisplayDate("1/2/2000")?.getMonth()).toBe(1);
  expect(parseDisplayDate("31.02.2000")).toBeNull();
  expect(parseDisplayDate("14.08.92")).toBeNull();
  expect(parseDisplayTime("14:30")?.getHours()).toBe(14);
  expect(parseDisplayTime("24:00")).toBeNull();
  expect(parseDisplayTime("9.05")?.getMinutes()).toBe(5);
});
