import { fireEvent, render, screen } from "@testing-library/react-native";
import { formatTimeDigits, parseTimeDigits, TimeField } from "../components/TimeField";

test.each([["4", "4"], ["41", "41"], ["412", "4:12"], ["0412", "04:12"], ["04:12", "04:12"], ["123456", "12:34"]])(
  "typing %s shows %s", (typed, shown) => expect(formatTimeDigits(typed)).toBe(shown));

test("any minute is accepted, impossible times are not", () => {
  expect(parseTimeDigits("4:12")?.getMinutes()).toBe(12);
  expect(parseTimeDigits("04:12")?.getHours()).toBe(4);
  expect(parseTimeDigits("23:59")?.getMinutes()).toBe(59);
  expect(parseTimeDigits("00:07")?.getMinutes()).toBe(7);
  expect(parseTimeDigits("25:00")).toBeNull();
  expect(parseTimeDigits("12:61")).toBeNull();
  expect(parseTimeDigits("12")).toBeNull();
});

test("typing 0412 gives 04:12 to the form", async () => {
  const onChange = jest.fn();
  await render(<TimeField value={null} onChange={onChange} placeholder="Choose time" testID="t" />);
  await fireEvent.changeText(screen.getByTestId("t"), "0412");
  expect(screen.getByTestId("t")).toHaveDisplayValue("04:12");
  const d: Date = onChange.mock.calls.at(-1)[0];
  expect([d.getHours(), d.getMinutes()]).toEqual([4, 12]);
});

test("typing 412 then leaving the field shows 04:12", async () => {
  await render(<TimeField value={null} onChange={jest.fn()} placeholder="Choose time" testID="t" />);
  await fireEvent.changeText(screen.getByTestId("t"), "412");
  expect(screen.getByTestId("t")).toHaveDisplayValue("4:12");
  await fireEvent(screen.getByTestId("t"), "blur");
  expect(screen.getByTestId("t")).toHaveDisplayValue("04:12");
});

test("a saved time is shown for editing", async () => {
  await render(<TimeField value={new Date(2000, 0, 1, 14, 30)} onChange={jest.fn()} placeholder="x" testID="t" />);
  expect(screen.getByTestId("t")).toHaveDisplayValue("14:30");
});
