import type { ComponentRef, Ref } from "react";
import { StyleSheet, View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { Chart, Lang } from "../api/types";
import { bodyGlyph, signGlyph } from "../format";
import { t } from "../i18n";
import { colors, radius, space } from "../theme";
import { AppText } from "./AppText";
import { tourSteps } from "./TourCard";

const CARD_WIDTH = 1080 / 3; // drawn at 3x: a 1080 px wide image

/** Share card (FR-11): the Big Three only. No birth date, time, place, degrees or wheel. */
export type ViewRef = ComponentRef<typeof View>;

export function ShareCard({ chart, lang, ref }: { chart: Chart; lang: Lang; ref?: Ref<ViewRef> }) {
  const rows = tourSteps(chart, lang).map((s, i) => {
    const glyph = s.sel.kind === "body" ? bodyGlyph(s.sel.id)
      : signGlyph(chart.angles!.asc.sign);
    return { key: i, glyph, title: s.title };
  });
  return (
    <View ref={ref} collapsable={false} style={styles.card} testID="share-card">
      <AppText variant="overline" tone="gold">Ameesi</AppText>
      <AppText variant="display">{t("bigThree", lang)}</AppText>
      {rows.map((r) => (
        <View key={r.key} style={styles.row}>
          <AppText variant="glyphLg" tone="gold" style={styles.glyph}>{r.glyph}</AppText>
          <AppText variant="title" style={styles.flex}>{r.title}</AppText>
        </View>
      ))}
      <AppText variant="caption" tone="textMuted">{t("explainedBy", lang)}</AppText>
    </View>
  );
}

/** Capture the card as a PNG and open the share sheet. Returns false if sharing isn't available. */
export async function shareCard(view: ViewRef | null): Promise<boolean> {
  if (!view || !(await Sharing.isAvailableAsync())) return false;
  const uri = await captureRef(view, { format: "png", quality: 1, result: "tmpfile" });
  await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Ameesi" });
  return true;
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, padding: space[6], gap: space[4], backgroundColor: colors.bg,
          borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider },
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  flex: { flex: 1 },
  glyph: { width: space[8], textAlign: "center" },
});
