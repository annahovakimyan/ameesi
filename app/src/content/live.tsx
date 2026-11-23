// Content for the running app: approved entries from Supabase, cached on the device,
// or placeholders when Supabase isn't configured (or EXPO_PUBLIC_CONTENT_SOURCE=placeholder).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "../api/types";
import { fetchApprovedEntries, supabase } from "../supabase";
import { ContentProvider, placeholderSource, type ContentSource, type Entry } from "./source";
import { syncEntries } from "./sync";

const usePlaceholders = !supabase || process.env.EXPO_PUBLIC_CONTENT_SOURCE === "placeholder";

export function LiveContentProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());

  useEffect(() => {
    if (usePlaceholders) return;
    let current = true;
    syncEntries(lang, { remote: fetchApprovedEntries, store: AsyncStorage }).then((r) => {
      if (current) setEntries(r.entries);
    });
    return () => {
      current = false;
    };
  }, [lang]);

  const source = useMemo<ContentSource>(() => usePlaceholders ? placeholderSource() : {
    isPlaceholder: false,
    get: (id, l) => {
      const e = entries.get(id);
      return e && e.lang === l ? e : null; // only entries approved in the user's language (PRD FR-06)
    },
  }, [entries]);

  return <ContentProvider source={source}>{children}</ContentProvider>;
}
