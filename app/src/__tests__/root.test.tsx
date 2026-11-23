import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Share } from "react-native";
import type { Chart, ChartRequest, Place } from "../api/types";
import { newProfile, type Profile } from "../profiles/profiles";
import type { ProfileStore } from "../profiles/store";
import { Root } from "../screens/Root";
import exact from "./fixtures/chart-exact.json";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const NOW = "2026-11-23T10:00:00Z";

const gyumri: Place = {
  geonames_id: 616635, name: "Gyumri", former_names_matched: [], region: "Shirak", country: "Armenia",
  country_code: "AM", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan",
};
const request: ChartRequest = {
  date: "1992-08-14", time: "14:30", time_confidence: "exact", time_window: null,
  place: { geonames_id: 616635, name: "Gyumri", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan" },
  house_system: "placidus", utc_offset_override: null,
};
const me = (chart = true) => newProfile({ kind: "self", name: "", request, place: gyumri, now: NOW,
  chart: chart ? (exact as Chart) : undefined });
const ani = () => newProfile({ kind: "other", name: "Ani", request: { ...request, date: "1995-03-01" }, place: gyumri,
  now: NOW, consent: { kind: "permission", confirmedAt: NOW }, chart: exact as Chart });

function memoryStore(initial: Profile[]): ProfileStore & { saved: Profile[] } {
  const s = { saved: initial, load: async () => s.saved, save: async (p: Profile[]) => { s.saved = p; } };
  return s;
}

async function start(profiles: Profile[], props: Partial<Parameters<typeof Root>[0]> = {}) {
  const store = memoryStore(profiles);
  await render(<Root lang="en" store={store} now={() => NOW} {...props} />);
  await act(async () => {});
  return store;
}

beforeEach(() => mockFetch.mockReset());

test("first launch asks for your own birth details, with the 18+ confirmation and no tabs", async () => {
  await start([]);
  expect(screen.getByText("Your birth details")).toBeTruthy();
  expect(screen.getByTestId("adult")).toBeTruthy();
  expect(screen.queryByTestId("tab-profiles")).toBeNull();
  expect(screen.queryByTestId("cancel")).toBeNull();
});

test("a saved profile opens on its chart, offline, titled “Me”", async () => {
  await start([me()]);
  expect(screen.getByTestId("chart-title")).toHaveTextContent("Me");
  expect(screen.getByTestId("chart-wheel")).toBeTruthy();
  expect(mockFetch).not.toHaveBeenCalled(); // saved chart, no network needed
});

test("Profiles tab lists profiles; opening one shows its chart", async () => {
  const friend = ani();
  await start([me(), friend]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  expect(screen.getByText("Me")).toBeTruthy();
  expect(screen.getByText("1995-03-01 · 14:30 · Gyumri")).toBeTruthy();
  await fireEvent.press(screen.getByTestId(`open-${friend.id}`));
  expect(screen.getByTestId("chart-title")).toHaveTextContent("Ani");
});

test("adding someone asks for a name and permission instead of the 18+ box; cancel returns", async () => {
  await start([me()]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  expect(screen.getByText(/with their permission/)).toBeTruthy();
  await fireEvent.press(screen.getByTestId("add-someone"));
  expect(screen.getByText("Their birth details")).toBeTruthy();
  expect(screen.getByTestId("name-input")).toBeTruthy();
  expect(screen.getByTestId("consent-guardian")).toBeTruthy();
  expect(screen.queryByTestId("adult")).toBeNull();
  expect(screen.getByTestId("submit")).toBeDisabled();
  expect(screen.getByText("Get their chart")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("cancel"));
  expect(screen.getByTestId("add-someone")).toBeTruthy();
});

test("the free plan stops at two profiles and says why", async () => {
  await start([me(), ani()]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  expect(screen.getByTestId("add-someone")).toBeDisabled();
  expect(screen.getByText(/free plan includes your chart and one more/)).toBeTruthy();
});

test("delete asks first, then removes the profile from storage", async () => {
  const friend = ani();
  const store = await start([me(), friend]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId(`delete-${friend.id}`));
  expect(screen.getByText(/Delete Ani\? Their birth details and chart are removed/)).toBeTruthy();
  expect(store.saved).toHaveLength(2);
  await fireEvent.press(screen.getByTestId(`confirm-delete-${friend.id}`));
  expect(store.saved.map((p) => p.name)).toEqual([""]);
  expect(screen.queryByText("Ani")).toBeNull();
});

test("deleting every profile returns to the first-launch form", async () => {
  const mine = me();
  await start([mine]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId(`delete-${mine.id}`));
  await fireEvent.press(screen.getByTestId(`confirm-delete-${mine.id}`));
  expect(screen.getByText("Your birth details")).toBeTruthy();
});

test("a profile without a saved chart is recalculated and the chart is saved", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(exact) });
  const store = await start([me(false)]);
  await waitFor(() => expect(screen.getByTestId("chart-wheel")).toBeTruthy());
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(request);
  expect(store.saved[0].chart).toBeDefined();
});

test("a failed calculation offers a retry", async () => {
  mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
  await start([me(false)]);
  await waitFor(() => expect(screen.getByTestId("retry")).toBeTruthy());
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(exact) });
  await fireEvent.press(screen.getByTestId("retry"));
  await waitFor(() => expect(screen.getByTestId("chart-wheel")).toBeTruthy());
});

