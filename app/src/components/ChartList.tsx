import { Pressable, StyleSheet, View } from "react-native";
import type { Chart, Lang } from "../api/types";
import { bodyFlags, placement } from "../chartText";
import { bodyGlyph, formatDegrees } from "../format";
import { houseTerm, t, term } from "../i18n";
import type { Selection } from "../selection";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";

export function Row({ title, subtitle, glyph, flags, onPress, testID }: {
  title: string; subtitle: string; glyph?: string; flags?: string[]; onPress?: () => void; testID?: string;
}) {
  const inner = (
    <>
      {glyph && (
        <View style={styles.tile}>
          <AppText variant="glyph" tone="gold" maxFontSizeMultiplier={1} style={styles.glyph}>{glyph}</AppText>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <AppText variant="headline">{title}</AppText>
        <AppText variant="bodySm" tone="textMuted">{[subtitle, ...(flags ?? [])].join(" · ")}</AppText>
      </View>
      {onPress && <AppText variant="title" tone="textMuted">›</AppText>}
    </>
  );
  if (!onPress) return <View style={styles.row}>{inner}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.row, styles.tappable, pressed && { backgroundColor: colors.surfaceRaised }]}>
      {inner}
    </Pressable>
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

export function ChartList({ chart, lang, onSelect }: { chart: Chart; lang: Lang; onSelect: (s: Selection) => void }) {
  const flag = (cond: boolean, id: "uncertain" | "retrograde") => (cond ? [t(id, lang)] : []);

  return (
    <View style={styles.list}>

      <Section title={t("bodies", lang)}>
        {chart.bodies.map((b) => (
          <Row key={b.id} glyph={bodyGlyph(b.id)} title={term(`body.${b.id}`, lang)}
            subtitle={placement(b.sign, b.sign_deg, b.house, lang)} flags={bodyFlags(b, lang)}
            onPress={() => onSelect({ kind: "body", id: b.id })} testID={`row-${b.id}`} />
        ))}
      </Section>

      {chart.angles && (
        <Section title={t("angles", lang)}>
          {(["asc", "mc", "dsc", "ic"] as const).map((k) => {
            const a = chart.angles![k];
            return <Row key={k} title={term(`angle.${k}`, lang)} subtitle={placement(a.sign, a.sign_deg, null, lang)}
              flags={flag(a.uncertain, "uncertain")} onPress={() => onSelect({ kind: "angle", id: k })} testID={`row-${k}`} />;
          })}
        </Section>
      )}

      {chart.aspects.length > 0 && (
        <Section title={t("aspects", lang)}>
          {chart.aspects.map((a) => {
            const unsure = chart.aspects_uncertain.some((u) => u.a === a.a && u.b === a.b && u.type === a.type);
            return <Row key={`${a.a}-${a.b}`} glyph={`${bodyGlyph(a.a)} ${bodyGlyph(a.b)}`}
              title={`${term(`body.${a.a}`, lang)} – ${term(`body.${a.b}`, lang)}`}
              subtitle={`${term(`aspect.${a.type}`, lang)} · ${t("orb", lang, { orb: formatDegrees(a.orb) })}`}
              flags={flag(unsure, "uncertain")} testID={`row-${a.a}-${a.b}`}
              onPress={() => onSelect({ kind: "aspect", a: a.a, b: a.b, type: a.type })} />;
          })}
        </Section>
      )}

      {chart.stelliums.length > 0 && (
        <Section title={t("stelliums", lang)}>
          {chart.stelliums.map((s) => (
            <Row key={`${s.kind}-${s.where}`}
              title={typeof s.where === "number" ? houseTerm(s.where, lang) : term(`sign.${s.where}`, lang)}
              subtitle={s.members.map((m) => term(`body.${m}`, lang)).join(", ")}
              onPress={() => onSelect({ kind: "stellium", stellium: s })} />
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

    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[6] },
  section: { gap: space[2] },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.glassEdge },
  row: { flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3],
         borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassEdge },
  glyph: { textAlign: "center" },
  tile: { minWidth: space[12] - space[2], height: space[12] - space[2], borderRadius: radius.md, paddingHorizontal: space[1],
          backgroundColor: colors.wheelNight, borderWidth: 1, borderColor: colors.glassEdge, alignItems: "center", justifyContent: "center" },
  tappable: { minHeight: MIN_TOUCH },
});
