// Where profiles live: on this phone for now (AsyncStorage). Behind this interface so a
// cloud backup for signed-in accounts can be added later without touching the screens.
import type { KeyValueStore } from "../content/sync";
import type { Profile } from "./profiles";

const KEY = "ameesi.profiles.v1";

export interface ProfileStore {
  load(): Promise<Profile[]>;
  save(profiles: Profile[]): Promise<void>;
}

export function deviceProfileStore(kv: KeyValueStore): ProfileStore {
  return {
    async load() {
      try {
        const raw = await kv.getItem(KEY);
        return raw ? (JSON.parse(raw) as Profile[]) : [];
      } catch {
        return [];
      }
    },
    save: (profiles) => kv.setItem(KEY, JSON.stringify(profiles)),
  };
}
