import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { API_URL, ApiError, calculateChart, serverReachable } from "../api/client";
import type { Chart, ChartRequest, Lang, Place } from "../api/types";
import { AppText, Icon } from "../components/AppText";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { PickerField } from "../components/PickerField";
import { PlaceSearch } from "../components/PlaceSearch";
import { Segmented } from "../components/Segmented";
import { buildRequest, emptyForm, isComplete, missingFields, offsetFor, type BirthForm, type Purpose } from "../birthForm";
import { hhmm, isoDate } from "../format";
import { t } from "../i18n";
import { colors, MIN_TOUCH, radius, space, textStyle } from "../theme";

export interface BirthResult { chart: Chart; request: ChartRequest; place: Place; form: BirthForm }

/** Birth details for your own chart (18+ confirmation) or someone else's (name and consent).
 *  With `initial`, edits saved details. */
export function BirthInputScreen({ lang, onChart, purpose = "self", initial, editing, onCancel, houseSystem = "placidus" }: {
  lang: Lang; onChart: (r: BirthResult) => void; purpose?: Purpose; initial?: BirthForm; editing?: boolean;
  onCancel?: () => void; houseSystem?: BirthForm["houseSystem"];
}) {
  const [form, setForm] = useState<BirthForm>(initial ?? { ...emptyForm, houseSystem });
  const [review, setReview] = useState<BirthResult | null>(null);
  const [offline, setOffline] = useState(false);

  // Check the calculation server up front, so a wrong address or no connection is explained at once.
  useEffect(() => {
    let current = true;
    serverReachable().then((ok) => current && setOffline(!ok));
    return () => { current = false; };
  }, []);
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
        setReview({ chart, request, place: form.place!, form }); // FR-01: show time zone and UTC first
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

  if (review) {
    const tm = review.chart.time;
    const m = tm.utc_offset_minutes;
    const offset = `UTC${m >= 0 ? "+" : "−"}${String(Math.floor(Math.abs(m) / 60)).padStart(2, "0")}:${String(Math.abs(m) % 60).padStart(2, "0")}`;
    const line = (label: string, value: string, testID?: string) => (
      <View style={styles.reviewRow}>
        <AppText variant="bodySm" tone="textMuted">{label}</AppText>
        <AppText testID={testID}>{value}</AppText>
      </View>
    );
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <AppText variant="titleLg" accessibilityRole="header">{t("checkTitle", lang)}</AppText>
        <View style={styles.reviewCard}>
          {line(t("place", lang), [review.place.name, review.place.region, review.place.country].filter(Boolean).join(", "))}
          {line(t("timeZone", lang), review.place.tz)}
          {line(t("localTime", lang), tm.local.replace("T", " "), "review-local")}
          {line(t("utcTime", lang), `${tm.utc.replace("T", " ").replace("Z", "")} · ${offset}${
            tm.offset_source === "user_override" ? ` (${t("offsetSetByHand", lang)})` : ""}`, "review-utc")}
        </View>
        {tm.confidence === "unknown" && <AppText variant="bodySm" tone="textMuted">{t("noonNote", lang)}</AppText>}
        {tm.confidence === "approximate" && <AppText variant="bodySm" tone="textMuted">{t("windowNote", lang)}</AppText>}
        <Button testID="looks-right" label={t("looksRight", lang)} onPress={() => onChart(review)} />
        <Button kind="secondary" testID="change-details" label={t("changeDetails", lang)} onPress={() => setReview(null)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <AppText variant="display">
        {t(editing ? "editBirthTitle" : purpose === "other" ? "theirBirthTitle" : "birthTitle", lang)}
      </AppText>

      {offline && (
        <View style={styles.notice} accessibilityRole="alert" testID="server-offline">
          <AppText variant="bodySm"><Icon char="⚠" tone="rose" /> {t("errorNetwork", lang)}</AppText>
          {__DEV__ && (
            <AppText variant="caption" tone="textMuted" testID="server-dev-hint">
              {`Development: looking for the calculation server at ${API_URL}. Set EXPO_PUBLIC_API_URL in app/.env `
                + "to your computer's address (for example http://192.168.1.20:8000), start the server, and restart Expo with -c."}
            </AppText>
          )}
          <Button kind="secondary" testID="server-retry" label={t("retry", lang)}
            onPress={() => { serverReachable().then((ok) => setOffline(!ok)); }} />
        </View>
      )}

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

      {error && <AppText tone="rose" accessibilityRole="alert"><Icon char="⚠" tone="rose" /> {error}</AppText>}
      {busy ? <ActivityIndicator color={colors.gold} style={{ minHeight: MIN_TOUCH }} />
        : <Button testID="submit" label={t(editing ? "save" : purpose === "other" ? "getTheirChart" : "getChart", lang)} disabled={!isComplete(form, purpose)}
            onPress={() => submit()} />}
      {!busy && !isComplete(form, purpose) && (
        <AppText variant="bodySm" tone="textMuted" testID="still-needed">
          {t("stillNeeded", lang, { items: missingFields(form, purpose).map((k) => t(k, lang)).join(", ") })}
        </AppText>
      )}
      {onCancel && !busy && <Button kind="secondary" testID="cancel" label={t("cancel", lang)} onPress={onCancel} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  section: { gap: space[2] },
  window: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1, gap: space[1] },
  notice: { padding: space[4], gap: space[3], borderWidth: 1, borderColor: colors.rose, borderRadius: radius.md,
            backgroundColor: colors.surface },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[4], gap: space[3] },
  reviewRow: { gap: space[1] },
  input: {
    minHeight: MIN_TOUCH, paddingHorizontal: space[4], color: colors.ivory,
    backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
});
