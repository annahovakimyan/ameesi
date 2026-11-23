import { Pressable, StyleSheet, View } from "react-native";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText, Icon } from "./AppText";

/** Checkbox, or a radio button with `radio` (round, one of a group). */
export function Checkbox({ label, checked, onPress, testID, radio }: {
  label: string; checked: boolean; onPress: () => void; testID?: string; radio?: boolean;
}) {
  return (
    <Pressable testID={testID} accessibilityRole={radio ? "radio" : "checkbox"}
      accessibilityState={radio ? { selected: checked } : { checked }} onPress={onPress} style={styles.row}>
      <View style={[styles.box, radio && styles.round, checked && { backgroundColor: colors.gold, borderColor: colors.gold }]}>
        {checked && <Icon char="✓" tone="onGold" />}
      </View>
      <AppText style={styles.flex}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: MIN_TOUCH },
  box: { width: space[6], height: space[6], borderRadius: radius.sm / 2, borderWidth: 2, borderColor: colors.border,
         alignItems: "center", justifyContent: "center" },
  round: { borderRadius: radius.pill },
  flex: { flex: 1 },
});
