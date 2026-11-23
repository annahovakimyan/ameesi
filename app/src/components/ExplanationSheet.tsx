import { ScrollView, StyleSheet, View } from "react-native";
import type { BodyId, Chart, Lang } from "../api/types";
import { bodyFlags, placement } from "../chartText";
import { entriesFor, type EntryRef } from "../content/entryIds";
import { useContent } from "../content/source";
import { bodyGlyph, formatDegrees, signGlyph } from "../format";
import { houseId, houseTerm, inTitle, retroTitle, t, term } from "../i18n";
import type { Selection } from "../selection";
import { colors, radius, space } from "../theme";
import { AppText, Icon } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { CrescentDivider } from "./Ornaments";
import { Button } from "./Button";

type Header = { glyph?: string; title: string; facts: string };

function header(sel: Selection, chart: Chart, lang: Lang): Header {
  switch (sel.kind) {
    case "body": {
      const b = chart.bodies.find((x) => x.id === sel.id)!;
      return { glyph: bodyGlyph(b.id), title: term(`body.${b.id}`, lang),
        facts: [placement(b.sign, b.sign_deg, b.house, lang), ...bodyFlags(b, lang)].join(" · ") };
    }
    case "angle": {
      const a = chart.angles![sel.id];
      return { glyph: signGlyph(a.sign), title: term(`angle.${sel.id}`, lang), facts: placement(a.sign, a.sign_deg, null, lang) };
    }
    case "aspect": {
      const asp = findAspect(chart, sel)!;
      return { glyph: `${bodyGlyph(sel.a)} ${bodyGlyph(sel.b)}`,
        title: `${term(`body.${sel.a}`, lang)} – ${term(`body.${sel.b}`, lang)}`,
        facts: `${term(`aspect.${sel.type}`, lang)} · ${t("orb", lang, { orb: formatDegrees(asp.orb) })}` };
    }
    case "house": {
      const h = chart.houses?.[sel.n - 1];
      return { title: houseTerm(sel.n, lang), facts: h ? placement(h.sign, h.cusp_lon % 30, null, lang) : "" };
    }
    case "stellium": {
      const s = sel.stellium;
      const where = typeof s.where === "number" ? houseTerm(s.where, lang) : term(`sign.${s.where}`, lang);
      return { title: `${term("concept.stellium", lang)} · ${where}`,
        facts: s.members.map((m) => term(`body.${m}`, lang)).join(", ") };
    }
  }
}

function heading(e: EntryRef, lang: Lang): string {
  switch (e.kind) {
    case "sign": return inTitle(`body.${e.body}`, `sign.${e.sign}`, lang);
    case "house": return inTitle(`body.${e.body}`, houseId(e.house), lang);
    case "retro": return retroTitle(`body.${e.body}`, lang);
    case "angle": return inTitle(`angle.${e.angle}`, `sign.${e.sign}`, lang);
    case "aspect": return `${term(`body.${e.a}`, lang)} – ${term(`body.${e.b}`, lang)} · ${term(`aspect.${e.type}`, lang)}`;
    case "stellium": return `${term("concept.stellium", lang)} · ${
      typeof e.where === "number" ? houseTerm(e.where, lang) : term(`sign.${e.where}`, lang)}`;
    case "basic": {
      const what = e.body ? term(`body.${e.body}`, lang) : e.angle ? term(`angle.${e.angle}`, lang)
        : e.aspect ? term(`aspect.${e.aspect}`, lang) : houseTerm(e.house!, lang);
      return `${term("category.basics", lang)} · ${what}`;
    }
  }
}

function findAspect(chart: Chart, sel: Extract<Selection, { kind: "aspect" }>) {
  return chart.aspects.find((a) => a.type === sel.type && ((a.a === sel.a && a.b === sel.b) || (a.a === sel.b && a.b === sel.a)));
}

function notices(sel: Selection, chart: Chart, lang: Lang): string[] {
  const approx = chart.time.confidence === "approximate";
  if (sel.kind === "body") {
    const b = chart.bodies.find((x) => x.id === sel.id)!;
    if (!b.uncertain) return [];
    return [t(approx ? "uncertainApprox" : "uncertainMoon", lang)];
  }
  if (sel.kind === "angle") return chart.angles?.[sel.id].uncertain ? [t("uncertainApprox", lang)] : [];
  if (sel.kind === "house") return chart.houses?.[sel.n - 1]?.uncertain ? [t("uncertainApprox", lang)] : [];
  if (sel.kind === "aspect") {
    const unsure = chart.aspects_uncertain.some((u) => u.type === sel.type &&
      ((u.a === sel.a && u.b === sel.b) || (u.a === sel.b && u.b === sel.a)));
    return unsure ? [t("uncertainAspect", lang)] : [];
  }
  return [];
}

