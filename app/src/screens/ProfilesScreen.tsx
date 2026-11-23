import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Lang } from "../api/types";
import { AppText, Icon } from "../components/AppText";
import { Button } from "../components/Button";
import { Row } from "../components/ChartList";
import { SettingsSection } from "../components/SettingsSection";
import type { HouseSystem } from "../api/types";
import { formatDate } from "../format";
import { t } from "../i18n";
import { placeNameIn, type Profile } from "../profiles/profiles";
import { colors, radius, space } from "../theme";

export const profileName = (p: Profile, lang: Lang) => (p.kind === "self" ? t("me", lang) : p.name);

function birthSummary(p: Profile, lang: Lang): string {
  const r = p.request;
  const time = r.time ?? (r.time_window ? `${r.time_window.from}–${r.time_window.to}` : "—");
  return `${formatDate(r.date)} · ${time} · ${placeNameIn(p, lang)}`;
}

export function ProfilesScreen({ lang, profiles, activeId, canAddMore, onOpen, onAdd, onEdit, onDelete, onExport,
  houseSystem, onLang, onHouseSystem, onDeleteAll }: {
  lang: Lang; profiles: Profile[]; activeId: string | null; canAddMore: boolean;
  onOpen: (id: string) => void; onAdd: () => void; onEdit: (id: string) => void; onDelete: (id: string) => void;
  onExport: () => void; houseSystem: HouseSystem; onLang: (l: Lang) => void; onHouseSystem: (h: HouseSystem) => void;
  onDeleteAll: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <AppText variant="titleLg" accessibilityRole="header">{t("tabProfiles", lang)}</AppText>

      {profiles.map((p) => (
        <View key={p.id} style={[styles.card, p.id === activeId && styles.active]} testID={`profile-${p.id}`}>
          <Row title={profileName(p, lang)} subtitle={birthSummary(p, lang)} onPress={() => onOpen(p.id)} testID={`open-${p.id}`} />
          {confirming === p.id ? (
            <View style={styles.actions}>
              <AppText variant="bodySm" accessibilityRole="alert">
                <Icon char="⚠" /> {t("deleteConfirm", lang, { name: profileName(p, lang) })}
              </AppText>
              <Button kind="secondary" testID={`confirm-delete-${p.id}`} label={t("delete", lang)}
                onPress={() => { setConfirming(null); onDelete(p.id); }} />
              <Button kind="secondary" label={t("cancel", lang)} onPress={() => setConfirming(null)} />
            </View>
          ) : (
            <View style={[styles.actions, styles.row]}>
              <View style={styles.flex}><Button kind="secondary" testID={`edit-${p.id}`} label={t("edit", lang)} onPress={() => onEdit(p.id)} /></View>
              <View style={styles.flex}><Button kind="secondary" testID={`delete-${p.id}`} label={t("delete", lang)} onPress={() => setConfirming(p.id)} /></View>
            </View>
          )}
        </View>
      ))}

      <View style={styles.section}>
        <AppText variant="bodySm" tone="textMuted">{t(canAddMore ? "addSomeoneHint" : "limitReached", lang)}</AppText>
        <Button testID="add-someone" label={t("addSomeone", lang)} disabled={!canAddMore} onPress={onAdd} />
      </View>

      <View style={styles.section}>
        <Button kind="secondary" testID="export" label={t("exportData", lang)} onPress={onExport} />
        <AppText variant="caption" tone="textFaint">{t("storedOnPhone", lang)}</AppText>
      </View>

      <SettingsSection lang={lang} houseSystem={houseSystem} onLang={onLang} onHouseSystem={onHouseSystem}
        onDeleteAll={onDeleteAll} engine={profiles.find((p) => p.chart)?.chart?.meta.engine} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space[4], paddingTop: space[8], gap: space[6] },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
  active: { borderWidth: 1, borderColor: colors.gold },
  actions: { padding: space[4], gap: space[2] },
  row: { flexDirection: "row" },
  flex: { flex: 1 },
  section: { gap: space[2] },
});
