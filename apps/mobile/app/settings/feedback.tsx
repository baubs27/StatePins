import { StyleSheet, Switch, Text, View } from "react-native";
import { InfoRow, SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";

export default function FeedbackSettingsScreen() {
  const preferences = usePreferences();
  return <SettingsScreen eyebrow="COMFORT" title="Tap feedback" subtitle="Customize haptics and tap sounds so StateUp feels good to use.">
    <SettingsCard>
      <InfoRow icon="phone-portrait-outline" title="Haptics" body="Gentle vibration feedback for taps, favorites, visited states, and saved actions." />
      <InfoRow icon="volume-medium-outline" title="Interaction sounds" body="Allows native tap sounds where the device supports them." />
    </SettingsCard>
    <SettingsCard>
      <Toggle title="Haptics" subtitle="Vibrate lightly when actions succeed" value={preferences.haptics} onChange={(value) => preferences.setPreference("haptics", value)} />
      <View style={styles.divider} />
      <Toggle title="Interaction sounds" subtitle="Use native click/update sounds when available" value={preferences.interactionSounds} onChange={(value) => preferences.setPreference("interactionSounds", value)} />
      <Button icon="sparkles-outline" onPress={() => preferences.feedback("success")} style={{ marginTop: 14 }}>Test feedback</Button>
    </SettingsCard>
  </SettingsScreen>;
}

function Toggle({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.toggle}>
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
    <Switch value={value} onValueChange={onChange} trackColor={{ false: "#D7DBDD", true: colors.green }} thumbColor="#FFFFFF" />
  </View>;
}

const styles = StyleSheet.create({
  toggle: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: colors.navy, fontSize: 15, fontWeight: "900" },
  subtitle: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.borderSoft }
});
