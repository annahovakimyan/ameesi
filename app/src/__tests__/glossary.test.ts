import { terms } from "../generated/glossary";
import { houseTerm, t, term, termFull } from "../i18n";
import { strings } from "../i18n/strings";

const BODIES = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
  "north_node", "south_node", "chiron"];
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius",
  "capricorn", "aquarius", "pisces"];
const ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"];

test("every id the server sends has a term in all three languages", () => {
  const ids = [...BODIES.map((b) => `body.${b}`), ...SIGNS.map((s) => `sign.${s}`),
    ...ASPECTS.map((a) => `aspect.${a}`), ...["asc", "mc", "dsc", "ic"].map((a) => `angle.${a}`),
    ...Array.from({ length: 12 }, (_, i) => `house.${i + 1}`),
    ...["fire", "earth", "air", "water"].map((e) => `element.${e}`),
    ...["cardinal", "fixed", "mutable"].map((m) => `modality.${m}`)];
  for (const id of ids) {
    const entry = (terms as Record<string, { hy: string; en: string; ru: string }>)[id];
    expect(entry).toBeDefined();
    expect(entry.hy && entry.en && entry.ru).toBeTruthy();
  }
});

test("Armenian uses the traditional planet names", () => {
  expect(["mercury", "venus", "mars", "jupiter", "saturn"].map((p) => term(`body.${p}` as "body.sun", "hy")))
    .toEqual(["Փայլածու", "Արուսյակ", "Հրատ", "Լուսնթագ", "Երևակ"]);
});

test("house terms", () => {
  expect(houseTerm(1, "hy")).toBe("1-ին տուն");
  expect(houseTerm(12, "en")).toBe("12th house");
  expect(() => houseTerm(13, "en")).toThrow();
});

test("interface strings exist in all languages and fill variables", () => {
  for (const [id, s] of Object.entries(strings)) {
    expect([id, !!(s.hy && s.en && s.ru)]).toEqual([id, true]);
  }
  expect(t("formerly", "en", { name: "Leninakan" })).toBe("formerly Leninakan");
});

test("labels use the short form; the full form keeps the gloss", () => {
  expect(term("angle.asc", "hy")).toBe("Ասցենդենտ");
  expect(termFull("angle.asc", "hy")).toBe("Ասցենդենտ (ծագող նշան)");
  expect(term("aspect.square", "hy")).toBe("Քառակուսի");
  expect(term("angle.ic", "en")).toBe("IC");
  expect(term("angle.ic", "ru")).toBe("Основание неба"); // no short form given: falls back to full
  for (const entry of Object.values(terms)) {
    for (const lang of ["hy", "en", "ru"] as const) expect(entry.short[lang]).not.toMatch(/[()]/);
  }
});
