// Gold line-art from the design references: dividers, an arched portal, a radiant halo. Decorative only.
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { colors, stroke } from "../theme";

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

/** Four-point sparkle centred on (x, y). */
export const sparklePath = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} `
  + `Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;

/** Crescent opening to the right, centred on (x, y). */
export const crescentPath = (x: number, y: number, r: number) => {
  // Tips sit on the outer circle at ±60° from the right; the outer edge runs round the left,
  // the inner edge is a shallower arc back, leaving a crescent about r thick at its middle.
  const tx = x + r * 0.5, top = y - r * 0.866, bottom = y + r * 0.866;
  return `M${tx} ${top} A${r} ${r} 0 1 0 ${tx} ${bottom} A${r} ${r} 0 0 1 ${tx} ${top} Z`;
};

/** ——— ☾ ——— : a thin gold divider with a crescent in the middle. */
export function CrescentDivider({ width }: { width: number }) {
  const y = 10, mid = width / 2;
  return (
    <View {...hidden} testID="crescent-divider">
      <Svg width={width} height={20}>
        <Line x1={0} y1={y} x2={mid - 16} y2={y} stroke={colors.glassEdge} strokeWidth={stroke.hairline} />
        <Line x1={mid + 16} y1={y} x2={width} y2={y} stroke={colors.glassEdge} strokeWidth={stroke.hairline} />
        <Circle cx={mid - 16} cy={y} r={1.5} fill={colors.gold} />
        <Circle cx={mid + 16} cy={y} r={1.5} fill={colors.gold} />
        <Path d={crescentPath(mid, y, 6)} fill={colors.gold} />
      </Svg>
    </View>
  );
}

/** An arched gold portal with a crescent, stars and soft hills: the first screen's hero. */
export function ArchPortal({ size }: { size: number }) {
  const w = size, h = size * 1.15, r = w / 2 - 2;
  const arch = `M2 ${h - 2} L2 ${r + 2} A${r} ${r} 0 0 1 ${w - 2} ${r + 2} L${w - 2} ${h - 2} Z`;
  return (
    <View {...hidden} testID="arch-portal">
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id="portalGlow" cx="50%" cy="40%" r="60%">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.22} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path d={arch} fill="url(#portalGlow)" stroke={colors.gold} strokeWidth={stroke.line} />
        <Path d={`M10 ${h - 8} L10 ${r + 6} A${r - 8} ${r - 8} 0 0 1 ${w - 10} ${r + 6} L${w - 10} ${h - 8}`}
          fill="none" stroke={colors.glassEdge} strokeWidth={stroke.hairline} />
        <Path d={crescentPath(w * 0.6, h * 0.3, w * 0.1)} fill={colors.gold} />
        <Path d={sparklePath(w * 0.32, h * 0.22, w * 0.05)} fill={colors.ivory} />
        <Path d={sparklePath(w * 0.72, h * 0.52, w * 0.035)} fill={colors.gold} />
        {[[0.25, 0.42], [0.45, 0.15], [0.8, 0.3], [0.35, 0.58], [0.6, 0.62]].map(([x, y], i) => (
          <Circle key={i} cx={w * x} cy={h * y} r={1.2} fill={colors.starDim} />
        ))}
        <Path d={`M6 ${h - 6} Q${w * 0.3} ${h * 0.7} ${w * 0.55} ${h * 0.82} T${w - 6} ${h * 0.74} L${w - 6} ${h - 6} Z`}
          fill={colors.glowPomegranate} stroke={colors.gold} strokeWidth={stroke.hairline} />
        <Path d={`M6 ${h - 6} Q${w * 0.45} ${h * 0.8} ${w - 6} ${h * 0.88} L${w - 6} ${h - 6} Z`}
          fill={colors.glowGold} />
      </Svg>
    </View>
  );
}

/** Soft glow and fine gold rays around a circle of diameter `size` (behind the chart wheel). */
export function RadiantHalo({ size }: { size: number }) {
  const pad = size * 0.06, s = size + pad * 2, c = s / 2;
  const rays = 72;
  return (
    <View {...hidden} style={{ position: "absolute", left: -pad, top: -pad }} pointerEvents="none">
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0.82" stopColor={colors.gold} stopOpacity={0.14} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill="url(#halo)" />
        <G opacity={0.35}>
          {[...Array(rays)].map((_, i) => {
            const a = (i / rays) * Math.PI * 2, long = i % 6 === 0;
            const r1 = size / 2 + 2, r2 = r1 + (long ? pad * 0.9 : pad * 0.45);
            return <Line key={i} x1={c + r1 * Math.cos(a)} y1={c + r1 * Math.sin(a)} x2={c + r2 * Math.cos(a)}
              y2={c + r2 * Math.sin(a)} stroke={colors.gold} strokeWidth={stroke.hairline} />;
          })}
        </G>
      </Svg>
    </View>
  );
}

/** Line icons on the 24 px grid, icon stroke from the design tokens. */
export function LineIcon({ name, color, size = 24 }: { name: "chart" | "profiles" | "share"; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: stroke.icon, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <View {...hidden}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {name === "chart" && (
          <>
            <Circle cx={12} cy={12} r={9} {...p} />
            <Circle cx={12} cy={12} r={4} {...p} />
            <Line x1={12} y1={3} x2={12} y2={8} {...p} /><Line x1={12} y1={16} x2={12} y2={21} {...p} />
            <Line x1={3} y1={12} x2={8} y2={12} {...p} /><Line x1={16} y1={12} x2={21} y2={12} {...p} />
          </>
        )}
        {name === "profiles" && (
          <>
            <Circle cx={12} cy={8} r={4} {...p} />
            <Path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" {...p} />
          </>
        )}
        {name === "share" && (
          <>
            <Path d="M12 15V4" {...p} /><Path d="M8 8l4-4 4 4" {...p} />
            <Path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" {...p} />
          </>
        )}
      </Svg>
    </View>
  );
}

/** "Generating chart": a glowing dot circling a gold ring. Still with reduce motion. */
export function OrbitLoader({ size = 56, testID }: { size?: number; testID?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const c = size / 2, r = size / 2 - 6;
  return (
    <View testID={testID} accessibilityRole="progressbar" style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={c} cy={c} r={r} fill="none" stroke={colors.glassEdge} strokeWidth={stroke.line} />
        <Path d={sparklePath(c, c, size * 0.12)} fill={colors.gold} />
      </Svg>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c - r} r={3.5} fill={colors.gold} />
          <Circle cx={c} cy={c - r} r={7} fill={colors.glowGold} />
        </Svg>
      </Animated.View>
    </View>
  );
}
