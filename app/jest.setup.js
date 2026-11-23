// Screens read the phone's safe-area insets; tests use the library's mock (zero insets) everywhere.
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
