import type { Chart, ChartRequest, Lang, Place, PlaceSearchResponse } from "./types";

// The live calculation server by default. For a local server set EXPO_PUBLIC_API_URL in app/.env
// (the Android emulator reaches your computer at http://10.0.2.2:8000).
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://ameesi.onrender.com";

/** Development aid: the address and error of the last failed connection (no query string, so no birth data). */
export let lastNetworkError: string | null = null;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e; // cancelled on purpose, not a network failure
    lastNetworkError = `${API_URL}${path.split("?")[0]} · ${e instanceof Error ? e.message : String(e)}`;
    throw new ApiError(0, "network");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail ?? res.status));
  }
  return (await res.json()) as T;
}

export function searchPlaces(q: string, lang: Lang, signal?: AbortSignal): Promise<PlaceSearchResponse> {
  const params = new URLSearchParams({ q, lang });
  return request(`/places?${params}`, { signal });
}

export function calculateChart(body: ChartRequest): Promise<Chart> {
  return request("/charts/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** One place in a language (for showing saved profiles in the current language). */
export function getPlace(geonamesId: number, lang: Lang): Promise<Place> {
  return request(`/places/${geonamesId}?lang=${lang}`);
}

/** True when the calculation server answers its health check. */
export async function serverReachable(): Promise<boolean> {
  try {
    await request("/health");
    return true;
  } catch {
    return false;
  }
}
