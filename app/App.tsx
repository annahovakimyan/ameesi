import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Chart, Lang } from "./src/api/types";
import { Segmented } from "./src/components/Segmented";
import { BirthInputScreen } from "./src/screens/BirthInputScreen";
import { ChartListScreen } from "./src/screens/ChartListScreen";
import { colors, space } from "./src/theme";

export default function App() {
  const [lang, setLang] = useState<Lang>("hy"); // Armenian is the default
  const [chart, setChart] = useState<Chart | null>(null);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.lang}>
        <Segmented testID="lang" value={lang} onChange={setLang}
          options={[{ value: "hy", label: "Հայ" }, { value: "en", label: "Eng" }, { value: "ru", label: "Рус" }]} />
      </View>
      {chart
        ? <ChartListScreen chart={chart} lang={lang} onBack={() => setChart(null)} />
        : <BirthInputScreen lang={lang} onChart={setChart} />}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  lang: { paddingHorizontal: space[4], paddingTop: space[8] },
});
