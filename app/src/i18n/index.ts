import { terms, type TermId } from "../generated/glossary";
import type { Lang } from "../api/types";
import { strings, type StringId } from "./strings";

/** Astrology term from the glossary (content/glossary.json), in its short form for labels. */
export function term(id: TermId, lang: Lang): string {
  return terms[id].short[lang];
}

/** Full glossary term, including any gloss in brackets ("Ասցենդենտ (ծագող նշան)"). */
export function termFull(id: TermId, lang: Lang): string {
  return terms[id][lang];
}

/** Interface text (buttons, labels). Not interpretation texts: those come from Supabase. */
export function t(id: StringId, lang: Lang, vars: Record<string, string | number> = {}): string {
  return strings[id][lang].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** "1-ին տուն" / "1st house" / "1-й дом" for a house number from the server (1–12). */
export function houseTerm(n: number, lang: Lang): string {
  if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error(`bad house ${n}`);
  return terms[`house.${n}` as TermId].short[lang];
}
