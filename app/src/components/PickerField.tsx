import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { colors, MIN_TOUCH, radius, space } from "../theme";
import { AppText } from "./AppText";

/** A field that opens the system date or time picker. Times use the 24-hour clock. */
export function PickerField({ mode, value, onChange, placeholder, display, testID, minimumDate, maximumDate }: {
  mode: "date" | "time"; value: Date | null; onChange: (d: Date) => void; placeholder: string;
  display: (d: Date) => string; testID?: string; minimumDate?: Date; maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable testID={testID} accessibilityRole="button" onPress={() => setOpen(true)} style={styles.field}>
        <AppText tone={value ? "ivory" : "textFaint"}>{value ? display(value) : placeholder}</AppText>
      </Pressable>
      {open && (
        <DateTimePicker
          mode={mode}
          value={value ?? new Date(1990, 0, 1, 12, 0)}
          is24Hour
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, d) => {
            setOpen(false);
            if (event.type === "set" && d) onChange(d);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: space[4],
    backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
});
