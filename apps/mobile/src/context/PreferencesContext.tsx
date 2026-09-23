import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, ImageBackground, Platform, StyleSheet, useColorScheme, View } from "react-native";

export type BackgroundChoice = "system" | "red" | "blue" | "green" | "yellow" | "tan" | "photo";

type Preferences = {
  haptics: boolean;
  interactionSounds: boolean;
  notifications: boolean;
  background: BackgroundChoice;
  backgroundImage: string | null;
};

type PreferencesContextValue = Preferences & {
  effectiveBackground: string;
  effectiveScheme: "light" | "dark";
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  chooseBackgroundPhoto: () => Promise<void>;
  feedback: (kind?: "tap" | "success") => void;
};

const STORAGE_KEY = "stateup.preferences.v2";
const defaults: Preferences = {
  haptics: true,
  interactionSounds: true,
  notifications: false,
  background: "system",
  backgroundImage: null
};

export const pastelBackgrounds: Record<Exclude<BackgroundChoice, "system" | "photo">, string> = {
  red: "#F8E4E1",
  blue: "#E4EDF8",
  green: "#E4F1E7",
  yellow: "#F8F0CF",
  tan: "#F1E8DA"
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const [preferences, setPreferences] = useState(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => stored && setPreferences({ ...defaults, ...JSON.parse(stored) }))
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch(() => undefined);
  }, [hydrated, preferences]);

  const effectiveScheme = preferences.background === "system" && colorScheme === "dark" ? "dark" : "light";
  const effectiveBackground = preferences.background === "system"
    ? effectiveScheme === "dark" ? "#070B12" : "#F7F4ED"
    : preferences.background === "photo"
      ? "transparent"
      : pastelBackgrounds[preferences.background];

  const value = useMemo<PreferencesContextValue>(() => ({
    ...preferences,
    effectiveBackground,
    effectiveScheme,
    setPreference: (key, nextValue) => setPreferences((current) => ({ ...current, [key]: nextValue })),
    chooseBackgroundPhoto: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo permission needed", "Allow photo access to choose a personal StateUp background.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.75,
        allowsEditing: true
      });
      if (!result.canceled) {
        setPreferences((current) => ({ ...current, background: "photo", backgroundImage: result.assets[0].uri }));
      }
    },
    feedback: (kind = "tap") => {
      if (!preferences.haptics || Platform.OS === "web") return;
      const action = kind === "success"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.selectionAsync();
      action.catch(() => undefined);
    }
  }), [preferences, effectiveBackground, effectiveScheme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function AppBackground({ children }: PropsWithChildren) {
  const { background, backgroundImage, effectiveBackground } = usePreferences();
  if (background === "photo" && backgroundImage) {
    return <ImageBackground source={{ uri: backgroundImage }} style={styles.fill} imageStyle={styles.image}>
      <View style={styles.photoWash}>{children}</View>
    </ImageBackground>;
  }
  return <View style={[styles.fill, { backgroundColor: effectiveBackground }]}>{children}</View>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  image: { opacity: 0.42 },
  photoWash: { flex: 1, backgroundColor: "rgba(247,244,237,0.44)" }
});
