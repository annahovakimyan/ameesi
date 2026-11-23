import { Pressable, StyleSheet } from "react-native";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";

export function Button({ label, onPress, disabled, kind = "primary", testID, compact }: {
  label: string; onPress: () => void; disabled?: boolean; kind?: "primary" | "secondary"; testID?: string;
  compact?: boolean; // narrower padding, for a button beside a title
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        kind === "primary"
          ? { backgroundColor: disabled ? colors.disabledFill : pressed ? colors.pomegranatePressed : colors.pomegranate }
          : { borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : undefined },
      ]}
    >
      <AppText variant="label" tone={disabled ? "disabledText" : "ivory"} style={styles.label}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
    paddingHorizontal: space[6], paddingVertical: space[2],
  },
  label: { textAlign: "center" },
  compact: { paddingHorizontal: space[4] },
});
