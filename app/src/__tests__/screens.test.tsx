import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { Chart } from "../api/types";
import { BirthInputScreen } from "../screens/BirthInputScreen";
import { nearestGlyph } from "../components/ChartWheel";
import { ChartScreen } from "../screens/ChartScreen";
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

async function renderList(chart: unknown, lang: "hy" | "en" | "ru") {
  await render(<ChartScreen chart={chart as Chart} lang={lang} onBack={jest.fn()} />);
  await fireEvent.press(screen.getByTestId("view-list"));
}

describe("ChartScreen list view", () => {
  test("shows bodies with glossary names, degrees and houses", async () => {
    await renderList(exact, "hy");
    expect(screen.getByText("Արեգակ")).toBeTruthy();
    expect(screen.getByText("Փայլածու")).toBeTruthy();
    expect(screen.getByText(/Առյուծ 21°52′ · 9-րդ տուն/)).toBeTruthy(); // Sun 21.88° Leo, 9th house
    expect(screen.getByText("Ասցենդենտ")).toBeTruthy(); // short form, no gloss
  });

  test("marks retrograde bodies", async () => {
    await renderList(exact, "en");
    expect(screen.getAllByText(/retrograde/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Placidus · tropical · tzdata/)).toBeTruthy();
  });

  test("unknown time: no angles or houses, Moon marked uncertain", async () => {
    await renderList(unknown, "en");
    expect(screen.queryByText("Angles")).toBeNull();
    expect(screen.queryByText(/house/)).toBeNull();
    // Only the Moon is uncertain: it moves from Scorpio into Sagittarius that day
    const flagged = screen.getAllByText(/uncertain/);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toHaveTextContent(/(Scorpio|Sagittarius) \d+°\d\d′ · uncertain/);
  });
});

test("nearestGlyph ignores taps far from every glyph", () => {
  const glyphs = [{ b: { id: "sun" as const }, x: 100, y: 100 }, { b: { id: "moon" as const }, x: 115, y: 100 }];
  expect(nearestGlyph(glyphs, 104, 100)).toBe("sun");
  expect(nearestGlyph(glyphs, 112, 101)).toBe("moon");
  expect(nearestGlyph(glyphs, 200, 200)).toBeNull();
});

describe("ChartScreen wheel view", () => {
  test("shows the wheel by default with a labelled button for every body", async () => {
    await render(<ChartScreen chart={exact as Chart} lang="en" onBack={jest.fn()} />);
    expect(screen.getByTestId("chart-wheel")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|North Node|South Node|Chiron), / }))
      .toHaveLength(13);
    expect(screen.getByLabelText(/^Sun, Leo 21°52′ · 9th house$/)).toBeTruthy();
    expect(screen.getByText("Tap a planet to see its details")).toBeTruthy();
  });

  test("draws aspect lines per the design system: tense dashed, harmonious solid, conjunctions none", async () => {
    await render(<ChartScreen chart={exact as Chart} lang="en" onBack={jest.fn()} />);
    for (const a of (exact as Chart).aspects) {
      const line = screen.queryByTestId(`aspect-${a.a}-${a.b}`);
      if (a.type === "conjunction") expect(line).toBeNull();
      else if (a.type === "square" || a.type === "opposition") expect(line?.props.strokeDasharray).toBeTruthy();
      else expect(line?.props.strokeDasharray).toBeFalsy();
    }
    expect((exact as Chart).aspects.some((a) => a.type === "square" || a.type === "opposition")).toBe(true);
  });

  test("activating a planet (screen reader) opens its explanation", async () => {
    await render(<ChartScreen chart={exact as Chart} lang="en" onBack={jest.fn()} />);
    await fireEvent(screen.getByTestId("wheel-sun"), "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    expect(screen.getByTestId("explanation-sheet")).toBeTruthy();
    expect(screen.getByTestId("wheel-sun")).toBeSelected();
    expect(screen.getByTestId("selected-ring")).toBeTruthy();
  });

  test("a tap selects the nearest glyph, even when targets would overlap", async () => {
    await render(<ChartScreen chart={exact as Chart} lang="en" onBack={jest.fn()} />);
    const sun = StyleSheet.flatten(screen.getByTestId("wheel-sun").props.style);
    const chiron = StyleSheet.flatten(screen.getByTestId("wheel-chiron").props.style);
    // Sun and Chiron are close: their 48 px squares overlap
    expect(Math.hypot(sun.left - chiron.left, sun.top - chiron.top)).toBeLessThan(48);
    const centre = (st: { left: number; top: number }) => ({ locationX: st.left + 24, locationY: st.top + 24 });
    await fireEvent.press(screen.getByTestId("wheel-touch"), { nativeEvent: centre(sun) });
    expect(screen.getByTestId("wheel-sun")).toBeSelected();
    await fireEvent.press(screen.getByTestId("sheet-close"));
    await fireEvent.press(screen.getByTestId("wheel-touch"), { nativeEvent: centre(chiron) });
    expect(screen.getByTestId("wheel-chiron")).toBeSelected();
    expect(screen.getByTestId("wheel-sun")).not.toBeSelected();
  });

  test("unknown time: no houses in the labels, Armenian names on the buttons", async () => {
    await render(<ChartScreen chart={unknown as Chart} lang="hy" onBack={jest.fn()} />);
    expect(screen.getByLabelText(/^Արեգակ, Այծեղջյուր/)).toBeTruthy();
    expect(screen.queryByLabelText(/\d+-(ին|րդ) տուն/)).toBeNull(); // not /տուն/: Նեպտուն contains it
    expect(screen.getByText("Առանց ժամի տները և անկյունները չեն հաշվարկվում։")).toBeTruthy();
    expect(screen.getByText(/^տրոպիկական · tzdata/)).toBeTruthy();
  });
});
