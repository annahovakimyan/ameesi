import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { colors, gradient } from "../theme";

const STARS = 100;
const LAYERS = 3; // each layer twinkles at its own pace
const TWINKLE_MS = [3200, 4700, 6100];

/** Deterministic random numbers, so the sky looks the same on every launch. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} `
  + `Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;

/** Night-sky gradient, soft nebula glows and a slowly twinkling starfield behind every screen. */
export function CosmicBackground({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const twinkle = useRef([...Array(LAYERS)].map(() => new Animated.Value(1))).current;

  const stars = useMemo(() => {
    const rand = seeded(11);
    return [...Array(STARS)].map((_, i) => ({
      x: rand() * width, y: rand() * height, r: rand() < 0.88 ? 0.5 + rand() * 0.8 : 1.3 + rand() * 0.7,
      bright: rand() < 0.4, layer: i % LAYERS,
    }));
  }, [width, height]);
  const sparkles = useMemo(() => {
    const rand = seeded(7);
    return [...Array(6)].map(() => ({ x: rand() * width, y: rand() * height * 0.85, r: 3 + rand() * 4, gold: rand() < 0.5 }));
  }, [width, height]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    const loops = twinkle.map((v, i) => Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.35, duration: TWINKLE_MS[i], easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: TWINKLE_MS[i], easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduceMotion]);

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden testID="cosmic-background">
        <LinearGradient colors={gradient.sky} style={StyleSheet.absoluteFill} />
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            {([["gold", colors.glowGold], ["pom", colors.glowPomegranate], ["lav", colors.glowLavender]] as const).map(([id, c]) => (
              <RadialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={c} stopOpacity={1} />
                <Stop offset="1" stopColor={c} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          <Ellipse cx={width * 0.85} cy={height * 0.12} rx={width * 0.7} ry={height * 0.22} fill="url(#lav)" />
          <Ellipse cx={width * 0.1} cy={height * 0.55} rx={width * 0.8} ry={height * 0.25} fill="url(#pom)" />
          <Ellipse cx={width * 0.7} cy={height * 0.92} rx={width * 0.7} ry={height * 0.2} fill="url(#gold)" />
        </Svg>
        {twinkle.map((opacity, layer) => (
          <Animated.View key={layer} style={[StyleSheet.absoluteFill, { opacity }]}>
            <Svg width={width} height={height}>
              {stars.filter((s) => s.layer === layer).map((s, i) => (
                <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.bright ? colors.star : colors.starDim}
                  opacity={s.r < 1.1 ? 0.55 : 1} />
              ))}
              {layer === 0 && sparkles.map((s, i) => (
                <Path key={`s${i}`} d={sparkle(s.x, s.y, s.r)} fill={s.gold ? colors.gold : colors.star} />
              ))}
            </Svg>
          </Animated.View>
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
