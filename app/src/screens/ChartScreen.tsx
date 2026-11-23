import { useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import type { Chart, Lang } from "../api/types";
import { AppText, Icon } from "../components/AppText";
import { Button } from "../components/Button";
import { ChartList } from "../components/ChartList";
import { ChartWheel } from "../components/ChartWheel";
import { ExplanationSheet } from "../components/ExplanationSheet";
import { Segmented } from "../components/Segmented";
import { t } from "../i18n";
import type { Selection } from "../selection";
import { space } from "../theme";

export function ChartScreen({ chart, lang, onBack, title }: {
  chart: Chart; lang: Lang; onBack?: () => void; title?: string;
}) {
  const [view, setView] = useState<"wheel" | "list">("wheel");
  // Switching between wheel and list keeps the selected element (design system: SegmentedControl).
  const [selection, setSelection] = useState<Selection | null>(null);
  const { width } = useWindowDimensions();
  const selectedBody = selection?.kind === "body" ? selection.id : null;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {onBack && <Button kind="secondary" label={t("back", lang)} onPress={onBack} testID="back" />}
      {title && <AppText variant="titleLg" accessibilityRole="header" testID="chart-title">{title}</AppText>}
      <Segmented testID="view" value={view} onChange={setView}
        options={[{ value: "wheel", label: t("wheel", lang) }, { value: "list", label: t("list", lang) }]} />

      {view === "wheel" ? (
        <>
          <View style={styles.centre}>
            <ChartWheel chart={chart} lang={lang} size={width - space[4] * 2} selected={selectedBody}
              onSelect={(id) => setSelection({ kind: "body", id })} />
          </View>
          <AppText variant="bodySm" tone="textMuted" style={styles.hint}>{t("tapPlanet", lang)}</AppText>
          {!chart.houses && (
            <AppText variant="bodySm" tone="textMuted" style={styles.hint}>{t("unknownTimeNote", lang)}</AppText>
          )}
        </>
      ) : (
        <ChartList chart={chart} lang={lang} onSelect={setSelection} />
      )}

      {chart.warnings.map((w) => <AppText key={w.code} tone="gold" variant="bodySm"><Icon char="⚠" tone="gold" /> {w.message}</AppText>)}
      <AppText variant="caption" tone="textFaint">
        {chart.meta.house_system_used
          ? t("calcDetails", lang, { houses: t(chart.meta.house_system_used, lang), tzdata: chart.meta.tzdata })
          : t("calcDetailsNoHouses", lang, { tzdata: chart.meta.tzdata })}
      </AppText>
      <ExplanationSheet chart={chart} lang={lang} selection={selection} onSelect={setSelection}
        onClose={() => setSelection(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  centre: { alignItems: "center" },
  hint: { textAlign: "center" },
});
