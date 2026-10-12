import "leaflet/dist/leaflet.css";
import "@/components/leaflet.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { AppBackground, PreferencesProvider, usePreferences } from "@/context/PreferencesContext";

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <PreferencesProvider><AuthProvider><AppProvider><AppBackground>
        <ThemedStatusBar />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "slide_from_right" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="state/[id]" />
          <Stack.Screen name="pin/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="auth" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="friends" />
        </Stack>
    </AppBackground></AppProvider></AuthProvider></PreferencesProvider>
  </GestureHandlerRootView>;
}

function ThemedStatusBar() {
  const { background, effectiveScheme } = usePreferences();
  return <StatusBar style={background === "photo" ? "dark" : effectiveScheme === "dark" ? "light" : "dark"} />;
}
