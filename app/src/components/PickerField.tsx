import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { parseDisplayDate, parseDisplayTime } from "../format";
import { colors, MIN_TOUCH, radius, shadowStyle, space } from "../theme";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { TextField } from "./TextField";

/** A date or time field. Android: the system dialog. iPhone: a spinner panel with Done and Cancel.
 *  Web preview (no native picker): type 14.08.1992 or 14:30. Times use the 24-hour clock. */
export function PickerField({ mode, value, onChange, placeholder, display, testID, minimumDate, maximumDate,
  doneLabel = "Done", cancelLabel = "Cancel" }: {
  mode: "date" | "time"; value: Date | null; onChange: (d: Date) => void; placeholder: string;
  display: (d: Date) => string; testID?: string; minimumDate?: Date; maximumDate?: Date;
  doneLabel?: string; cancelLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const initial = value ?? new Date(1990, 0, 1, 12, 0);
  const [draft, setDraft] = useState(initial);
  const [text, setText] = useState(value ? display(value) : "");

  if (Platform.OS === "web") {
    return (
      <TextField testID={testID} value={text} placeholder={mode === "date" ? "14.08.1992" : "14:30"}
        accessibilityLabel={placeholder} keyboardType="numbers-and-punctuation"
        onChangeText={(t) => {
          setText(t);
          const d = mode === "date" ? parseDisplayDate(t) : parseDisplayTime(t);
          if (d && (!maximumDate || d <= maximumDate) && (!minimumDate || d >= minimumDate)) onChange(d);
        }} />
    );
  }

  const field = (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={placeholder}
      onPress={() => { setDraft(initial); setOpen(true); }} style={[styles.field, open && styles.focused]}>
      <AppText tone={value ? "ivory" : "textFaint"}>{value ? display(value) : placeholder}</AppText>
    </Pressable>
  );

  if (Platform.OS === "ios") {
    return (
      <>
        {field}
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)}
            accessibilityRole="button" accessibilityLabel={cancelLabel} />
          <View style={[styles.panel, shadowStyle("sheet")]}>
            <DateTimePicker mode={mode} value={draft} display="spinner" themeVariant="dark" textColor={colors.ivory}
              is24Hour locale="en_GB" minimumDate={minimumDate} maximumDate={maximumDate}
              onChange={(_, d) => d && setDraft(d)} />
            <View style={styles.row}>
              <View style={styles.flex}><Button kind="secondary" label={cancelLabel} onPress={() => setOpen(false)} /></View>
              <View style={styles.flex}>
                <Button testID={testID ? `${testID}-done` : undefined} label={doneLabel}
                  onPress={() => { setOpen(false); onChange(draft); }} />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      {field}
      {open && (
        <DateTimePicker mode={mode} value={initial} is24Hour minimumDate={minimumDate} maximumDate={maximumDate}
          onChange={(event, d) => {
            setOpen(false);
            if (event.type === "set" && d) onChange(d);
          }} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: MIN_TOUCH, justifyContent: "center", paddingHorizontal: space[4],
    backgroundColor: colors.field, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
  focused: { borderColor: colors.gold },
  panel: {
    position: "absolute", left: 0, right: 0, bottom: 0, padding: space[5], paddingBottom: space[8], gap: space[4],
    backgroundColor: colors.surfaceRaised, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  row: { flexDirection: "row", gap: space[3] },
  flex: { flex: 1 },
});
