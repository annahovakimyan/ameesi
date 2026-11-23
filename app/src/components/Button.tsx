import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { LineIcon } from "./Ornaments";
import { colors, gradient, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";

export function Button({ label, onPress, disabled, kind = "primary", testID, compact, icon }: {
  label: string; onPress: () => void; disabled?: boolean; kind?: "primary" | "secondary"; testID?: string;
  compact?: boolean; // narrower padding, for a button beside a title
  icon?: "share";
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
          ? { backgroundColor: disabled ? colors.disabledFill : colors.pomegranatePressed }
          : { borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface },
      ]}
    >
      {({ pressed }) => (
        <>
          {kind === "primary" && !disabled && !pressed && (
            <LinearGradient colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.content}>
            {icon && <LineIcon name={icon} color={disabled ? colors.disabledText : colors.ivory} size={18} />}
            <AppText variant="label" tone={disabled ? "disabledText" : "ivory"} style={styles.label}>{label}</AppText>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", overflow: "hidden",
    paddingHorizontal: space[6], paddingVertical: space[2],
  },
  label: { textAlign: "center" },
  content: { flexDirection: "row", alignItems: "center", gap: space[2] },
  compact: { paddingHorizontal: space[4] },
});
