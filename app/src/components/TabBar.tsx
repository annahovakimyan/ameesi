import { Pressable, StyleSheet, View } from "react-native";
import { colors, MIN_TOUCH, space } from "../theme";
import { AppText } from "./AppText";

/** Design-system tab bar: surface, divider top line, selected tab in gold. (Icons come with the icon set.) */
export function TabBar<T extends string>({ tabs, value, onChange }: {
  tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable key={tab.value} testID={`tab-${tab.value}`} accessibilityRole="tab" accessibilityState={{ selected }}
            onPress={() => onChange(tab.value)} style={styles.tab}>
            <AppText variant="label" tone={selected ? "gold" : "textMuted"}>{tab.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  tab: { flex: 1, minHeight: MIN_TOUCH + space[2], alignItems: "center", justifyContent: "center" },
});
