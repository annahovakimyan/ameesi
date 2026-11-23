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

type Forms = Partial<Record<"subject" | "in" | "retro", Record<Lang, string>>>;
const formsOf = (id: TermId): Forms | undefined => (terms[id] as { forms?: Forms }).forms;

/** "Sun in Leo" / "Արեգակը Առյուծում" / "Солнце во Льве"; also houses ("Sun in 9th house").
 *  Falls back to "Sun · Leo" where the glossary has no inflected forms. */
export function inTitle(subject: TermId, place: TermId, lang: Lang): string {
  const s = formsOf(subject)?.subject?.[lang];
  const p = formsOf(place)?.in?.[lang];
  return s && p ? `${s} ${p}` : `${term(subject, lang)} · ${term(place, lang)}`;
}

/** "Mars retrograde" / "Հրատը հետադարձ շարժման մեջ" / "Ретроградный Марс". */
export function retroTitle(body: TermId, lang: Lang): string {
  return formsOf(body)?.retro?.[lang] ?? `${term(body, lang)} · ${strings.retrograde[lang]}`;
}

export const houseId = (n: number) => `house.${n}` as TermId;
