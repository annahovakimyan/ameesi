import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-font", () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: async () => {} }));

const mockFetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: "ok" }) }));
global.fetch = mockFetch as unknown as typeof fetch;

import App from "../../App";

test("first launch: language screen, then Continue opens the birth form", async () => {
  await render(<App />);
  await waitFor(() => expect(screen.getByTestId("onboarding-continue")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("lang-en"));
  expect(screen.getByText("Choose your language")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("onboarding-continue"));
  await waitFor(() => expect(screen.getByText("Your birth details")).toBeTruthy());
  expect(screen.getByTestId("still-needed")).toBeTruthy();
  await act(async () => {});
});
