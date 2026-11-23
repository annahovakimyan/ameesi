import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { Chart } from "../api/types";
import { ShareCard } from "../components/ShareCard";
import { ChartScreen } from "../screens/ChartScreen";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

jest.mock("react-native-view-shot", () => ({ captureRef: jest.fn(async () => "file:///tmp/card.png") }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
const { captureRef } = jest.requireMock("react-native-view-shot");
const Sharing = jest.requireMock("expo-sharing");

const allText = () => screen.toJSON() ? JSON.stringify(screen.toJSON()) : "";

test("the card shows the Big Three and no birth details (FR-11)", async () => {
  await render(<ShareCard chart={exact as Chart} lang="en" />);
  expect(screen.getByText("My Big Three")).toBeTruthy();
  expect(screen.getByText("Sun in Leo")).toBeTruthy();
  expect(screen.getByText("Moon in Pisces")).toBeTruthy();
  expect(screen.getByText("Ascendant in Scorpio")).toBeTruthy();
  const text = allText();
  for (const leak of ["1992", "14:30", "10:30", "Gyumri", "Asia/Yerevan", "°", "house"]) expect(text).not.toContain(leak);
});

test("unknown birth time: Sun and Moon only", async () => {
  await render(<ShareCard chart={unknown as Chart} lang="hy" />);
  expect(screen.getByText("Իմ մեծ եռյակը")).toBeTruthy();
  expect(screen.queryByText(/Ասցենդենտը/)).toBeNull();
});

test("Share captures the card as a PNG and opens the share sheet", async () => {
  await render(<ChartScreen chart={exact as Chart} lang="en" />);
  await fireEvent.press(screen.getByTestId("share"));
  await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///tmp/card.png", expect.objectContaining({ mimeType: "image/png" })));
  expect(captureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: "png" }));
});
