// Where explanation texts come from. Placeholder for now; Supabase (docs/content-spec.md) later.
// Interpretation texts never live in this repository: placeholders only.
import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "../api/types";
import { t } from "../i18n";

export interface Entry {
  id: string;
  lang: Lang;
  text: string;
  version: number;
}

/** Approved entries, already cached on the device. Returns null when there is no approved entry
 *  in that language: the PRD (FR-06) shows only entries approved in the user's language. */
export interface ContentSource {
  get(id: string, lang: Lang): Entry | null;
  isPlaceholder: boolean;
}

export function placeholderSource(missing: Set<string> = new Set()): ContentSource {
  return {
    isPlaceholder: true,
    get(id, lang) {
      if (missing.has(id)) return null;
      return { id, lang, version: 0, text: t("placeholderText", lang) };
    },
  };
}

const ContentContext = createContext<ContentSource>(placeholderSource());

export function ContentProvider({ source, children }: { source: ContentSource; children: ReactNode }) {
  return <ContentContext.Provider value={source}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
