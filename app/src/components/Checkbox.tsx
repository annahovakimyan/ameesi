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
      {radio ? (
        <View style={[styles.box, styles.round, checked && { borderColor: colors.gold }]}>
          {checked && <View style={styles.dot} />}
        </View>
      ) : (
        <View style={[styles.box, checked && { backgroundColor: colors.gold, borderColor: colors.gold }]}>
          {checked && <Icon char="✓" tone="onGold" />}
        </View>
      )}
      <AppText style={styles.flex}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: MIN_TOUCH },
  box: { width: space[6], height: space[6], borderRadius: radius.sm / 2, borderWidth: 2, borderColor: colors.border,
         alignItems: "center", justifyContent: "center" },
  round: { borderRadius: radius.pill },
  dot: { width: space[3], height: space[3], borderRadius: radius.pill, backgroundColor: colors.gold },
  flex: { flex: 1 },
});
