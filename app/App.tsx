import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Lang } from "./src/api/types";
import { Segmented } from "./src/components/Segmented";
import { LiveContentProvider } from "./src/content/live";
import { deviceProfileStore } from "./src/profiles/store";
import { Root } from "./src/screens/Root";
import { colors, FONTS, space } from "./src/theme";

const profileStore = deviceProfileStore(AsyncStorage);

export default function App() {
  const [lang, setLang] = useState<Lang>("hy"); // Armenian is the default
  const [fontsLoaded] = useFonts(FONTS);
  if (!fontsLoaded) return <View style={styles.root} />;

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.lang}>
        <Segmented testID="lang" value={lang} onChange={setLang}
          options={[{ value: "hy", label: "Հայ" }, { value: "en", label: "Eng" }, { value: "ru", label: "Рус" }]} />
      </View>
      <LiveContentProvider lang={lang}>
        <Root lang={lang} store={profileStore} />
      </LiveContentProvider>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  lang: { paddingHorizontal: space[4], paddingTop: space[8] },
});
