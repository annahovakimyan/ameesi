import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors, MIN_TOUCH, radius, space, textStyle } from "../theme";

/** Design-system text field: surface box, border, gold border while focused, no Android underline. */
export function TextField({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.textFaint}
      underlineColorAndroid="transparent"
      selectionColor={colors.gold}
      cursorColor={colors.gold}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[styles.input, textStyle("body"), focused && styles.focused, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TOUCH, paddingHorizontal: space[4], paddingVertical: space[3], color: colors.ivory,
    backgroundColor: colors.field, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    outlineStyle: "none" as never, // web preview: the gold border is the focus indicator
  },
  focused: { borderColor: colors.gold },
});
