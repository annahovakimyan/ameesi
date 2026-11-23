// Offline cache of approved entries, per docs/content-spec.md:
// download all approved entries for a language, keep them on the device, refresh at most daily.
import type { Lang } from "../api/types";
import type { Entry } from "./source";

export type RemoteEntries = (lang: Lang) => Promise<{ id: string; text: string; version: number }[]>;
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const REFRESH_MS = 24 * 60 * 60 * 1000;
const key = (lang: Lang) => `ameesi.entries.${lang}`;

interface Cached { syncedAt: number; rows: { id: string; text: string; version: number }[] }

export interface SyncResult {
  entries: Map<string, Entry>;
  source: "network" | "cache";
  error?: string;
}

function toMap(lang: Lang, rows: Cached["rows"]): Map<string, Entry> {
  return new Map(rows.map((r) => [r.id, { id: r.id, lang, text: r.text, version: r.version }]));
}

/** Returns the entries for a language, downloading them when the cache is missing or a day old.
 *  Each download replaces the whole language, so entries that lose approval disappear. */
export async function syncEntries(lang: Lang, opts: {
  remote: RemoteEntries; store: KeyValueStore; now?: number; force?: boolean;
}): Promise<SyncResult> {
  const now = opts.now ?? Date.now();
  let cached: Cached | null = null;
  try {
    const raw = await opts.store.getItem(key(lang));
    cached = raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    cached = null; // unreadable cache: treat as empty
  }
  if (cached && !opts.force && now - cached.syncedAt < REFRESH_MS) {
    return { entries: toMap(lang, cached.rows), source: "cache" };
  }
  try {
    const rows = await opts.remote(lang);
    await opts.store.setItem(key(lang), JSON.stringify({ syncedAt: now, rows } satisfies Cached));
    return { entries: toMap(lang, rows), source: "network" };
  } catch (e) {
    return { entries: toMap(lang, cached?.rows ?? []), source: "cache", error: e instanceof Error ? e.message : String(e) };
  }
}
