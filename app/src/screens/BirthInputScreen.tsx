import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ApiError, calculateChart } from "../api/client";
import type { Chart, Lang } from "../api/types";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { PickerField } from "../components/PickerField";
import { PlaceSearch } from "../components/PlaceSearch";
import { Segmented } from "../components/Segmented";
import { buildRequest, emptyForm, isComplete, offsetFor, type BirthForm } from "../birthForm";
import { hhmm, isoDate } from "../format";
import { t } from "../i18n";
import { colors, MIN_TOUCH, radius, space } from "../theme";

export function BirthInputScreen({ lang, onChart }: { lang: Lang; onChart: (c: Chart) => void }) {
  const [form, setForm] = useState<BirthForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambiguous, setAmbiguous] = useState<Chart | null>(null);
  const set = (patch: Partial<BirthForm>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(override: number | null = null) {
    setBusy(true);
    setError(null);
    try {
      const chart = await calculateChart(buildRequest(form, override));
      if (chart.time.dst_ambiguity) setAmbiguous(chart);
      else {
        setAmbiguous(null);
        onChart(chart);
      }
    } catch (e) {
      setError(t(e instanceof ApiError && e.status === 0 ? "errorNetwork" : "errorGeneric", lang));
    } finally {
      setBusy(false);
    }
  }

  const timeField = (key: "time" | "windowFrom" | "windowTo", testID: string) => (
    <PickerField mode="time" value={form[key]} onChange={(d) => set({ [key]: d })}
      placeholder={t("chooseTime", lang)} display={hhmm} testID={testID} />
  );

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <AppText variant="display">{t("birthTitle", lang)}</AppText>

      <View style={styles.section}>
        <AppText variant="headline">{t("date", lang)}</AppText>
        <PickerField mode="date" value={form.date} onChange={(d) => set({ date: d })} placeholder={t("chooseDate", lang)}
          display={isoDate} testID="date-field" minimumDate={new Date(1800, 0, 1)} maximumDate={new Date()} />
      </View>

      <View style={styles.section}>
        <AppText variant="headline">{t("time", lang)}</AppText>
        <Segmented testID="confidence" value={form.confidence} onChange={(confidence) => set({ confidence })}
          options={(["exact", "approximate", "unknown"] as const).map((v) => ({ value: v, label: t(v, lang) }))} />
        {form.confidence === "exact" && timeField("time", "time-field")}
        {form.confidence === "approximate" && (
          <View style={styles.window}>
            <View style={styles.flex}><AppText variant="bodySm" tone="textMuted">{t("from", lang)}</AppText>{timeField("windowFrom", "from-field")}</View>
            <View style={styles.flex}><AppText variant="bodySm" tone="textMuted">{t("to", lang)}</AppText>{timeField("windowTo", "to-field")}</View>
          </View>
        )}
        {form.confidence === "unknown" && <AppText variant="bodySm" tone="textMuted">{t("unknownTimeNote", lang)}</AppText>}
      </View>

      <View style={styles.section}>
        <AppText variant="headline">{t("place", lang)}</AppText>
        <PlaceSearch lang={lang} value={form.place} onChange={(place) => set({ place })} />
      </View>

      <Pressable testID="adult" accessibilityRole="checkbox" accessibilityState={{ checked: form.adult }}
        onPress={() => set({ adult: !form.adult })} style={styles.check}>
        <View style={[styles.box, form.adult && { backgroundColor: colors.gold, borderColor: colors.gold }]}>
          {form.adult && <AppText variant="label" tone="onGold">✓</AppText>}
        </View>
        <AppText>{t("adult", lang)}</AppText>
      </Pressable>

      {ambiguous?.time.dst_ambiguity && (
        <View style={styles.section}>
          <AppText tone="gold">{t("needsConfirmation", lang)}</AppText>
          {ambiguous.time.dst_ambiguity.candidates_utc.map((utc) => {
            const minutes = offsetFor(ambiguous.time.local, utc);
            const sign = minutes >= 0 ? "+" : "−";
            const label = `UTC${sign}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
            return <Button key={utc} kind="secondary" label={label} onPress={() => submit(minutes)} testID={`offset-${minutes}`} />;
          })}
        </View>
      )}

      {error && <AppText tone="rose" accessibilityRole="alert">⚠︎ {error}</AppText>}
      {busy ? <ActivityIndicator color={colors.gold} style={{ minHeight: MIN_TOUCH }} />
        : <Button testID="submit" label={t("getChart", lang)} disabled={!isComplete(form)} onPress={() => submit()} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  section: { gap: space[2] },
  window: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1, gap: space[1] },
  check: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: MIN_TOUCH },
  box: { width: space[6], height: space[6], borderRadius: radius.sm / 2, borderWidth: 2, borderColor: colors.border,
         alignItems: "center", justifyContent: "center" },
});
