import { StyleSheet, View } from "react-native";
import type { Chart, Lang } from "../api/types";
import { inTitle, t } from "../i18n";
import type { Selection } from "../selection";
import { colors, radius, space } from "../theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

/** The "Start here" steps for a chart: Sun, Moon and, with a known birth time, the Ascendant. */
export function tourSteps(chart: Chart, lang: Lang): { sel: Selection; title: string }[] {
  const body = (id: "sun" | "moon") => {
    const b = chart.bodies.find((x) => x.id === id)!;
    return { sel: { kind: "body", id } as Selection, title: inTitle(`body.${id}`, `sign.${b.sign}`, lang) };
  };
  const steps = [body("sun"), body("moon")];
  if (chart.angles) {
    steps.push({ sel: { kind: "angle", id: "asc" }, title: inTitle("angle.asc", `sign.${chart.angles.asc.sign}`, lang) });
  }
  return steps;
}

/** One step of the tour. The meaning itself comes from the reviewed entries, via the explanation sheet. */
export function TourCard({ lang, step, total, title, onRead, onNext, onSkip }: {
  lang: Lang; step: number; total: number; title: string;
  onRead: () => void; onNext: () => void; onSkip: () => void;
}) {
  const last = step === total;
  return (
    <View style={styles.card} testID="tour-card">
      <AppText variant={lang === "hy" ? "label" : "overline"} tone="gold">
        {`${lang === "hy" ? t("startHere", lang) : t("startHere", lang).toUpperCase()} · ${t("stepOf", lang, { n: step, total })}`}
      </AppText>
      <AppText variant="title" testID="tour-title">{title}</AppText>
      <Button testID="tour-read" label={t("readMeaning", lang)} onPress={onRead} />
      <View style={styles.row}>
        {!last && (
          <View style={styles.flex}><Button kind="secondary" testID="tour-skip" label={t("skipTour", lang)} onPress={onSkip} /></View>
        )}
        <View style={styles.flex}>
          <Button kind="secondary" testID="tour-next" label={t(last ? "done" : "next", lang)} onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

/** After the tour: suggest adding someone (FR-11). */
export function AddSomeonePrompt({ lang, onAdd, onDismiss }: { lang: Lang; onAdd: () => void; onDismiss: () => void }) {
  return (
    <View style={[styles.card, styles.outlined]} testID="add-prompt">
      <AppText variant="headline">{t("addPromptTitle", lang)}</AppText>
      <AppText variant="bodySm" tone="textMuted">{t("addSomeoneHint", lang)}</AppText>
      <View style={styles.row}>
        <View style={styles.flex}><Button kind="secondary" testID="add-prompt-dismiss" label={t("notNow", lang)} onPress={onDismiss} /></View>
        <View style={styles.flex}><Button kind="secondary" testID="add-prompt-add" label={t("addSomeone", lang)} onPress={onAdd} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[4], gap: space[2], borderWidth: 1, borderColor: colors.glassEdge },
  row: { flexDirection: "row", gap: space[2] },
  flex: { flex: 1 },
  outlined: { backgroundColor: undefined, borderWidth: 1.5, borderColor: colors.border },
});
