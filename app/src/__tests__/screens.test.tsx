import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { Chart } from "../api/types";
import { BirthInputScreen } from "../screens/BirthInputScreen";
import { ChartListScreen } from "../screens/ChartListScreen";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("BirthInputScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  test("submit stays disabled until the form is complete", async () => {
    await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
    expect(screen.getByTestId("submit")).toBeDisabled();
  });

  test("place search shows the current name and the former name that matched", async () => {
    mockFetch.mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ attribution: "GeoNames", results: [{
        geonames_id: 616635, name: "Գյումրի", region: "Շիրակ", country: "Հայաստան", country_code: "AM",
        former_names_matched: [{ name: "Leninakan", from: 1924, to: 1990 }], lat: 40.79, lon: 43.85, tz: "Asia/Yerevan",
      }] }),
    });
    await render(<BirthInputScreen lang="hy" onChart={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId("place-input"), "Leninakan");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(mockFetch.mock.calls[0][0]).toContain("q=Leninakan&lang=hy");
    expect(await screen.findByText("Գյումրի")).toBeTruthy();
    expect(screen.getByText(/նախկինում՝ Leninakan/)).toBeTruthy();
  });

  test("no search for a single letter", async () => {
    await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId("place-input"), "G");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("unknown time hides the time field and explains why", async () => {
    await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("confidence-unknown"));
    expect(screen.queryByTestId("time-field")).toBeNull();
    expect(screen.getByText(/houses and angles can't be calculated/)).toBeTruthy();
  });
});

describe("ChartListScreen", () => {
  test("shows bodies with glossary names, degrees and houses", async () => {
    await render(<ChartListScreen chart={exact as Chart} lang="hy" onBack={jest.fn()} />);
    expect(screen.getByText("Արեգակ")).toBeTruthy();
    expect(screen.getByText("Փայլածու")).toBeTruthy();
    expect(screen.getByText(/Առյուծ 21°52′ · 9-րդ տուն/)).toBeTruthy(); // Sun 21.88° Leo, 9th house
    expect(screen.getByText("Ասցենդենտ (ծագող նշան)")).toBeTruthy();
  });

  test("marks retrograde bodies", async () => {
    await render(<ChartListScreen chart={exact as Chart} lang="en" onBack={jest.fn()} />);
    expect(screen.getAllByText(/retrograde/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Placidus · tropical · tzdata/)).toBeTruthy();
  });

  test("unknown time: no angles or houses, Moon marked uncertain", async () => {
    await render(<ChartListScreen chart={unknown as Chart} lang="en" onBack={jest.fn()} />);
    expect(screen.queryByText("Angles")).toBeNull();
    expect(screen.queryByText(/house/)).toBeNull();
    // Only the Moon is uncertain: it moves from Scorpio into Sagittarius that day
    const flagged = screen.getAllByText(/uncertain/);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toHaveTextContent(/(Scorpio|Sagittarius) \d+°\d\d′ · uncertain/);
  });
});
