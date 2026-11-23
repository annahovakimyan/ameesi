import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { Chart, Place } from "../api/types";
import { ChartScreen } from "../screens/ChartScreen";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

const gyumri: Place = {
  geonames_id: 616635, name: "Gyumri", former_names_matched: [], region: "Shirak", country: "Armenia",
  country_code: "AM", lat: 40.7942, lon: 43.8453, tz: "Asia/Yerevan",
};

test("exact time: no banner", async () => {
  await render(<ChartScreen chart={exact as Chart} lang="en" />);
  expect(screen.queryByTestId("time-banner")).toBeNull();
});

test("approximate time: banner explains the uncertain marks and offers to refine", async () => {
  const onEdit = jest.fn();
  const approx = { ...(exact as Chart), time: { ...(exact as Chart).time, confidence: "approximate" as const } };
  await render(<ChartScreen chart={approx} lang="en" onEditDetails={onEdit} />);
  expect(screen.getByTestId("time-banner")).toHaveTextContent(/marked “uncertain” may change/);
  await fireEvent.press(screen.getByTestId("refine-time"));
  expect(onEdit).toHaveBeenCalled();
});

test("calculation details show place, coordinates, times, settings and versions (journey 3)", async () => {
  const onEdit = jest.fn();
  await render(<ChartScreen chart={exact as Chart} lang="en" place={gyumri} onEditDetails={onEdit} />);
  expect(screen.queryByTestId("calc-details-panel")).toBeNull();
  await fireEvent.press(screen.getByTestId("calc-details"));
  const panel = within(screen.getByTestId("calc-details-panel"));
  expect(panel.getByText("Gyumri, Shirak, Armenia")).toBeTruthy();
  expect(panel.getByText("40.7942, 43.8453")).toBeTruthy();
  expect(panel.getByText("Asia/Yerevan")).toBeTruthy();
  expect(panel.getByText("14.08.1992 14:30 · Exact")).toBeTruthy();
  expect(panel.getByText("14.08.1992 10:30 · UTC+04:00")).toBeTruthy();
  expect(panel.getByText("Tropical zodiac · true node")).toBeTruthy();
  expect(panel.getByText(/^ameesi-engine .* · Swiss Ephemeris 2\.10\.03 · tzdata /)).toBeTruthy();
  await fireEvent.press(panel.getByTestId("details-edit"));
  expect(onEdit).toHaveBeenCalled();
});

test("server warnings are shown in the user's language", async () => {
  const warned = { ...(exact as Chart), warnings: [{ code: "historical_offset", message: "English from the server" }] };
  await render(<ChartScreen chart={warned} lang="ru" />);
  expect(screen.getByText(/карты на разных сайтах иногда различаются/)).toBeTruthy();
  expect(screen.queryByText(/English from the server/)).toBeNull();
});

test("unknown warning codes fall back to the server's message", async () => {
  const warned = { ...(exact as Chart), warnings: [{ code: "new_code", message: "Server message" }] };
  await render(<ChartScreen chart={warned} lang="hy" />);
  expect(screen.getByText(/Server message/)).toBeTruthy();
});

test("houses are tappable on the wheel and open their explanation", async () => {
  await render(<ChartScreen chart={exact as Chart} lang="en" />);
  const house = screen.getByTestId("wheel-house-7");
  expect(house).toHaveProp("accessibilityLabel", "7th house");
  const st = StyleSheet.flatten(house.props.style);
  await fireEvent.press(screen.getByTestId("wheel-touch"), { nativeEvent: { locationX: st.left + 24, locationY: st.top + 24 } });
  expect(within(screen.getByTestId("explanation-sheet")).getByRole("header", { name: "7th house" })).toBeTruthy();
});

test("unknown time: no house targets on the wheel", async () => {
  await render(<ChartScreen chart={unknown as Chart} lang="en" />);
  expect(screen.queryByTestId("wheel-house-1")).toBeNull();
});
