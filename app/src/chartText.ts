// Shared wording for chart elements (list rows, wheel labels, selection card).
import type { Body, Lang, SignId } from "./api/types";
import { formatDegrees, signGlyph } from "./format";
import { houseTerm, t, term } from "./i18n";

export function placement(sign: SignId, signDeg: number, house: number | null, lang: Lang, glyph = true): string {
  const s = `${glyph ? `${signGlyph(sign)} ` : ""}${term(`sign.${sign}`, lang)} ${formatDegrees(signDeg)}`;
  return house ? `${s} · ${houseTerm(house, lang)}` : s;
}

export function bodyFlags(b: Body, lang: Lang): string[] {
  return [...(b.retrograde ? [t("retrograde", lang)] : []), ...(b.uncertain ? [t("uncertain", lang)] : [])];
}

/** Screen-reader label: "Sun, Leo 21°52′ · 9th house · retrograde". */
export function bodyLabel(b: Body, lang: Lang): string {
  return [`${term(`body.${b.id}`, lang)}, ${placement(b.sign, b.sign_deg, b.house, lang, false)}`, ...bodyFlags(b, lang)]
    .join(" · ");
}
