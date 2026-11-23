import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { Chart } from "../api/types";
import { keyAspects, ShareCard } from "../components/ShareCard";
import { ChartScreen } from "../screens/ChartScreen";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn(async () => "file:///tmp/card.png") }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
const { captureRef } = jest.requireMock("react-native-view-shot");
const Sharing = jest.requireMock("expo-sharing");

const allText = () => screen.toJSON() ? JSON.stringify(screen.toJSON()) : "";

test("the card shows the wheel and the three tightest aspects, and no birth details in words", async () => {
  const chart = exact as Chart;
  await render(<ShareCard chart={chart} lang="en" width={360} />);
  expect(screen.getByTestId("chart-wheel")).toBeTruthy();
  expect(screen.getByText("Key aspects")).toBeTruthy();
  expect(screen.getAllByTestId("share-aspect")).toHaveLength(3);
  const tightest = keyAspects(chart);
  expect(tightest.map((a) => a.orb)).toEqual([...chart.aspects].map((a) => a.orb).sort((x, y) => x - y).slice(0, 3));
  const text = allText();
  for (const leak of ["1992", "14:30", "10:30", "Gyumri", "Asia/Yerevan"]) expect(text).not.toContain(leak);
});

test("a chart without aspects shows no aspect heading", async () => {
  await render(<ShareCard chart={{ ...(unknown as Chart), aspects: [] }} lang="hy" width={320} />);
  expect(screen.queryByText("Գլխավոր ասպեկտներ")).toBeNull();
  expect(screen.getByTestId("chart-wheel")).toBeTruthy();
});

test("Share captures the card as a PNG and opens the share sheet", async () => {
  await render(<ChartScreen chart={exact as Chart} lang="en" />);
  await fireEvent.press(screen.getByTestId("share"));
  expect(screen.getByTestId("share-card")).toBeTruthy(); // preview first
  await fireEvent.press(screen.getByTestId("share-send"));
  await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///tmp/card.png", expect.objectContaining({ mimeType: "image/png" })));
  expect(captureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: "png", width: 1080 }));
});
