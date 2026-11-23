import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ApiError, calculateChart } from "../api/client";
import type { Chart, ChartRequest, Lang, Place } from "../api/types";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { PickerField } from "../components/PickerField";
import { PlaceSearch } from "../components/PlaceSearch";
import { Segmented } from "../components/Segmented";
import { buildRequest, emptyForm, isComplete, offsetFor, type BirthForm, type Purpose } from "../birthForm";
import { hhmm, isoDate } from "../format";
import { t } from "../i18n";
import { colors, MIN_TOUCH, radius, space, textStyle } from "../theme";

export interface BirthResult { chart: Chart; request: ChartRequest; place: Place; form: BirthForm }

/** Birth details for your own chart (18+ confirmation) or someone else's (name and consent).
 *  With `initial`, edits saved details. */
export function BirthInputScreen({ lang, onChart, purpose = "self", initial, editing, onCancel }: {
  lang: Lang; onChart: (r: BirthResult) => void; purpose?: Purpose; initial?: BirthForm; editing?: boolean;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<BirthForm>(initial ?? emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ambiguous, setAmbiguous] = useState<Chart | null>(null);
  const set = (patch: Partial<BirthForm>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(override: number | null = null) {
    setBusy(true);
    setError(null);
    try {
      const request = buildRequest(form, override, purpose);
      const chart = await calculateChart(request);
      if (chart.time.dst_ambiguity) setAmbiguous(chart);
      else {
        setAmbiguous(null);
        onChart({ chart, request, place: form.place!, form });
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
      <AppText variant="display">
        {t(editing ? "editBirthTitle" : purpose === "other" ? "theirBirthTitle" : "birthTitle", lang)}
      </AppText>

      {purpose === "other" && (
        <View style={styles.section}>
          <AppText variant="headline">{t("name", lang)}</AppText>
          <TextInput testID="name-input" value={form.name} onChangeText={(name) => set({ name })}
            placeholder={t("nameHint", lang)} placeholderTextColor={colors.textFaint} autoCorrect={false}
            style={[styles.input, textStyle("body")]} accessibilityLabel={t("name", lang)} />
        </View>
      )}

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

      {purpose === "self" ? (
        <Checkbox testID="adult" label={t("adult", lang)} checked={form.adult} onPress={() => set({ adult: !form.adult })} />
      ) : (
        <View style={styles.section} accessibilityRole="radiogroup">
          <AppText variant="headline">{t("consentTitle", lang)}</AppText>
          <Checkbox radio testID="consent-permission" label={t("consentPermission", lang)}
            checked={form.consent === "permission"} onPress={() => set({ consent: "permission" })} />
          <Checkbox radio testID="consent-guardian" label={t("consentGuardian", lang)}
            checked={form.consent === "guardian"} onPress={() => set({ consent: "guardian" })} />
        </View>
      )}

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
        : <Button testID="submit" label={t(editing ? "save" : purpose === "other" ? "getTheirChart" : "getChart", lang)} disabled={!isComplete(form, purpose)}
            onPress={() => submit()} />}
      {onCancel && !busy && <Button kind="secondary" testID="cancel" label={t("cancel", lang)} onPress={onCancel} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  section: { gap: space[2] },
  window: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1, gap: space[1] },
  input: {
    minHeight: MIN_TOUCH, paddingHorizontal: space[4], color: colors.ivory,
    backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
});
