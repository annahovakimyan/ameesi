import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import type { Chart } from "../api/types";
import { ChartScreen } from "../screens/ChartScreen";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

test("Start here: Sun, Moon, Ascendant, each opening its explanation", async () => {
  const onTourDone = jest.fn();
  await render(<ChartScreen chart={exact as Chart} lang="en" tour onTourDone={onTourDone} />);
  expect(screen.getByText("START HERE · 1 of 3")).toBeTruthy();
  expect(screen.getByTestId("tour-title")).toHaveTextContent("Sun in Leo");
  await fireEvent.press(screen.getByTestId("tour-read"));
  expect(within(screen.getByTestId("explanation-sheet")).getByRole("header", { name: "Sun" })).toBeTruthy();
  await fireEvent.press(screen.getByTestId("tour-next"));
  expect(screen.queryByTestId("explanation-sheet")).toBeNull();
  expect(screen.getByTestId("tour-title")).toHaveTextContent("Moon in Pisces");
  await fireEvent.press(screen.getByTestId("tour-next"));
  expect(screen.getByTestId("tour-title")).toHaveTextContent("Ascendant in Scorpio");
  expect(screen.queryByTestId("tour-skip")).toBeNull();
  await fireEvent.press(screen.getByTestId("tour-read"));
  expect(within(screen.getByTestId("explanation-sheet")).getByRole("header", { name: "Ascendant" })).toBeTruthy();
  await fireEvent.press(screen.getByTestId("tour-next")); // "Done"
  expect(onTourDone).toHaveBeenCalledTimes(1);
});

test("Armenian titles use the glossary forms, without capitals", async () => {
  await render(<ChartScreen chart={exact as Chart} lang="hy" tour />);
  expect(screen.getByText("Սկսեք այստեղից · 1/3")).toBeTruthy();
  expect(screen.getByTestId("tour-title")).toHaveTextContent("Արեգակը Առյուծում");
});

test("unknown birth time: two steps, no Ascendant", async () => {
  await render(<ChartScreen chart={unknown as Chart} lang="en" tour />);
  expect(screen.getByText("START HERE · 1 of 2")).toBeTruthy();
});

test("skip ends the tour", async () => {
  const onTourDone = jest.fn();
  await render(<ChartScreen chart={exact as Chart} lang="en" tour onTourDone={onTourDone} />);
  await fireEvent.press(screen.getByTestId("tour-skip"));
  expect(onTourDone).toHaveBeenCalled();
});

test("after the tour, the add-someone prompt (FR-11)", async () => {
  const onAddSomeone = jest.fn(), onAddPromptDone = jest.fn();
  await render(<ChartScreen chart={exact as Chart} lang="en" addPrompt onAddSomeone={onAddSomeone} onAddPromptDone={onAddPromptDone} />);
  expect(screen.getByText("Add someone you care about")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("add-prompt-add"));
  expect(onAddPromptDone).toHaveBeenCalled();
  expect(onAddSomeone).toHaveBeenCalled();
});
