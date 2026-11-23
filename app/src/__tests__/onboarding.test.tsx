import { fireEvent, render, screen } from "@testing-library/react-native";
import { OnboardingScreen } from "../screens/OnboardingScreen";

test("first launch: language choice, the symbolic note, continue (PRD journey 1, FR-13)", async () => {
  const onLang = jest.fn(), onContinue = jest.fn();
  await render(<OnboardingScreen lang="hy" onLang={onLang} onContinue={onContinue} />);
  expect(screen.getByTestId("lang-hy")).toBeSelected();
  expect(screen.getByTestId("symbolic-note")).toHaveTextContent(/խորհրդանշական լեզու/);
  await fireEvent.press(screen.getByTestId("lang-en"));
  expect(onLang).toHaveBeenCalledWith("en");
  await fireEvent.press(screen.getByTestId("onboarding-continue"));
  expect(onContinue).toHaveBeenCalled();
});
