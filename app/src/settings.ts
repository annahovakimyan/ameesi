// App settings on the device: language, house system, and whether onboarding is done.
import type { HouseSystem, Lang } from "./api/types";

export interface Settings {
  lang: Lang;
  houseSystem: HouseSystem;
  onboarded: boolean;
  tourDone: boolean; // the "Start here" tour (Sun, Moon, Ascendant) was finished or skipped
  addPromptDone: boolean; // the prompt to add someone after the tour was answered (FR-11)
}

export const defaultSettings: Settings = {
  lang: "hy", houseSystem: "placidus", onboarded: false, tourDone: false, addPromptDone: false,
};
export const SETTINGS_KEY = "ameesi.settings.v1";
const PREFIX = "ameesi.";

interface KV {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
}

export function deviceSettingsStore(kv: KV) {
  return {
    async load(): Promise<Settings> {
      try {
        const raw = JSON.parse((await kv.getItem(SETTINGS_KEY)) ?? "{}");
        return {
          lang: ["hy", "en", "ru"].includes(raw.lang) ? raw.lang : defaultSettings.lang,
          houseSystem: ["placidus", "whole_sign"].includes(raw.houseSystem) ? raw.houseSystem : defaultSettings.houseSystem,
          onboarded: raw.onboarded === true,
          tourDone: raw.tourDone === true,
          addPromptDone: raw.addPromptDone === true,
        };
      } catch {
        return defaultSettings;
      }
    },
    save: (s: Settings) => kv.setItem(SETTINGS_KEY, JSON.stringify(s)),
    /** "Delete all my data": profiles, cached content and settings. */
    async deleteAll() {
      const keys = (await kv.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      await kv.multiRemove(keys);
    },
  };
}

export type SettingsStore = ReturnType<typeof deviceSettingsStore>;
