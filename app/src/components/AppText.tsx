import { Text, type TextProps } from "react-native";
import { colors, textStyle, type TextVariant } from "../theme";

type Tone = "ivory" | "textMuted" | "textFaint" | "gold" | "rose" | "lavender" | "onGold" | "disabledText";

export function AppText({ variant = "body", tone = "ivory", style, ...props }:
  TextProps & { variant?: TextVariant; tone?: Tone }) {
  return <Text {...props} style={[textStyle(variant), { color: colors[tone] }, style]} />;
}

/** An icon character (⚠ ⓘ ✓) in the glyph font, inside or beside text. */
export function Icon({ char, tone = "ivory" }: { char: "⚠" | "ⓘ" | "✓"; tone?: Tone }) {
  return <Text style={[textStyle("glyph"), { color: colors[tone], textAlign: "center" }]} accessibilityElementsHidden
    importantForAccessibility="no" maxFontSizeMultiplier={1.2}>{char + "\uFE0E"}</Text>;
}
