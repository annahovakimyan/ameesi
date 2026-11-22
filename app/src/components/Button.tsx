import { Pressable, StyleSheet } from "react-native";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";

export function Button({ label, onPress, disabled, kind = "primary", testID }: {
  label: string; onPress: () => void; disabled?: boolean; kind?: "primary" | "secondary"; testID?: string;
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
        kind === "primary"
          ? { backgroundColor: disabled ? colors.disabledFill : pressed ? colors.pomegranatePressed : colors.pomegranate }
          : { borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : undefined },
      ]}
    >
      <AppText variant="label" tone={disabled ? "disabledText" : "ivory"}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
    paddingHorizontal: space[6],
  },
});