function basisFacts(sel: Selection, chart: Chart, lang: Lang): string[] {
  const system = chart.meta.house_system_used ? t(chart.meta.house_system_used, lang) : null;
  const zodiac = t("calcDetailsNoHouses", lang, { tzdata: chart.meta.tzdata });
  if (sel.kind === "aspect") {
    const a = findAspect(chart, sel)!;
    return [`${term(`aspect.${a.type}`, lang)} ${a.exact_angle}° · ${t("separation", lang, { sep: formatDegrees(a.separation) })} · ${
      t("orb", lang, { orb: formatDegrees(a.orb) })}`, zodiac];
  }
  if (sel.kind === "body") {
    const b = chart.bodies.find((x) => x.id === sel.id)!;
    return [`${term(`body.${b.id}`, lang)} ${b.lon.toFixed(2)}° · ${placement(b.sign, b.sign_deg, b.house, lang, false)}`,
      [system, zodiac].filter(Boolean).join(" · ")];
  }
  return [[system, zodiac].filter(Boolean).join(" · ")];
}

function related(sel: Selection, chart: Chart, lang: Lang): { label: string; sel: Selection }[] {
  const bodyButton = (id: BodyId) => ({ label: `${bodyGlyph(id)} ${term(`body.${id}`, lang)}`, sel: { kind: "body", id } as Selection });
  switch (sel.kind) {
    case "body":
      return chart.aspects.filter((a) => a.a === sel.id || a.b === sel.id).map((a) => {
        const other = a.a === sel.id ? a.b : a.a;
        return { label: `${term(`aspect.${a.type}`, lang)} · ${term(`body.${other}`, lang)}`,
          sel: { kind: "aspect", a: a.a, b: a.b, type: a.type } };
      });
    case "aspect": return [bodyButton(sel.a), bodyButton(sel.b)];
    case "house": return chart.bodies.filter((b) => b.house === sel.n).map((b) => bodyButton(b.id));
    case "stellium": return sel.stellium.members.map(bodyButton);
    case "angle": return [];
  }
}

/** Tap-to-explain: the explanation of one chart element, with its astrological basis. */
export function ExplanationSheet({ chart, lang, selection, onSelect, onClose }: {
  chart: Chart; lang: Lang; selection: Selection | null; onSelect: (s: Selection) => void; onClose: () => void;
}) {
  const content = useContent();
  if (!selection) return <BottomSheet visible={false} onClose={onClose} closeLabel={t("close", lang)} expandLabel={t("expand", lang)}>{null}</BottomSheet>;

  const h = header(selection, chart, lang);
  const refs = entriesFor(selection, chart);
  const sections = refs.map((ref) => ({ ref, entry: content.get(ref.id, lang) })).filter((s) => s.entry);
  const links = related(selection, chart, lang);

  return (
    <BottomSheet visible onClose={onClose} closeLabel={t("close", lang)} expandLabel={t("expand", lang)}
      testID="explanation-sheet">
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          {h.glyph && <AppText variant="glyphLg" tone="gold">{h.glyph}</AppText>}
          <AppText variant="titleLg" accessibilityRole="header">{h.title}</AppText>
          <AppText variant="bodySm" tone="textMuted">{h.facts}</AppText>
          <CrescentDivider width={120} />
        </View>

        {notices(selection, chart, lang).map((n) => (
          <View key={n} style={styles.notice} accessibilityRole="alert">
            <Icon char="ⓘ" tone="gold" />
            <AppText variant="bodySm" style={styles.flex}>{n}</AppText>
          </View>
        ))}

        {sections.length === 0 && <AppText tone="textMuted">{t("noExplanation", lang)}</AppText>}
        {sections.map(({ ref, entry }) => (
          <View key={ref.id} style={styles.section} testID={`entry-${ref.id}`}>
            <AppText variant="headline">{heading(ref, lang)}</AppText>
            <AppText variant="body">{entry!.text}</AppText>
          </View>
        ))}

        <View style={styles.section}>
          <AppText variant={lang === "hy" ? "label" : "overline"} tone="textMuted">
            {lang === "hy" ? t("basis", lang) : t("basis", lang).toUpperCase()}
          </AppText>
          {basisFacts(selection, chart, lang).map((f) => <AppText key={f} variant="bodySm" tone="textMuted">{f}</AppText>)}
          <AppText variant="caption" tone="textFaint" testID="entry-ids">
            {t("entriesUsed", lang, { ids: sections.map((s) => s.ref.id).join(", ") || "—" })}
          </AppText>
          <AppText variant="bodySm" tone="textMuted">{t("symbolic", lang)}</AppText>
        </View>

        {links.length > 0 && (
          <View style={styles.section}>
            <AppText variant="headline">{t("related", lang)}</AppText>
            <View style={styles.links}>
              {links.map((l) => <Button key={l.label} kind="secondary" label={l.label} onPress={() => onSelect(l.sel)} />)}
            </View>
          </View>
        )}
        <Button kind="secondary" label={t("close", lang)} onPress={onClose} testID="sheet-close" />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space[5], paddingBottom: space[8], gap: space[6] },
  header: { gap: space[2] },
  section: { gap: space[2] },
  notice: { flexDirection: "row", gap: space[2], padding: space[3], borderWidth: 1, borderColor: colors.border,
            borderRadius: radius.md, backgroundColor: colors.surface },
  flex: { flex: 1 },
  links: { gap: space[2] },
});
