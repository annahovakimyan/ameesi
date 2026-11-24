import { render, screen } from "@testing-library/react-native";
import type { Chart } from "../api/types";
import { hasLogo } from "../components/Logo";
import { ShareCard } from "../components/ShareCard";
import { emblemSvg, lockupSvg, sunSvg } from "../generated/logo";
import exact from "./fixtures/chart-exact.json";

test("the brand SVGs are built in, as plain shapes only", () => {
  for (const svg of [emblemSvg, lockupSvg, sunSvg]) {
    expect(svg).toMatch(/^<svg [^>]*viewBox="/);
    expect(svg).not.toMatch(/<script|<image|href=|<text/); // no scripts, linked images or font-dependent text
  }
  expect(hasLogo()).toBe(true);
});

test("the share card carries the logo, labelled for screen readers", async () => {
  await render(<ShareCard chart={exact as Chart} lang="en" width={360} />);
  expect(screen.getByTestId("logo-lockup")).toBeTruthy();
  expect(screen.getByLabelText("Ameesi")).toBeTruthy();
});
