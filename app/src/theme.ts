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

/** React Native text style for a design-system type style. */
export function textStyle(variant: TextVariant): TextStyle {
  const { family: _family, ...style } = typeTokens[variant] as (typeof typeTokens)[TextVariant] & {
    letterSpacing?: number;
  };
  // Fonts (Noto Sans / Serif Armenian) are loaded in a later step; system font until then.
  return style as TextStyle;
}

export const MIN_TOUCH = space[12];
