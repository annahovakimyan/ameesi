import { ScrollView, StyleSheet, View } from "react-native";
import type { Chart, Lang } from "../api/types";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { bodyGlyph, formatDegrees, signGlyph } from "../format";
import { houseTerm, t, term } from "../i18n";
import { colors, radius, space } from "../theme";

function Row({ title, subtitle, glyph, flags }: { title: string; subtitle: string; glyph?: string; flags?: string[] }) {
  return (
    <View style={styles.row}>
      {glyph && <AppText variant="glyph" tone="lavender" style={styles.glyph}>{glyph}</AppText>}
      <View style={{ flex: 1 }}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="bodySm" tone="textMuted">{[subtitle, ...(flags ?? [])].join(" · ")}</AppText>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="title">{title}</AppText>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function ChartListScreen({ chart, lang, onBack }: { chart: Chart; lang: Lang; onBack: () => void }) {
  const flag = (cond: boolean, id: "uncertain" | "retrograde") => (cond ? [t(id, lang)] : []);
  const where = (sign: Parameters<typeof signGlyph>[0], deg: number, house: number | null) =>
    [`${signGlyph(sign)} ${term(`sign.${sign}`, lang)} ${formatDegrees(deg)}`,
     house ? houseTerm(house, lang) : null].filter(Boolean).join(" · ");

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Button kind="secondary" label={t("back", lang)} onPress={onBack} testID="back" />

      <Section title={t("bodies", lang)}>
        {chart.bodies.map((b) => (
          <Row key={b.id} glyph={bodyGlyph(b.id)} title={term(`body.${b.id}`, lang)}
            subtitle={where(b.sign, b.sign_deg, b.house)}
            flags={[...flag(b.retrograde, "retrograde"), ...flag(b.uncertain, "uncertain")]} />
        ))}
      </Section>

      {chart.angles && (
        <Section title={t("angles", lang)}>
          {(["asc", "mc", "dsc", "ic"] as const).map((k) => {
            const a = chart.angles![k];
            return <Row key={k} title={term(`angle.${k}`, lang)} subtitle={where(a.sign, a.sign_deg, null)}
              flags={flag(a.uncertain, "uncertain")} />;
          })}
        </Section>
      )}

      {chart.aspects.length > 0 && (
        <Section title={t("aspects", lang)}>
          {chart.aspects.map((a) => {
            const unsure = chart.aspects_uncertain.some((u) => u.a === a.a && u.b === a.b && u.type === a.type);
            return <Row key={`${a.a}-${a.b}`} glyph={`${bodyGlyph(a.a)}${bodyGlyph(a.b)}`}
              title={`${term(`body.${a.a}`, lang)} – ${term(`body.${a.b}`, lang)}`}
              subtitle={`${term(`aspect.${a.type}`, lang)} · ${t("orb", lang, { orb: formatDegrees(a.orb) })}`}
              flags={flag(unsure, "uncertain")} />;
          })}
        </Section>
      )}

      {chart.stelliums.length > 0 && (
        <Section title={t("stelliums", lang)}>
          {chart.stelliums.map((s) => (
            <Row key={`${s.kind}-${s.where}`}
              title={typeof s.where === "number" ? houseTerm(s.where, lang) : term(`sign.${s.where}`, lang)}
              subtitle={s.members.map((m) => term(`body.${m}`, lang)).join(", ")} />
          ))}
        </Section>
      )}

      {chart.balance && (
        <Section title={t("balance", lang)}>
          <Row title={(["fire", "earth", "air", "water"] as const)
            .map((e) => `${term(`element.${e}`, lang)} ${chart.balance![e]}`).join(" · ")}
            subtitle={(["cardinal", "fixed", "mutable"] as const)
              .map((m) => `${term(`modality.${m}`, lang)} ${chart.balance![m]}`).join(" · ")} />
        </Section>
      )}

      {chart.warnings.map((w) => <AppText key={w.code} tone="gold" variant="bodySm">⚠︎ {w.message}</AppText>)}
      <AppText variant="caption" tone="textFaint">
        {t("calcDetails", lang, {
          houses: chart.meta.house_system_used ? t(chart.meta.house_system_used, lang) : "—",
          tzdata: chart.meta.tzdata,
        })}
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  section: { gap: space[2] },
  group: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3],
         borderBottomWidth: 1, borderBottomColor: colors.divider },
  glyph: { minWidth: space[8], textAlign: "center" },
});
