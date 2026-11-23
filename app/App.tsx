import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CosmicBackground } from "./src/components/CosmicBackground";
import { LiveContentProvider } from "./src/content/live";
import { deviceProfileStore } from "./src/profiles/store";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { Root } from "./src/screens/Root";
import { deviceSettingsStore, type Settings } from "./src/settings";
import { colors, FONTS } from "./src/theme";

const profileStore = deviceProfileStore(AsyncStorage);
const settingsStore = deviceSettingsStore(AsyncStorage);

export default function App() {
  const [fontsLoaded] = useFonts(FONTS);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [generation, setGeneration] = useState(0); // remounts Root after "delete all my data"

  useEffect(() => {
    settingsStore.load().then(setSettings);
  }, []);

  const update = (patch: Partial<Settings>) => setSettings((cur) => {
    const next = { ...cur!, ...patch };
    settingsStore.save(next).catch(() => {});
    return next;
  });

  if (!fontsLoaded || !settings) return <View style={styles.root} />;

  return (
    <SafeAreaProvider>
      <CosmicBackground>
      <SafeAreaView style={styles.transparent}>
        <StatusBar style="light" />
        <LiveContentProvider lang={settings.lang}>
          {!settings.onboarded ? (
            <OnboardingScreen lang={settings.lang} onLang={(lang) => update({ lang })}
              onContinue={() => update({ onboarded: true })} />
          ) : (
            <Root key={generation} lang={settings.lang} store={profileStore} houseSystem={settings.houseSystem}
              onLang={(lang) => update({ lang })} onHouseSystem={(houseSystem) => update({ houseSystem })}
              tourDone={settings.tourDone} onTourDone={() => update({ tourDone: true })}
              addPromptDone={settings.addPromptDone} onAddPromptDone={() => update({ addPromptDone: true })}
              onDeleteAll={() => {
                settingsStore.deleteAll().catch(() => {}).finally(() => {
                  setSettings({ ...settings, onboarded: false });
                  setGeneration((g) => g + 1);
                });
              }} />
          )}
        </LiveContentProvider>
      </SafeAreaView>
      </CosmicBackground>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  transparent: { flex: 1 },
});
