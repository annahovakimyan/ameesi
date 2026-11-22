import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";
import type { AspectType, BodyId, Chart, Lang, SignId } from "../api/types";
import { bodyLabel } from "../chartText";
import { bodyGlyph, signGlyph } from "../format";
import { colors, MIN_TOUCH, textStyle } from "../theme";
import { polar, screenAngle, spread } from "../wheel/geometry";
import { AppText } from "./AppText";

const SIGNS: SignId[] = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio",
  "sagittarius", "capricorn", "aquarius", "pisces"];

// Ring radii as fractions of the wheel's radius.
const R = { outer: 0.98, signInner: 0.82, signGlyph: 0.9, planetTick: 0.78, planetGlyph: 0.67,
  houseNumber: 0.47, aspect: 0.4 };
// Line widths. The design system has no stroke tokens yet, so they live here, in one place.
const STROKE = { hairline: 1, line: 1.5, axis: 2 };
const MIN_GLYPH_SEPARATION = 9; // degrees between planet glyphs on the ring

const ASPECT_COLOUR: Record<AspectType, string> = {
  conjunction: colors.lavender, sextile: colors.gold, trine: colors.gold, square: colors.rose, opposition: colors.rose,
};

/** The body whose glyph centre is nearest the touch, if within half a touch target. */
export function nearestGlyph(glyphs: { b: { id: BodyId }; x: number; y: number }[], x: number, y: number): BodyId | null {
  let best: BodyId | null = null;
  let bestDist = MIN_TOUCH / 2;
  for (const g of glyphs) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d <= bestDist) {
      best = g.b.id;
      bestDist = d;
    }
  }
  return best;
}

export function ChartWheel({ chart, lang, size, selected, onSelect }: {
  chart: Chart; lang: Lang; size: number; selected: BodyId | null; onSelect: (id: BodyId) => void;
}) {
  const c = size / 2;
  const asc = chart.angles?.asc.lon ?? null;
  const at = (lon: number, frac: number) => polar(c, c, c * frac, screenAngle(lon, asc));
  const radial = (lon: number, from: number, to: number) => {
    const a = at(lon, from), b = at(lon, to);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  };
  const lonOf = Object.fromEntries(chart.bodies.map((b) => [b.id, b.lon])) as Record<BodyId, number>;
  const display = spread(chart.bodies.map((b) => b.lon), MIN_GLYPH_SEPARATION);
  const uncertainAspect = new Set(chart.aspects_uncertain.map((u) => `${u.a}-${u.b}-${u.type}`));
  const glyphText = textStyle("glyph");
  const glyphs = chart.bodies.map((b, i) => ({ b, ...at(display[i], R.planetGlyph) }));

  return (
    <View style={{ width: size, height: size }} testID="chart-wheel">
      <Svg width={size} height={size}>
        {/* Zodiac ring */}
        <Circle cx={c} cy={c} r={c * R.outer} fill={colors.surface} stroke={colors.border} strokeWidth={STROKE.hairline} />
        <Circle cx={c} cy={c} r={c * R.signInner} fill={colors.bg} stroke={colors.border} strokeWidth={STROKE.hairline} />
        {SIGNS.map((s, i) => {
          const g = at(i * 30 + 15, R.signGlyph);
          return (
            <G key={s}>
              <Line {...radial(i * 30, R.signInner, R.outer)} stroke={colors.divider} strokeWidth={STROKE.hairline} />
              <SvgText x={g.x} y={g.y + glyphText.fontSize! / 3} fontSize={glyphText.fontSize} fill={colors.textMuted}
                textAnchor="middle">{signGlyph(s)}</SvgText>
            </G>
          );
        })}

        {/* Houses (not shown when the birth time is unknown) */}
        {chart.houses?.map((h, i) => {
          const next = chart.houses![(i + 1) % 12].cusp_lon;
          const mid = h.cusp_lon + (((next - h.cusp_lon) % 360) + 360) % 360 / 2;
          const n = at(mid, R.houseNumber);
          const caption = textStyle("caption");
          return (
            <G key={h.house}>
              <Line {...radial(h.cusp_lon, R.aspect, R.signInner)} stroke={colors.divider}
                strokeWidth={STROKE.hairline} strokeDasharray={h.uncertain ? "4 4" : undefined} />
              <SvgText x={n.x} y={n.y + caption.fontSize! / 3} fontSize={caption.fontSize} fill={colors.lavender}
                textAnchor="middle">{h.house}</SvgText>
            </G>
          );
        })}

        {/* Angles: Ascendant–Descendant and MC–IC axes */}
        {chart.angles && (["asc", "mc"] as const).map((k) => {
          const a = chart.angles![k];
          return (
            <G key={k}>
              <Line {...radial(a.lon, R.aspect, R.signInner)} stroke={colors.ivory} strokeWidth={STROKE.axis}
                strokeDasharray={a.uncertain ? "6 4" : undefined} />
              <Line {...radial(a.lon + 180, R.aspect, R.signInner)} stroke={colors.ivory} strokeWidth={STROKE.hairline} />
            </G>
          );
        })}

        {/* Aspects */}
        <Circle cx={c} cy={c} r={c * R.aspect} fill="none" stroke={colors.divider} strokeWidth={STROKE.hairline} />
        {chart.aspects.map((a) => {
          const p = at(lonOf[a.a], R.aspect), q = at(lonOf[a.b], R.aspect);
          const dim = selected && selected !== a.a && selected !== a.b;
          return (
            <Line key={`${a.a}-${a.b}`} testID={`aspect-${a.a}-${a.b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
              stroke={ASPECT_COLOUR[a.type]} strokeWidth={STROKE.line} strokeOpacity={dim ? 0.2 : 1}
              strokeDasharray={uncertainAspect.has(`${a.a}-${a.b}-${a.type}`) ? "4 4" : undefined} />
          );
        })}

        {/* Planet ticks at the exact longitude */}
        {chart.bodies.map((b) => (
          <Line key={b.id} {...radial(b.lon, R.planetTick, R.signInner)}
            stroke={selected === b.id ? colors.gold : colors.ivory} strokeWidth={STROKE.line} />
        ))}
      </Svg>

      {/* Planet glyphs. Close planets would have overlapping 48 px targets, so touch goes through one
          layer that picks the nearest glyph; screen readers get one labelled element per planet. */}
      {glyphs.map(({ b, x, y }) => {
        const isSelected = selected === b.id;
        return (
          <View key={b.id} testID={`wheel-${b.id}`} pointerEvents="none" accessible accessibilityRole="button"
            accessibilityLabel={bodyLabel(b, lang)} accessibilityState={{ selected: isSelected }}
            accessibilityActions={[{ name: "activate" }]}
            onAccessibilityAction={(e) => e.nativeEvent.actionName === "activate" && onSelect(b.id)}
            style={[styles.glyph, { left: x - MIN_TOUCH / 2, top: y - MIN_TOUCH / 2 }]}>
            <AppText variant="glyph" tone={isSelected ? "gold" : "ivory"}>{bodyGlyph(b.id)}</AppText>
          </View>
        );
      })}
      <Pressable testID="wheel-touch" accessible={false} importantForAccessibility="no"
        style={StyleSheet.absoluteFill}
        onPress={(e) => {
          // Android/iOS give locationX/Y; the web preview gives offsetX/Y. Both are relative to this layer.
          const n = e.nativeEvent as unknown as Record<string, number | undefined>;
          const id = nearestGlyph(glyphs, n.locationX ?? n.offsetX ?? NaN, n.locationY ?? n.offsetY ?? NaN);
          if (id) onSelect(id);
        }} />
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: { position: "absolute", width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
});
