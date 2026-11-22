import { useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import type { BodyId, Chart, Lang } from "../api/types";
import { bodyFlags, placement } from "../chartText";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { ChartList, Row } from "../components/ChartList";
import { ChartWheel } from "../components/ChartWheel";
import { Segmented } from "../components/Segmented";
import { bodyGlyph, formatDegrees } from "../format";
import { t, term } from "../i18n";
import { colors, radius, space } from "../theme";

export function ChartScreen({ chart, lang, onBack }: { chart: Chart; lang: Lang; onBack: () => void }) {
  const [view, setView] = useState<"wheel" | "list">("wheel");
  const [selected, setSelected] = useState<BodyId | null>(null);
  const { width } = useWindowDimensions();
  const body = chart.bodies.find((b) => b.id === selected);
  const aspects = chart.aspects.filter((a) => a.a === selected || a.b === selected);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Button kind="secondary" label={t("back", lang)} onPress={onBack} testID="back" />
      <Segmented testID="view" value={view} onChange={setView}
        options={[{ value: "wheel", label: t("wheel", lang) }, { value: "list", label: t("list", lang) }]} />

      {view === "wheel" ? (
        <>
          <View style={styles.centre}>
            <ChartWheel chart={chart} lang={lang} size={width - space[4] * 2} selected={selected}
              onSelect={(id) => setSelected((cur) => (cur === id ? null : id))} />
          </View>
          {body ? (
            <View style={styles.card} testID="selection">
              <Row glyph={bodyGlyph(body.id)} title={term(`body.${body.id}`, lang)}
                subtitle={placement(body.sign, body.sign_deg, body.house, lang)} flags={bodyFlags(body, lang)} />
              {aspects.map((a) => {
                const other = a.a === body.id ? a.b : a.a;
                return <Row key={`${a.a}-${a.b}`} glyph={bodyGlyph(other)}
                  title={`${term(`aspect.${a.type}`, lang)} · ${term(`body.${other}`, lang)}`}
                  subtitle={t("orb", lang, { orb: formatDegrees(a.orb) })} />;
              })}
            </View>
          ) : (
            <AppText variant="bodySm" tone="textMuted" style={styles.hint}>{t("tapPlanet", lang)}</AppText>
          )}
          {!chart.houses && (
            <AppText variant="bodySm" tone="textMuted" style={styles.hint}>{t("unknownTimeNote", lang)}</AppText>
          )}
        </>
      ) : (
        <ChartList chart={chart} lang={lang} />
      )}

      {chart.warnings.map((w) => <AppText key={w.code} tone="gold" variant="bodySm">⚠︎ {w.message}</AppText>)}
      <AppText variant="caption" tone="textFaint">
        {chart.meta.house_system_used
          ? t("calcDetails", lang, { houses: t(chart.meta.house_system_used, lang), tzdata: chart.meta.tzdata })
          : t("calcDetailsNoHouses", lang, { tzdata: chart.meta.tzdata })}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  centre: { alignItems: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden" },
  hint: { textAlign: "center" },
});
