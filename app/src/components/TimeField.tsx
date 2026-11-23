import { useState } from "react";
import { hhmm } from "../format";
import { TextField } from "./TextField";

/** "412" → "4:12", "0412" → "04:12": the digits typed so far, with the colon added. */
export function formatTimeDigits(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return d.length === 3 ? `${d[0]}:${d.slice(1)}` : `${d.slice(0, 2)}:${d.slice(2)}`;
}

/** The time those digits mean, or null while incomplete or impossible (25:00, 12:61). */
export function parseTimeDigits(text: string): Date | null {
  const d = text.replace(/\D/g, "");
  if (d.length < 3) return null;
  const [h, m] = d.length === 3 ? [Number(d[0]), Number(d.slice(1))] : [Number(d.slice(0, 2)), Number(d.slice(2, 4))];
  if (h > 23 || m > 59) return null;
  return new Date(2000, 0, 1, h, m);
}

/** A typed birth time, to the exact minute (24-hour clock). Pickers only offered 5-minute steps. */
export function TimeField({ value, onChange, placeholder, testID }: {
  value: Date | null; onChange: (d: Date | null) => void; placeholder: string; testID?: string;
}) {
  const [text, setText] = useState(value ? hhmm(value) : "");
  return (
    <TextField testID={testID} value={text} placeholder="14:30" accessibilityLabel={placeholder}
      keyboardType="number-pad" maxLength={5} autoCorrect={false}
      onChangeText={(t) => {
        const shown = formatTimeDigits(t);
        setText(shown);
        onChange(parseTimeDigits(shown));
      }}
      onBlur={() => {
        const d = parseTimeDigits(text);
        if (d) setText(hhmm(d)); // "4:12" → "04:12"
      }} />
  );
}
