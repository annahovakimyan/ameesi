// Supabase client. URL and publishable key come from app/.env (git-ignored; see .env.example).
// Both are public by design; the secret key never goes in the app or the repository.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Lang } from "./api/types";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase = url && key
  ? createClient(url, key, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

const PAGE = 1000; // Supabase returns at most 1,000 rows per request

/** Approved entries for a language. Row-level security returns approved rows only. */
export async function fetchApprovedEntries(lang: Lang) {
  if (!supabase) throw new Error("Supabase is not configured");
  const rows: { id: string; text: string; version: number }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("entries").select("id,text,version")
      .eq("lang", lang).order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}
