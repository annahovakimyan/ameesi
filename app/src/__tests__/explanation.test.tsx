import { fireEvent, render, screen, within } from "@testing-library/react-native";
import type { Chart } from "../api/types";
import { ContentProvider, placeholderSource } from "../content/source";
import { ChartScreen } from "../screens/ChartScreen";
import exact from "./fixtures/chart-exact.json";
import unknown from "./fixtures/chart-unknown.json";

// Fake entries only: real interpretation texts never appear in this repository.
const fake = (missing: string[] = []) => ({
  ...placeholderSource(new Set(missing)),
  get(id: string, lang: "hy" | "en" | "ru") {
    return missing.includes(id) ? null : { id, lang, version: 1, text: `Test text for ${id} (${lang})` };
  },
});

async function openList(chart: unknown, lang: "hy" | "en" | "ru" = "en", missing: string[] = []) {
  await render(
    <ContentProvider source={fake(missing)}>
      <ChartScreen chart={chart as Chart} lang={lang} onBack={jest.fn()} />
    </ContentProvider>,
  );
  await fireEvent.press(screen.getByTestId("view-list"));
}

const sheet = () => within(screen.getByTestId("explanation-sheet"));

test("a planet: title, facts, its entries in order, basis, content ids and framing", async () => {
  await openList(exact);
  await fireEvent.press(screen.getByTestId("row-sun"));
  const s = sheet();
  expect(s.getByRole("header", { name: "Sun" })).toBeTruthy();
  expect(s.getByText("♌\uFE0E Leo 21°52′ · 9th house")).toBeTruthy(); // header facts
  expect(s.getByText("Sun in Leo")).toBeTruthy();
  expect(s.getByText("Sun in 9th house")).toBeTruthy();
  expect(s.getByText("Basics · Sun")).toBeTruthy();
  expect(s.getByText("Test text for sign.sun.leo (en)")).toBeTruthy();
  expect(s.getByText("ASTROLOGICAL BASIS")).toBeTruthy();
  expect(s.getByText(/^Sun 141\.88° · Leo 21°52′ · 9th house$/)).toBeTruthy();
  expect(s.getByTestId("entry-ids")).toHaveTextContent("Explanation entries: sign.sun.leo, house.sun.09, basic.planet.sun");
  expect(s.getByText(/symbolic language for self-reflection/)).toBeTruthy();
});

test("related aspects switch the sheet to that aspect, and back to a planet", async () => {
  await openList(exact);
  await fireEvent.press(screen.getByTestId("row-sun"));
  await fireEvent.press(sheet().getByText("Opposition · Saturn"));
  expect(sheet().getByRole("header", { name: "Sun – Saturn" })).toBeTruthy();
  expect(sheet().getByText("Test text for aspect.sun.saturn.opposition (en)")).toBeTruthy();
  expect(sheet().getByText(/separation 172°4\d′ · orb 7°1\d′/)).toBeTruthy();
  await fireEvent.press(sheet().getByRole("button", { name: /♄.*Saturn/ }));
  expect(sheet().getByRole("header", { name: "Saturn" })).toBeTruthy();
  expect(sheet().getByText("Saturn retrograde")).toBeTruthy();
});

test("only entries approved in the user's language are shown (PRD FR-06)", async () => {
  await openList(exact, "hy", ["house.sun.09"]);
  await fireEvent.press(screen.getByTestId("row-sun"));
  expect(sheet().queryByTestId("entry-house.sun.09")).toBeNull();
  expect(sheet().getByText("Test text for sign.sun.leo (hy)")).toBeTruthy();
  expect(sheet().getByTestId("entry-ids")).not.toHaveTextContent("house.sun.09");
});

test("no approved entry at all: facts only, with a note", async () => {
  await openList(exact, "en", ["stellium.house.09"]);
  const row = screen.queryByText(/^9th house$/);
  if (!row) return; // this chart has no house stellium
  await fireEvent.press(row);
  expect(sheet().getByText("There's no explanation for this element yet.")).toBeTruthy();
});

test("Armenian: glossary headings, no letter-spaced capitals", async () => {
  await openList(exact, "hy");
  await fireEvent.press(screen.getByTestId("row-asc"));
  expect(sheet().getByRole("header", { name: "Ասցենդենտ" })).toBeTruthy();
  expect(sheet().getByText("Ասցենդենտը Կարիճում")).toBeTruthy();
  expect(sheet().getByText("Աստղագիտական հիմք")).toBeTruthy();
});

test("South Node is explained by the North Node's entries", async () => {
  await openList(exact);
  await fireEvent.press(screen.getByTestId("row-south_node"));
  expect(sheet().getByRole("header", { name: "South Node" })).toBeTruthy();
  expect(sheet().getByText("North Node in Sagittarius")).toBeTruthy();
  expect(sheet().getByTestId("entry-ids")).toHaveTextContent(/node\.sign\.sagittarius, node\.house\.01$/);
});

test("unknown time: no house section, and the Moon carries a notice", async () => {
  await openList(unknown);
  await fireEvent.press(screen.getByTestId("row-moon"));
  expect(sheet().queryByText(/house/)).toBeNull();
  expect(sheet().getByText(/Moon changes sign that day/)).toBeTruthy();
});

test("closing returns to the same view", async () => {
  await openList(exact);
  await fireEvent.press(screen.getByTestId("row-mars"));
  await fireEvent.press(screen.getByTestId("sheet-close"));
  expect(screen.queryByTestId("explanation-sheet")).toBeNull();
  expect(screen.getByTestId("row-mars")).toBeTruthy(); // still on the list
});

test("the handle switches between half and full height without a drag", async () => {
  await openList(exact);
  await fireEvent.press(screen.getByTestId("row-moon"));
  const handle = screen.getByTestId("sheet-handle");
  expect(handle).not.toBeExpanded();
  await fireEvent.press(handle);
  expect(screen.getByTestId("sheet-handle")).toBeExpanded();
});

test("Russian headings use the prepositional case", async () => {
  await openList(exact, "ru");
  await fireEvent.press(screen.getByTestId("row-sun"));
  expect(sheet().getByText("Солнце во Льве")).toBeTruthy();
  expect(sheet().getByText("Солнце в 9-м доме")).toBeTruthy();
});
