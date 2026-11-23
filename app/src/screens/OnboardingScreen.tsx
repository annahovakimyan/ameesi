import { ScrollView, StyleSheet, View } from "react-native";
import type { Lang } from "../api/types";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { t } from "../i18n";
import { colors, radius, space } from "../theme";

export const LANGUAGE_NAMES: Record<Lang, string> = { hy: "Հայերեն", en: "English", ru: "Русский" };

/** First launch (PRD journey 1): choose a language, then a one-line note that astrology is symbolic. */
export function OnboardingScreen({ lang, onLang, onContinue }: {
  lang: Lang; onLang: (l: Lang) => void; onContinue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.hero}>
        <AppText variant="wordmark" accessibilityRole="header">Ameesi</AppText>
        <AppText variant="title" tone="gold" testID="tagline">{t("tagline", lang)}</AppText>
      </View>
      <View style={styles.card}>
      <View style={styles.section} accessibilityRole="radiogroup">
        <AppText variant="headline">{t("chooseLanguage", lang)}</AppText>
        {(["hy", "en", "ru"] as const).map((l) => (
          <Checkbox key={l} radio testID={`lang-${l}`} label={LANGUAGE_NAMES[l]} checked={lang === l} onPress={() => onLang(l)} />
        ))}
      </View>
      <AppText tone="textMuted" testID="symbolic-note">{t("symbolic", lang)}</AppText>
      </View>
      <Button testID="onboarding-continue" label={t("continue", lang)} onPress={onContinue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[12], gap: space[8] },
  section: { gap: space[2] },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[4], gap: space[6],
          borderWidth: 1, borderColor: colors.glassEdge },
  hero: { gap: space[2], paddingTop: space[12] },
});
