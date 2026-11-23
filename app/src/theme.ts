import type { TextStyle } from "react-native";
import type { ViewStyle } from "react-native";
import { colors, dash, radius, shadow, space, stroke, type as typeTokens } from "./generated/tokens";

export { colors, dash, radius, space, stroke };

/** React Native shadow for a design-system shadow token (iOS shadow props, Android elevation). */
export function shadowStyle(name: keyof typeof shadow): ViewStyle {
  const s = shadow[name];
  const alpha = Number(s.color.match(/[\d.]+\)$/)?.[0].replace(")", "") ?? 1);
  return {
    shadowColor: s.color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),.*\)/, "rgb($1, $2, $3)"),
    shadowOffset: { width: s.x, height: s.y },
    shadowRadius: s.blur / 2,
    shadowOpacity: alpha,
    elevation: s.blur / 2,
  };
}

export type TextVariant = keyof typeof typeTokens;

/** Font files (assets/fonts, built from Noto by scripts/build_fonts.py), registered in App.tsx. */
export const FONTS = {
  "AmeesiSans-Regular": require("../assets/fonts/AmeesiSans-Regular.ttf"),
  "AmeesiSans-SemiBold": require("../assets/fonts/AmeesiSans-SemiBold.ttf"),
  "AmeesiSerif-SemiBold": require("../assets/fonts/AmeesiSerif-SemiBold.ttf"),
  "AmeesiGlyphs-Regular": require("../assets/fonts/AmeesiGlyphs-Regular.ttf"),
} as const;

/** The font file for a token family and weight. One file per weight: no synthetic bold on Android. */
export function fontFamily(family: string, weight: string): keyof typeof FONTS {
  if (family === "display") return "AmeesiSerif-SemiBold";
  if (family === "symbols") return "AmeesiGlyphs-Regular";
  return Number(weight) >= 600 ? "AmeesiSans-SemiBold" : "AmeesiSans-Regular";
}

/** React Native text style for a design-system type style. */
export function textStyle(variant: TextVariant): TextStyle {
  const { family, fontWeight, ...style } = typeTokens[variant] as (typeof typeTokens)[TextVariant] & {
    letterSpacing?: number;
  };
  return { ...style, fontFamily: fontFamily(family, fontWeight) } as TextStyle;
}

export const MIN_TOUCH = space[12];
