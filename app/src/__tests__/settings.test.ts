import { defaultSettings, deviceSettingsStore, SETTINGS_KEY } from "../settings";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: async (k: string) => data.get(k) ?? null, setItem: async (k: string, v: string) => void data.set(k, v),
    removeItem: async (k: string) => void data.delete(k), getAllKeys: async () => [...data.keys()],
    multiRemove: async (ks: readonly string[]) => ks.forEach((k) => data.delete(k)) };
}

test("defaults: Armenian, Placidus, not onboarded", async () => {
  expect(defaultSettings).toEqual({ lang: "hy", houseSystem: "placidus", onboarded: false });
  expect(await deviceSettingsStore(memory()).load()).toEqual(defaultSettings);
});

test("saves and loads", async () => {
  const kv = memory();
  const store = deviceSettingsStore(kv);
  await store.save({ lang: "ru", houseSystem: "whole_sign", onboarded: true });
  expect(await store.load()).toEqual({ lang: "ru", houseSystem: "whole_sign", onboarded: true });
});

test("unknown or broken values fall back to the defaults", async () => {
  const kv = memory({ [SETTINGS_KEY]: JSON.stringify({ lang: "fr", houseSystem: "koch", onboarded: true }) });
  expect(await deviceSettingsStore(kv).load()).toEqual({ ...defaultSettings, onboarded: true });
  expect(await deviceSettingsStore(memory({ [SETTINGS_KEY]: "{not json" })).load()).toEqual(defaultSettings);
});

test("delete all removes every Ameesi key and nothing else", async () => {
  const kv = memory({ "ameesi.profiles.v1": "[]", "ameesi.entries.hy": "{}", [SETTINGS_KEY]: "{}", "other.app": "x" });
  await deviceSettingsStore(kv).deleteAll();
  expect([...kv.data.keys()]).toEqual(["other.app"]);
});
