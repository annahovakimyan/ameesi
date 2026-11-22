import type { TextStyle } from "react-native";
import { colors, radius, space, type as typeTokens } from "./generated/tokens";

export { colors, radius, space };

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
