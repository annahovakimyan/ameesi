import { useEffect, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, View } from "react-native";
import { calculateChart } from "../api/client";
import type { Lang } from "../api/types";
import { formFromProfile, type Purpose } from "../birthForm";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { TabBar } from "../components/TabBar";
import { t } from "../i18n";
import { canAdd, exportJson, newProfile, removeProfile, upsertProfile, type Profile } from "../profiles/profiles";
import type { ProfileStore } from "../profiles/store";
import { colors, space } from "../theme";
import { BirthInputScreen, type BirthResult } from "./BirthInputScreen";
import { ChartScreen } from "./ChartScreen";
import { ProfilesScreen, profileName } from "./ProfilesScreen";

type Editor = { purpose: Purpose; profileId?: string };

/** The app after language choice: first your own birth details, then Chart and Profiles tabs. */
export function Root({ lang, store, now = () => new Date().toISOString() }: {
  lang: Lang; store: ProfileStore; now?: () => string;
}) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"chart" | "profiles">("chart");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [calc, setCalc] = useState<"idle" | "busy" | "error">("idle");

  useEffect(() => {
    store.load().then((ps) => {
      setProfiles(ps);
      setActiveId((ps.find((p) => p.kind === "self") ?? ps[0])?.id ?? null);
    });
  }, [store]);

  const commit = (next: Profile[]) => {
    setProfiles(next);
    store.save(next).catch(() => {});
  };

  const active = profiles?.find((p) => p.id === activeId) ?? null;

  // A profile without a saved chart (new device, or birth details edited) is recalculated on opening.
  const recalc = (p: Profile) => {
    setCalc("busy");
    calculateChart(p.request)
      .then((chart) => {
        setCalc("idle");
        setProfiles((cur) => {
          const next = upsertProfile(cur ?? [], { ...p, chart }, now(), true);
          store.save(next).catch(() => {});
          return next;
        });
      })
      .catch(() => setCalc("error"));
  };
  useEffect(() => {
    if (active && !active.chart && calc === "idle" && tab === "chart" && !editor) recalc(active);
  }, [active, tab, editor]);

  if (!profiles) return <ActivityIndicator color={colors.gold} style={styles.fill} />;

  const saveFromForm = ({ chart, request, place, form }: BirthResult) => {
    const at = now();
    const existing = editor?.profileId ? profiles.find((p) => p.id === editor.profileId) : undefined;
    const purpose = editor?.purpose ?? "self";
    const profile = existing
      ? { ...existing, name: form.name.trim() || existing.name, request, place, chart,
          consent: existing.kind === "other" && form.consent ? { kind: form.consent, confirmedAt: at } : existing.consent }
      : newProfile({ kind: purpose, name: form.name, request, place, chart, now: at,
          consent: purpose === "other" && form.consent ? { kind: form.consent, confirmedAt: at } : undefined });
    commit(upsertProfile(profiles, profile, at, true));
    setActiveId(profile.id);
    setEditor(null);
    setTab("chart");
  };

  // First launch (or after deleting everything): your own birth details.
  if (editor || profiles.length === 0) {
    const editing = editor?.profileId ? profiles.find((p) => p.id === editor.profileId) : undefined;
    return (
      <BirthInputScreen key={editor?.profileId ?? editor?.purpose ?? "first"} lang={lang} purpose={editor?.purpose ?? "self"}
        initial={editing ? formFromProfile(editing) : undefined} editing={!!editing} onChart={saveFromForm}
        onCancel={profiles.length > 0 ? () => setEditor(null) : undefined} />
    );
  }

  const addOther = canAdd(profiles, "other");
  return (
    <View style={styles.fill}>
      <View style={styles.fill}>
        {tab === "profiles" ? (
          <ProfilesScreen lang={lang} profiles={profiles} activeId={activeId} canAddMore={addOther.ok}
            onOpen={(id) => { setActiveId(id); setCalc("idle"); setTab("chart"); }}
            onAdd={() => setEditor({ purpose: canAdd(profiles, "self").ok ? "self" : "other" })}
            onEdit={(id) => setEditor({ purpose: profiles.find((p) => p.id === id)!.kind, profileId: id })}
            onDelete={(id) => {
              const next = removeProfile(profiles, id);
              commit(next);
              if (id === activeId) setActiveId(next[0]?.id ?? null);
            }}
            onExport={() => { Share.share({ message: exportJson(profiles, now()), title: "Ameesi" }).catch(() => {}); }} />
        ) : active?.chart ? (
          <ChartScreen key={active.id} chart={active.chart} lang={lang} title={profileName(active, lang)} />
        ) : (
          <View style={[styles.fill, styles.centre]}>
            {calc === "error" ? (
              <>
                <AppText tone="rose" accessibilityRole="alert">⚠︎ {t("errorNetwork", lang)}</AppText>
                <Button kind="secondary" testID="retry" label={t("retry", lang)} onPress={() => active && recalc(active)} />
              </>
            ) : (
              <>
                <ActivityIndicator color={colors.gold} />
                <AppText tone="textMuted">{t("calculating", lang)}</AppText>
              </>
            )}
          </View>
        )}
      </View>
      <TabBar value={tab} onChange={setTab}
        tabs={[{ value: "chart", label: t("tabChart", lang) }, { value: "profiles", label: t("tabProfiles", lang) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centre: { alignItems: "center", justifyContent: "center", gap: space[4], padding: space[4] },
});
