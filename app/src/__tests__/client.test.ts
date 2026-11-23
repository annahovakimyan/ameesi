import { ApiError, API_URL, calculateChart, searchPlaces } from "../api/client";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

beforeEach(() => mockFetch.mockReset());

test("searchPlaces sends query and language", async () => {
  mockFetch.mockReturnValue(ok({ results: [], attribution: "x" }));
  await searchPlaces("Լենինական", "hy");
  expect(mockFetch.mock.calls[0][0]).toBe(`${API_URL}/places?q=${encodeURIComponent("Լենինական")}&lang=hy`);
});

test("calculateChart posts JSON", async () => {
  mockFetch.mockReturnValue(ok({ bodies: [] }));
  await calculateChart({ date: "1992-08-14" } as never);
  const [url, init] = mockFetch.mock.calls[0];
  expect(url).toBe(`${API_URL}/charts/calculate`);
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ date: "1992-08-14" });
});

test("server errors become ApiError with status", async () => {
  mockFetch.mockReturnValue(Promise.resolve({ ok: false, status: 422, json: () => Promise.resolve({ detail: "bad" }) }));
  await expect(searchPlaces("x", "en")).rejects.toMatchObject({ status: 422, message: "bad" });
});

test("network failure becomes ApiError status 0", async () => {
  mockFetch.mockReturnValue(Promise.reject(new TypeError("Network request failed")));
  const err = await searchPlaces("Gyumri", "en").catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(0);
});
