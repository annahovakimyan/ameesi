import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { BirthInputScreen } from "../screens/BirthInputScreen";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

beforeEach(() => mockFetch.mockReset());

test("server unreachable: the form says so, with the address in development, and can retry", async () => {
  mockFetch.mockRejectedValue(new TypeError("Network request failed"));
  await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
  await waitFor(() => expect(screen.getByTestId("server-offline")).toBeTruthy());
  expect(screen.getByText(/Couldn't reach the server/)).toBeTruthy();
  expect(screen.getByTestId("server-dev-hint")).toHaveTextContent(/http:\/\/10\.0\.2\.2:8000.*EXPO_PUBLIC_API_URL/);
  mockFetch.mockImplementation(() => ok({ status: "ok" }));
  await fireEvent.press(screen.getByTestId("server-retry"));
  await waitFor(() => expect(screen.queryByTestId("server-offline")).toBeNull());
});

test("server reachable: no notice", async () => {
  mockFetch.mockImplementation(() => ok({ status: "ok" }));
  await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
  await act(async () => {});
  expect(screen.queryByTestId("server-offline")).toBeNull();
});

test("a failed place search says so instead of showing nothing (release builds)", async () => {
  const dev = (global as unknown as { __DEV__: boolean }).__DEV__;
  (global as unknown as { __DEV__: boolean }).__DEV__ = false;
  jest.useFakeTimers();
  mockFetch.mockRejectedValue(new TypeError("Network request failed"));
  await render(<BirthInputScreen lang="hy" onChart={jest.fn()} />);
  await fireEvent.changeText(screen.getByTestId("place-input"), "Gyumri");
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => expect(screen.getByTestId("place-error")).toHaveTextContent(/սերվերը հասանելի չէ/));
  jest.useRealTimers();
  (global as unknown as { __DEV__: boolean }).__DEV__ = dev;
});

test("development without a server: Gyumri and Yerevan as test places, in the user's language", async () => {
  jest.useFakeTimers();
  mockFetch.mockRejectedValue(new TypeError("Network request failed"));
  await render(<BirthInputScreen lang="hy" onChart={jest.fn()} />);
  await fireEvent.changeText(screen.getByTestId("place-input"), "Leninakan");
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => expect(screen.getByTestId("offline-places")).toBeTruthy());
  expect(screen.getByText("Գյումրի")).toBeTruthy();
  expect(screen.getByText(/նախկինում՝ Leninakan/)).toBeTruthy();
  await fireEvent.press(screen.getByTestId("place-616635"));
  expect(screen.getByTestId("still-needed")).not.toHaveTextContent(/Ծննդավայր/);
  jest.useRealTimers();
});

test("a search cancelled by further typing is not an error", async () => {
  jest.useFakeTimers();
  mockFetch.mockImplementation((url: string) => String(url).includes("/places")
    ? Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" })) : ok({ status: "ok" }));
  await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
  await fireEvent.changeText(screen.getByTestId("place-input"), "Gyu");
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(screen.queryByTestId("place-error")).toBeNull();
  jest.useRealTimers();
});

test("the disabled button explains what's still needed", async () => {
  mockFetch.mockImplementation(() => ok({ status: "ok" }));
  await render(<BirthInputScreen lang="en" onChart={jest.fn()} />);
  expect(screen.getByTestId("still-needed")).toHaveTextContent("Still needed: Date of birth, Time of birth, Place of birth, I am 18 or older");
  await fireEvent.press(screen.getByTestId("confidence-unknown"));
  expect(screen.getByTestId("still-needed")).toHaveTextContent("Still needed: Date of birth, Place of birth, I am 18 or older");
  await fireEvent.press(screen.getByTestId("adult"));
  expect(screen.getByTestId("still-needed")).toHaveTextContent("Still needed: Date of birth, Place of birth");
});
