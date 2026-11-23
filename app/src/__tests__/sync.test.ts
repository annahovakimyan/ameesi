import { syncEntries, type KeyValueStore, type RemoteEntries } from "../content/sync";

// Fake texts only: real interpretation texts never appear in this repository.
const rows = (n: number, version = 1) =>
  Array.from({ length: n }, (_, i) => ({ id: `test.entry.${i}`, text: `Test text ${i}`, version }));

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
  };
}

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-11-23T10:00:00Z");

test("first launch downloads the language and caches it", async () => {
  const store = memoryStore();
  const remote: RemoteEntries = jest.fn(async () => rows(3));
  const r = await syncEntries("hy", { remote, store, now: T0 });
  expect(remote).toHaveBeenCalledWith("hy");
  expect(r.entries.size).toBe(3);
  expect(r.entries.get("test.entry.1")).toMatchObject({ text: "Test text 1", lang: "hy" });
  expect(r.source).toBe("network");
  expect(store.data.has("ameesi.entries.hy")).toBe(true);
});

test("within a day, the cache is used without a download", async () => {
  const store = memoryStore();
  await syncEntries("hy", { remote: async () => rows(3), store, now: T0 });
  const remote = jest.fn(async () => rows(5));
  const r = await syncEntries("hy", { remote, store, now: T0 + DAY - 1 });
  expect(remote).not.toHaveBeenCalled();
  expect(r.entries.size).toBe(3);
  expect(r.source).toBe("cache");
});

test("after a day, it downloads again and replaces the cache (unapproved entries disappear)", async () => {
  const store = memoryStore();
  await syncEntries("hy", { remote: async () => rows(3), store, now: T0 });
  const r = await syncEntries("hy", { remote: async () => rows(2, 2), store, now: T0 + DAY + 1 });
  expect(r.entries.size).toBe(2);
  expect(r.entries.has("test.entry.2")).toBe(false);
  expect(r.entries.get("test.entry.0")?.version).toBe(2);
});

test("each language has its own cache; switching downloads the new one", async () => {
  const store = memoryStore();
  await syncEntries("hy", { remote: async () => rows(3), store, now: T0 });
  const remote = jest.fn(async () => rows(1));
  const r = await syncEntries("ru", { remote, store, now: T0 + 1000 });
  expect(remote).toHaveBeenCalledWith("ru");
  expect(r.entries.size).toBe(1);
});

test("offline: a failed download keeps the cached entries", async () => {
  const store = memoryStore();
  await syncEntries("hy", { remote: async () => rows(3), store, now: T0 });
  const r = await syncEntries("hy", {
    remote: async () => { throw new Error("network"); }, store, now: T0 + 2 * DAY });
  expect(r.entries.size).toBe(3);
  expect(r.source).toBe("cache");
  expect(r.error).toBe("network");
});

test("offline on first launch: empty, with the error", async () => {
  const r = await syncEntries("hy", {
    remote: async () => { throw new Error("network"); }, store: memoryStore(), now: T0 });
  expect(r.entries.size).toBe(0);
  expect(r.error).toBe("network");
});

test("force refreshes even within a day", async () => {
  const store = memoryStore();
  await syncEntries("en", { remote: async () => rows(3), store, now: T0 });
  const remote = jest.fn(async () => rows(4));
  const r = await syncEntries("en", { remote, store, now: T0 + 1000, force: true });
  expect(remote).toHaveBeenCalled();
  expect(r.entries.size).toBe(4);
});
