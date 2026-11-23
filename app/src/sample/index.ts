// A sample chart for trying the app without a calculation server (development, or server unreachable).
// It is real server output (Gyumri, 14 August 1992, 14:30), not calculated in the app (CLAUDE.md rule 3).
import type { Chart, Place } from "../api/types";
import chart from "./sample-chart.json";

export const sampleChart = chart as Chart;
export const samplePlace: Place = {
  geonames_id: 616635, name: "Gyumri", former_names_matched: [], region: "Shirak", country: "Armenia",
  country_code: "AM", lat: 40.7894, lon: 43.8475, tz: "Asia/Yerevan",
};
