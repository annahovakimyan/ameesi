import { Text, type TextProps } from "react-native";
import { colors, textStyle, type TextVariant } from "../theme";

type Tone = "ivory" | "textMuted" | "textFaint" | "gold" | "rose" | "lavender" | "onGold" | "disabledText";

export function AppText({ variant = "body", tone = "ivory", style, ...props }:
  TextProps & { variant?: TextVariant; tone?: Tone }) {
  return <Text {...props} style={[textStyle(variant), { color: colors[tone] }, style]} />;
}
