import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, gradient, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";

export function Segmented<T extends string>({ options, value, onChange, testID }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testID?: string;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" testID={testID}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={testID ? `${testID}-${o.value}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={styles.segment}
          >
            {selected && <LinearGradient colors={gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.pill]} />}
            <AppText variant="label" tone={selected ? "ivory" : "textMuted"} style={styles.text} numberOfLines={2}
              adjustsFontSizeToFit minimumFontScale={0.8}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.glassEdge, padding: space[1], gap: space[1],
  },
  // Equal widths; labels wrap between words (keep single words short enough for a third of 320 px).
  pill: { borderRadius: radius.pill },
  segment: { flex: 1, minHeight: MIN_TOUCH - space[2], borderRadius: radius.pill, overflow: "hidden", alignItems: "center", justifyContent: "center",
             paddingHorizontal: space[1], paddingVertical: space[1] },
  text: { textAlign: "center" },
});
