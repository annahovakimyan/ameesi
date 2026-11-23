import { ScrollView, StyleSheet, View } from "react-native";
import type { Lang } from "../api/types";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { t } from "../i18n";
import { space } from "../theme";

export const LANGUAGE_NAMES: Record<Lang, string> = { hy: "Հայերեն", en: "English", ru: "Русский" };

/** First launch (PRD journey 1): choose a language, then a one-line note that astrology is symbolic. */
export function OnboardingScreen({ lang, onLang, onContinue }: {
  lang: Lang; onLang: (l: Lang) => void; onContinue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <AppText variant="display" accessibilityRole="header">Ameesi</AppText>
      <View style={styles.section} accessibilityRole="radiogroup">
        <AppText variant="headline">{t("chooseLanguage", lang)}</AppText>
        {(["hy", "en", "ru"] as const).map((l) => (
          <Checkbox key={l} radio testID={`lang-${l}`} label={LANGUAGE_NAMES[l]} checked={lang === l} onPress={() => onLang(l)} />
        ))}
      </View>
      <AppText tone="textMuted" testID="symbolic-note">{t("symbolic", lang)}</AppText>
      <Button testID="onboarding-continue" label={t("continue", lang)} onPress={onContinue} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[12], gap: space[8] },
  section: { gap: space[2] },
});
