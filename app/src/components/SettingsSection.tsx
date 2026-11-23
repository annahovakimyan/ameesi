import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { version as appVersion } from "../../package.json";
import type { HouseSystem, Lang } from "../api/types";
import { t } from "../i18n";
import { LANGUAGE_NAMES } from "../screens/OnboardingScreen";
import { space } from "../theme";
import { AppText, Icon } from "./AppText";
import { Button } from "./Button";
import { Segmented } from "./Segmented";

export const SOURCE_CODE_URL = "https://github.com/annahovakimyan/ameesi";
const THIRD_PARTY = "Swiss Ephemeris © Astrodienst AG (AGPL) · Place data © GeoNames (CC BY 4.0) · "
  + "Noto fonts © The Noto Project Authors (SIL Open Font License 1.1)";

/** Settings and About, in the Profiles tab (PRD section 6). */
export function SettingsSection({ lang, houseSystem, engine, onLang, onHouseSystem, onDeleteAll }: {
  lang: Lang; houseSystem: HouseSystem; engine?: string;
  onLang: (l: Lang) => void; onHouseSystem: (h: HouseSystem) => void; onDeleteAll: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText variant="title" accessibilityRole="header">{t("settings", lang)}</AppText>

      <View style={styles.section}>
        <AppText variant="headline">{t("language", lang)}</AppText>
        <Segmented testID="settings-lang" value={lang} onChange={onLang}
          options={(["hy", "en", "ru"] as const).map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))} />
      </View>

      <View style={styles.section}>
        <AppText variant="headline">{t("houseSystem", lang)}</AppText>
        <Segmented testID="settings-houses" value={houseSystem} onChange={onHouseSystem}
          options={(["placidus", "whole_sign"] as const).map((h) => ({ value: h, label: t(h, lang) }))} />
        <AppText variant="bodySm" tone="textMuted">{t("houseSystemNote", lang)}</AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="headline">{t("about", lang)}</AppText>
        <AppText variant="bodySm" tone="textMuted">{t("symbolic", lang)}</AppText>
        <AppText variant="bodySm" tone="textMuted">{t("licenseAgpl", lang)}</AppText>
        <Button kind="secondary" testID="source-code" label={t("sourceCode", lang)}
          onPress={() => { Linking.openURL(SOURCE_CODE_URL).catch(() => {}); }} />
        <AppText variant="caption" tone="textFaint">{THIRD_PARTY}</AppText>
        <AppText variant="caption" tone="textFaint" testID="versions">
          {t("versions", lang, { app: appVersion, engine: engine ?? "—" })}
        </AppText>
      </View>

      <View style={styles.section}>
        {confirming ? (
          <>
            <AppText variant="bodySm" accessibilityRole="alert"><Icon char="⚠" tone="rose" /> {t("deleteAllConfirm", lang)}</AppText>
            <Button kind="secondary" testID="confirm-delete-all" label={t("deleteAll", lang)}
              onPress={() => { setConfirming(false); onDeleteAll(); }} />
            <Button kind="secondary" label={t("cancel", lang)} onPress={() => setConfirming(false)} />
          </>
        ) : (
          <Button kind="secondary" testID="delete-all" label={t("deleteAll", lang)} onPress={() => setConfirming(true)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[6] },
  section: { gap: space[2] },
});
