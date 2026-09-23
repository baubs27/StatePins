import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { SettingsCard, SettingsScreen, InfoRow } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useApp } from "@/context/AppContext";

export default function LocationSettingsScreen() {
  const { requestLocation, location, locationMessage } = useApp();
  const [status, setStatus] = useState<string>("Unknown");

  async function checkPermission() {
    const permission = await Location.getForegroundPermissionsAsync();
    setStatus(permission.status);
    if (permission.status === "denied" && !permission.canAskAgain) {
      Alert.alert("Open phone settings", "Location is blocked at the phone level. Open iPhone/Android Settings, find StateUp, and allow location while using the app.");
    }
  }

  async function requestPermission() {
    await requestLocation();
    await checkPermission();
  }

  return <SettingsScreen eyebrow="PERMISSION" title="Location" subtitle="StateUp uses your location to show where you are on the map and help you find nearby recommendations.">
    <SettingsCard>
      <InfoRow icon="navigate-outline" title="What this unlocks" body="Your blue dot on the U.S. map, nearby state suggestions, and more relevant local recommendations." />
      <InfoRow icon="shield-checkmark-outline" title="How it should be used" body="Ask only while using the app. Do not track location in the background for this prototype." />
      <InfoRow icon="settings-outline" title="If it does not pop up" body="If iOS or Android already blocked it, go to phone Settings > StateUp > Location and choose While Using." />
    </SettingsCard>
    <SettingsCard>
      <Text style={styles.label}>Current app reading</Text>
      <Text style={styles.value}>{location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "No location loaded yet"}</Text>
      {!!locationMessage && <Text style={styles.message}>{locationMessage}</Text>}
      <View style={styles.buttons}>
        <Button icon="location-outline" onPress={requestPermission} style={{ flex: 1 }}>Request location</Button>
        <Button variant="ghost" icon="refresh-outline" onPress={checkPermission}>Check status</Button>
      </View>
      <Text style={styles.status}>Permission status: {status}</Text>
    </SettingsCard>
  </SettingsScreen>;
}

const styles = StyleSheet.create({
  label: { color: colors.grayText, fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  value: { color: colors.navy, fontSize: 18, fontWeight: "900", marginTop: 6 },
  message: { color: colors.grayText, fontSize: 12, lineHeight: 18, marginTop: 8 },
  buttons: { flexDirection: "row", gap: 9, marginTop: 14, flexWrap: "wrap" },
  status: { color: colors.grayText, fontSize: 12, marginTop: 12 }
});
