import type { ComponentRef, Ref } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { Aspect, Chart, Lang } from "../api/types";
import { bodyGlyph } from "../format";
import { t, term } from "../i18n";
import { colors, gradient, radius, space } from "../theme";
import { AppText } from "./AppText";
import { ChartWheel } from "./ChartWheel";
import { CrescentDivider } from "./Ornaments";
import { hasLogo, Logo } from "./Logo";

export const SHARE_IMAGE_WIDTH = 1080; // px of the shared PNG, whatever the card's size on screen
const SHARED_ASPECTS = 3;

export type ViewRef = ComponentRef<typeof View>;

/** The three tightest aspects (smallest orb): the ones that stand out most in the chart. */
export function keyAspects(chart: Chart): Aspect[] {
  return [...chart.aspects].sort((x, y) => x.orb - y.orb).slice(0, SHARED_ASPECTS);
}

/** Share card: the chart wheel and its three key aspects. No birth date, time or place in words. */
export function ShareCard({ chart, lang, width, ref }: { chart: Chart; lang: Lang; width: number; ref?: Ref<ViewRef> }) {
  const wheel = width - space[5] * 2;
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width }]} testID="share-card">
      <LinearGradient colors={gradient.sky} style={StyleSheet.absoluteFill} />
      {hasLogo() ? <View style={styles.centre}><Logo kind="lockup" width={width * 0.34} /></View> : <AppText variant="wordmark" tone="gold" style={styles.centre}>Ameesi</AppText>}
      <View pointerEvents="none">
        <ChartWheel chart={chart} lang={lang} size={wheel} selected={null} onSelect={() => {}} />
      </View>
      <View style={styles.centre}><CrescentDivider width={wheel / 2} /></View>
      {keyAspects(chart).length > 0 && <AppText variant="headline" tone="gold">{t("keyAspects", lang)}</AppText>}
      {keyAspects(chart).map((a) => (
        <View key={`${a.a}-${a.b}-${a.type}`} style={styles.row} testID="share-aspect">
          <View style={styles.tile}>
            <AppText variant="glyph" tone="gold">{`${bodyGlyph(a.a)} ${bodyGlyph(a.b)}`}</AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="headline">{`${term(`body.${a.a}`, lang)} – ${term(`body.${a.b}`, lang)}`}</AppText>
            <AppText variant="bodySm" tone="textMuted">{term(`aspect.${a.type}`, lang)}</AppText>
          </View>
        </View>
      ))}
      <AppText variant="caption" tone="textMuted" style={styles.centre}>{t("explainedBy", lang)}</AppText>
    </View>
  );
}

/** Capture the card as a PNG image and open the share sheet. Returns false if sharing isn't available. */
export async function shareCard(view: ViewRef | null): Promise<boolean> {
  if (!view || !(await Sharing.isAvailableAsync())) return false;
  const uri = await captureRef(view, { format: "png", quality: 1, result: "tmpfile", width: SHARE_IMAGE_WIDTH,
    fileName: "ameesi-chart" });
  await Sharing.shareAsync(uri.startsWith("file://") ? uri : `file://${uri}`,
    { mimeType: "image/png", UTI: "public.png", dialogTitle: "Ameesi" });
  return true;
}

const styles = StyleSheet.create({
  card: { alignSelf: "center", padding: space[5], gap: space[3], backgroundColor: colors.bg, overflow: "hidden",
          borderRadius: radius.lg, borderWidth: 1, borderColor: colors.glassEdge },
  centre: { alignSelf: "center", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  tile: { paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.md, backgroundColor: colors.wheelNight,
          borderWidth: 1, borderColor: colors.glassEdge },
  flex: { flex: 1 },
});
