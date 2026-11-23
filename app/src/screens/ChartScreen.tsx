import { useRef, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import type { Chart, Lang, Place } from "../api/types";
import { AppText, Icon } from "../components/AppText";
import { Button } from "../components/Button";
import { ChartList } from "../components/ChartList";
import { ChartWheel } from "../components/ChartWheel";
import { ExplanationSheet } from "../components/ExplanationSheet";
import { AddSomeonePrompt, TourCard, tourSteps } from "../components/TourCard";
import { ShareCard, shareCard, type ViewRef } from "../components/ShareCard";
import { Segmented } from "../components/Segmented";
import { formatDateTime } from "../format";
import { t } from "../i18n";
import { strings } from "../i18n/strings";
import type { Selection } from "../selection";
import { colors, radius, space } from "../theme";

function warningText(code: string, message: string, lang: Lang): string {
  const id = `warn_${code}` as keyof typeof strings;
  return id in strings ? t(id, lang) : message;
}

export function ChartScreen({ chart, lang, onBack, title, tour, onTourDone, addPrompt, onAddSomeone, onAddPromptDone,
  place, onEditDetails }: {
  chart: Chart; lang: Lang; onBack?: () => void; title?: string;
  place?: Place; onEditDetails?: () => void; // calculation details and "Refine my birth time"
  tour?: boolean; onTourDone?: () => void; // "Start here": Sun, Moon, Ascendant
  addPrompt?: boolean; onAddSomeone?: () => void; onAddPromptDone?: () => void; // FR-11, after the tour
}) {
  const steps = tourSteps(chart, lang);
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(false);
  const cardRef = useRef<ViewRef>(null);
  const confidence = chart.time.confidence;
  const [view, setView] = useState<"wheel" | "list">("wheel");
  // Switching between wheel and list keeps the selected element (design system: SegmentedControl).
  const [selection, setSelection] = useState<Selection | null>(null);
  const { width } = useWindowDimensions();
  const selectedBody = selection?.kind === "body" ? selection.id : null;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {onBack && <Button kind="secondary" label={t("back", lang)} onPress={onBack} testID="back" />}
      <View style={styles.header}>
        <AppText variant="titleLg" accessibilityRole="header" testID="chart-title" style={styles.flex} numberOfLines={2}>
          {title ?? ""}
        </AppText>
        <Button kind="secondary" compact testID="share" label={t("share", lang)}
          onPress={() => { shareCard(cardRef.current).catch(() => {}); }} />
      </View>
      {/* Off-screen: rendered so it can be captured as an image, never shown */}
      <View style={styles.offscreen} pointerEvents="none" importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden>
        <ShareCard ref={cardRef} chart={chart} lang={lang} />
      </View>
      <Segmented testID="view" value={view} onChange={setView}
        options={[{ value: "wheel", label: t("wheel", lang) }, { value: "list", label: t("list", lang) }]} />

      {confidence !== "exact" && (
        <View style={styles.notice} testID="time-banner" accessibilityRole="alert">
          <AppText variant="bodySm"><Icon char="ⓘ" tone="gold" /> {t(confidence === "unknown" ? "bannerUnknown" : "bannerApprox", lang)}</AppText>
          {onEditDetails && <Button kind="secondary" testID="refine-time" label={t("refineTime", lang)} onPress={onEditDetails} />}
        </View>
      )}

      {tour && step < steps.length && (
        <TourCard lang={lang} step={step + 1} total={steps.length} title={steps[step].title}
          onRead={() => setSelection(steps[step].sel)}
          onNext={() => { setSelection(null); if (step + 1 >= steps.length) onTourDone?.(); else setStep(step + 1); }}
          onSkip={() => { setSelection(null); onTourDone?.(); }} />
      )}
      {!tour && addPrompt && (
        <AddSomeonePrompt lang={lang} onAdd={() => { onAddPromptDone?.(); onAddSomeone?.(); }}
          onDismiss={() => onAddPromptDone?.()} />
      )}

      {view === "wheel" ? (
        <>
          <View style={styles.centre}>
            <ChartWheel chart={chart} lang={lang} size={width - space[4] * 2} selected={selectedBody}
              onSelect={setSelection} />
          </View>
          <AppText variant="bodySm" tone="textMuted" style={styles.hint}>{t("tapPlanet", lang)}</AppText>
        </>
      ) : (
        <ChartList chart={chart} lang={lang} onSelect={setSelection} />
      )}

      {chart.warnings.map((w) => (
        <AppText key={w.code} tone="gold" variant="bodySm"><Icon char="⚠" tone="gold" /> {warningText(w.code, w.message, lang)}</AppText>
      ))}

      <AppText variant="caption" tone="textFaint">
        {chart.meta.house_system_used
          ? t("calcDetails", lang, { houses: t(chart.meta.house_system_used, lang), tzdata: chart.meta.tzdata })
          : t("calcDetailsNoHouses", lang, { tzdata: chart.meta.tzdata })}
      </AppText>
      <Button kind="secondary" testID="calc-details" label={t("calcDetailsTitle", lang)} onPress={() => setDetails(!details)} />
      {details && <CalcDetails chart={chart} lang={lang} place={place} onEdit={onEditDetails} />}

      <ExplanationSheet chart={chart} lang={lang} selection={selection} onSelect={setSelection}
        onClose={() => setSelection(null)} />
    </ScrollView>
  );
}

function CalcDetails({ chart, lang, place, onEdit }: { chart: Chart; lang: Lang; place?: Place; onEdit?: () => void }) {
  const m = chart.time.utc_offset_minutes;
  const offset = `UTC${m >= 0 ? "+" : "−"}${String(Math.floor(Math.abs(m) / 60)).padStart(2, "0")}:${String(Math.abs(m) % 60).padStart(2, "0")}`;
  const used = chart.meta.house_system_used;
  const rows: [string, string][] = [
    ...(place ? [[t("place", lang), [place.name, place.region, place.country].filter(Boolean).join(", ")],
      [t("coordinates", lang), `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`],
      [t("timeZone", lang), place.tz]] as [string, string][] : []),
    [t("localTime", lang), `${formatDateTime(chart.time.local)} · ${t(chart.time.confidence, lang)}`],
    [t("utcTime", lang), `${formatDateTime(chart.time.utc)} · ${offset}${
      chart.time.offset_source === "user_override" ? ` (${t("offsetSetByHand", lang)})` : ""}`],
    [t("houseSystem", lang), used ? t(used, lang) : "—"],
    ["", t("zodiacNode", lang)],
    ["", t("versionsLine", lang, { engine: chart.meta.engine, swe: chart.meta.swisseph, tz: chart.meta.tzdata })],
  ];
  return (
    <View style={styles.details} testID="calc-details-panel">
      {rows.map(([label, value]) => (
        <View key={label + value}>
          {label !== "" && <AppText variant="caption" tone="textMuted">{label}</AppText>}
          <AppText variant="bodySm">{value}</AppText>
        </View>
      ))}
      {onEdit && <Button kind="secondary" testID="details-edit" label={t("editBirthTitle", lang)} onPress={onEdit} />}
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: "absolute", left: -10000, top: 0 },
  notice: { padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.glassEdge, borderRadius: radius.lg,
            backgroundColor: colors.surface },
  details: { padding: space[4], gap: space[3], backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.glassEdge },
  screen: { padding: space[4], gap: space[4], paddingBottom: space[8] },
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  flex: { flex: 1 },
  centre: { alignItems: "center" },
  hint: { textAlign: "center" },
});
