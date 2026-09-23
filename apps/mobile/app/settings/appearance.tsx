import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BackgroundChoice, pastelBackgrounds, usePreferences } from "@/context/PreferencesContext";
import { InfoRow, SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";

const swatches: { id: Exclude<BackgroundChoice, "system" | "photo">; label: string }[] = [
  { id: "red", label: "Red" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "yellow", label: "Yellow" },
  { id: "tan", label: "Tan" }
];

export default function AppearanceSettingsScreen() {
  const preferences = usePreferences();
  return <SettingsScreen eyebrow="DISPLAY" title="Appearance" subtitle="Match your phone day/night setting, choose a pastel, or use your own background photo.">
    <SettingsCard>
      <InfoRow icon="phone-portrait-outline" title="Match phone appearance" body="When selected, StateUp follows iOS/Android system appearance. Dark mode now uses a true dark background." />
      <InfoRow icon="moon-outline" title="Current app mode" body={`StateUp is currently using ${preferences.effectiveScheme} mode for system appearance.`} />
    </SettingsCard>
    <SettingsCard>
      <Pressable onPress={() => preferences.setPreference("background", "system")} style={[styles.systemChoice, preferences.background === "system" && styles.selectedChoice]}>
        <Ionicons name="contrast-outline" size={21} color={colors.navy} />
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Match phone day/night</Text><Text style={styles.rowSubtitle}>Uses your iPhone or Android appearance setting</Text></View>
        {preferences.background === "system" && <Ionicons name="checkmark-circle" size={21} color={colors.blue} />}
      </Pressable>
      <View style={styles.swatches}>
        {swatches.map((swatch) => <Pressable key={swatch.id} onPress={() => preferences.setPreference("background", swatch.id)} style={[styles.swatchWrap, preferences.background === swatch.id && styles.swatchSelected]}>
          <View style={[styles.swatch, { backgroundColor: pastelBackgrounds[swatch.id] }]} />
          <Text style={styles.swatchLabel}>{swatch.label}</Text>
        </Pressable>)}
      </View>
      <Button variant={preferences.background === "photo" ? "secondary" : "ghost"} icon="image-outline" onPress={preferences.chooseBackgroundPhoto}>
        {preferences.background === "photo" ? "Change background photo" : "Choose background photo"}
      </Button>
    </SettingsCard>
  </SettingsScreen>;
}

const styles = StyleSheet.create({
  systemChoice: { minHeight: 65, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "rgba(255,255,255,0.58)" },
  selectedChoice: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  rowTitle: { color: colors.navy, fontWeight: "900", fontSize: 14 },
  rowSubtitle: { color: colors.grayText, fontSize: 11, lineHeight: 15, marginTop: 3 },
  swatches: { flexDirection: "row", justifyContent: "space-between", gap: 7, marginVertical: 14 },
  swatchWrap: { alignItems: "center", padding: 5, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.blue },
  swatch: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: "rgba(16,36,62,0.12)" },
  swatchLabel: { color: colors.grayText, fontSize: 9, fontWeight: "700", marginTop: 4 }
});