test("edit opens the saved details and saves a recalculated chart", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(exact) });
  const mine = me();
  const store = await start([mine]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId(`edit-${mine.id}`));
  expect(screen.getByText("Edit birth details")).toBeTruthy();
  expect(screen.getByText("1992-08-14")).toBeTruthy(); // date field shows the saved date
  await fireEvent.press(screen.getByTestId("submit")); // "Save": already complete
  // FR-01: the resolved time zone and UTC are shown before saving
  await waitFor(() => expect(screen.getByText("Check the details")).toBeTruthy());
  expect(screen.getByTestId("review-local")).toHaveTextContent("1992-08-14 14:30");
  expect(screen.getByTestId("review-utc")).toHaveTextContent("1992-08-14 10:30 · UTC+04:00");
  expect(screen.getByText("Asia/Yerevan")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("looks-right"));
  await waitFor(() => expect(screen.getByTestId("chart-wheel")).toBeTruthy());
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(request);
  expect(store.saved).toHaveLength(1);
  expect(store.saved[0].id).toBe(mine.id);
});

test("export shares portable JSON", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  await start([me()]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId("export"));
  const json = JSON.parse(share.mock.calls[0][0].message!);
  expect(json.format).toBe("ameesi-profiles");
  expect(json.profiles[0].birth.date).toBe("1992-08-14");
});

test("“Change details” on the check step returns to the form", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(exact) });
  const mine = me();
  await start([mine]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId(`edit-${mine.id}`));
  await fireEvent.press(screen.getByTestId("submit"));
  await waitFor(() => expect(screen.getByTestId("change-details")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("change-details"));
  expect(screen.getByText("Edit birth details")).toBeTruthy();
});

test("switching to Whole Sign drops saved charts and recalculates with it (FR-04)", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(exact) });
  const store = await start([me()], { houseSystem: "whole_sign" });
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  expect(JSON.parse(mockFetch.mock.calls[0][1].body).house_system).toBe("whole_sign");
  await waitFor(() => expect(store.saved[0].chart).toBeDefined());
  expect(store.saved[0].request.house_system).toBe("whole_sign");
});

test("settings: language and house system call back; delete all asks first", async () => {
  const onLang = jest.fn(), onHouseSystem = jest.fn(), onDeleteAll = jest.fn();
  await start([me()], { onLang, onHouseSystem, onDeleteAll });
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId("settings-lang-ru"));
  expect(onLang).toHaveBeenCalledWith("ru");
  await fireEvent.press(screen.getByTestId("settings-houses-whole_sign"));
  expect(onHouseSystem).toHaveBeenCalledWith("whole_sign");
  expect(screen.getByTestId("versions")).toHaveTextContent(/App \d+\.\d+\.\d+ · ameesi-engine/);
  await fireEvent.press(screen.getByTestId("delete-all"));
  expect(onDeleteAll).not.toHaveBeenCalled();
  expect(screen.getByText(/This can't be undone/)).toBeTruthy();
  await fireEvent.press(screen.getByTestId("confirm-delete-all"));
  expect(onDeleteAll).toHaveBeenCalled();
});

test("About links to the source code (FR-17)", async () => {
  const { Linking } = jest.requireActual("react-native");
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  await start([me()]);
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId("source-code"));
  expect(open).toHaveBeenCalledWith("https://github.com/annahovakimyan/ameesi");
});

test("the tour shows on your own chart only, until done", async () => {
  const friend = ani();
  const onTourDone = jest.fn();
  await start([me(), friend], { tourDone: false, onTourDone });
  expect(screen.getByTestId("tour-card")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("tab-profiles"));
  await fireEvent.press(screen.getByTestId(`open-${friend.id}`));
  expect(screen.queryByTestId("tour-card")).toBeNull();
});

test("the add-someone prompt opens the form for someone else", async () => {
  await start([me()], { tourDone: true, addPromptDone: false });
  await fireEvent.press(screen.getByTestId("add-prompt-add"));
  expect(screen.getByText("Their birth details")).toBeTruthy();
});
