import type { Chart, ChartRequest, Lang, PlaceSearchResponse } from "./types";

// Android emulator reaches the host machine's localhost at 10.0.2.2.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
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
