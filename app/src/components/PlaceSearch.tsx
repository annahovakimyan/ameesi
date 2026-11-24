import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { searchPlaces } from "../api/client";
import { offlinePlaces } from "../sample/places";
import type { Lang, Place } from "../api/types";
import { t } from "../i18n";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";
import { OrbitLoader } from "./Ornaments";
import { TextField } from "./TextField";

const DEBOUNCE_MS = 250;
const SLOW_MS = 4000; // after this, say the server may be waking up (free hosting sleeps when idle)

export function placeLabel(p: Place): string {
  return [p.name, p.region, p.country].filter(Boolean).join(", ");
}

export function PlaceSearch({ lang, value, onChange, onFocus, onResults }: {
  lang: Lang; value: Place | null; onChange: (p: Place | null) => void;
  onFocus?: () => void; // e.g. scroll the field into view above the keyboard
  onResults?: () => void; // results appeared below the field
}) {
  const [query, setQuery] = useState(value ? placeLabel(value) : "");
  const [results, setResults] = useState<Place[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false); // development: showing the built-in test places
  const [searching, setSearching] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (value || query.trim().length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      setSearching(true);
      slowTimer = setTimeout(() => setSlow(true), SLOW_MS);
      searchPlaces(query, lang, controller.signal)
        .finally(() => { if (!controller.signal.aborted) { clearTimeout(slowTimer); setSearching(false); setSlow(false); } })
        .then((r) => { setFailed(false); setOffline(false); setResults(r.results); onResults?.(); })
        .catch((e) => {
          if (e?.name === "AbortError") return; // the user kept typing
          if (__DEV__) {
            // Development without a server: offer the built-in test places instead of an error.
            setFailed(false);
            setOffline(true);
            setResults(offlinePlaces(query, lang));
            onResults?.();
            return;
          }
          setResults(null);
          setFailed(true);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(slowTimer);
      controller.abort();
    };
  }, [query, lang, value]);

  return (
    <View>
      <TextField
        testID="place-input"
        value={query}
        onChangeText={(q) => {
          setQuery(q);
          if (value) onChange(null);
        }}
        placeholder={t("placeHint", lang)}
        onFocus={onFocus}
        autoCorrect={false}
        accessibilityLabel={t("place", lang)}
      />
      {searching && (
        <View style={styles.searching} testID="place-searching" accessibilityRole="progressbar" accessibilityLiveRegion="polite">
          <OrbitLoader size={space[6]} />
          <AppText variant="bodySm" tone="textMuted" style={styles.flex}>
            {t(slow ? "serverWaking" : "searchingPlaces", lang)}
          </AppText>
        </View>
      )}
      {failed && (
        <AppText variant="bodySm" tone="rose" accessibilityRole="alert" testID="place-error" style={styles.error}>
          {t("placeSearchFailed", lang)}
        </AppText>
      )}
      {offline && results && (
        <AppText variant="caption" tone="gold" testID="offline-places" style={styles.error}>{t("offlinePlaces", lang)}</AppText>
      )}
      {results && (
        <View style={styles.results}>
          {results.length === 0 && <AppText tone="textMuted" style={styles.row}>{t("noPlaces", lang)}</AppText>}
          {results.map((p) => (
            <Pressable
              key={p.geonames_id}
              testID={`place-${p.geonames_id}`}
              accessibilityRole="button"
              onPress={() => {
                Keyboard.dismiss();
                onChange(p);
                setQuery(placeLabel(p));
                setResults(null);
              }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <AppText variant="headline">{p.name}</AppText>
              <AppText variant="bodySm" tone="textMuted">
                {[p.region, p.country].filter(Boolean).join(", ")}
                {p.former_names_matched.length > 0 &&
                  ` · ${t("formerly", lang, { name: p.former_names_matched.map((f) => f.name).join(", ") })}`}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: space[2] },
  searching: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: space[2] },
  flex: { flex: 1 },
  results: { marginTop: space[2], backgroundColor: colors.field, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.glassEdge },
  row: { paddingHorizontal: space[4], paddingVertical: space[3], minHeight: MIN_TOUCH, justifyContent: "center",
         borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.glassEdge },
});
