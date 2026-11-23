import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { Profile } from "../profiles/profiles";
import type { ProfileStore } from "../profiles/store";
import { Root } from "../screens/Root";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function memoryStore(): ProfileStore & { saved: Profile[] } {
  const s = { saved: [] as Profile[], load: async () => s.saved, save: async (p: Profile[]) => { s.saved = p; } };
  return s;
}

beforeEach(() => mockFetch.mockReset());

test("with no server, the sample chart opens and can be explored; nothing is saved", async () => {
  mockFetch.mockRejectedValue(new TypeError("Network request failed"));
  const store = memoryStore();
  await render(<Root lang="en" store={store} />);
  await waitFor(() => expect(screen.getByTestId("try-sample-offline")).toBeTruthy());
  await fireEvent.press(screen.getByTestId("try-sample-offline"));
  expect(screen.getByTestId("sample-mode")).toBeTruthy();
  expect(screen.getByText(/Sample chart \(Gyumri, 14 August 1992\)\. Nothing is saved\./)).toBeTruthy();
  expect(screen.getByTestId("chart-wheel")).toBeTruthy();
  expect(screen.getByTestId("tour-title")).toHaveTextContent("Sun in Leo");
  await fireEvent.press(screen.getByTestId("tour-read"));
  expect(screen.getByTestId("explanation-sheet")).toBeTruthy();
  expect(store.saved).toEqual([]);
  await fireEvent.press(screen.getByTestId("sheet-close"));
  await fireEvent.press(screen.getByTestId("back"));
  expect(screen.getByText("Your birth details")).toBeTruthy();
});

test("in development the sample is also offered when the server works", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ status: "ok" }) });
  await render(<Root lang="hy" store={memoryStore()} />);
  await act(async () => {});
  expect(screen.getByTestId("try-sample")).toHaveTextContent("Փորձել օրինակով");
});
