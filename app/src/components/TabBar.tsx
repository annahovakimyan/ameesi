import { Pressable, StyleSheet, View } from "react-native";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";
import { LineIcon } from "./Ornaments";

/** Floating glass pill with line icons; the selected tab is gold on a soft glow. */
export function TabBar<T extends string>({ tabs, value, onChange }: {
  tabs: { value: T; label: string; icon: "chart" | "profiles" }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const selected = tab.value === value;
          return (
            <Pressable key={tab.value} testID={`tab-${tab.value}`} accessibilityRole="tab" accessibilityState={{ selected }}
              accessibilityLabel={tab.label} onPress={() => onChange(tab.value)}
              style={[styles.tab, selected && styles.selected]}>
              <LineIcon name={tab.icon} color={selected ? colors.gold : colors.textMuted} size={22} />
              <AppText variant="caption" tone={selected ? "gold" : "textMuted"} maxFontSizeMultiplier={1.3}>{tab.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[4], paddingBottom: space[2], paddingTop: space[1] },
  bar: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1,
         borderColor: colors.glassEdge, padding: space[1], gap: space[1] },
  tab: { flex: 1, minHeight: MIN_TOUCH + space[2], alignItems: "center", justifyContent: "center", gap: 2,
         borderRadius: radius.pill },
  selected: { backgroundColor: colors.glowGold },
});
