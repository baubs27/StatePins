import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { InfoRow, SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import { enableNotifications } from "@/lib/notifications";
import { usePreferences } from "@/context/PreferencesContext";

export default function NotificationSettingsScreen() {
  const preferences = usePreferences();
  const [status, setStatus] = useState("Unknown");

  async function checkStatus() {
    const permission = await Notifications.getPermissionsAsync();
    setStatus(permission.status);
  }

  async function requestNotifications() {
    try {
      await enableNotifications();
      preferences.setPreference("notifications", true);
      await checkStatus();
    } catch (error) {
      preferences.setPreference("notifications", false);
      Alert.alert("Notifications are off", error instanceof Error ? error.message : "Permission was not granted.");
    }
  }

  return <SettingsScreen eyebrow="PERMISSION" title="Notifications" subtitle="StateUp can notify you about comments, upvotes, and saved itinerary reminders.">
    <SettingsCard>
      <InfoRow icon="chatbubble-ellipses-outline" title="Social activity" body="Future production notifications can cover comments, replies, upvotes, and saved pin updates." />
      <InfoRow icon="calendar-outline" title="Trip reminders" body="Itinerary reminders can be added later without changing the permission explanation." />
      <InfoRow icon="hand-left-outline" title="User control" body="Notifications should stay off until the user chooses to enable them." />
    </SettingsCard>
    <SettingsCard>
      <Text style={styles.status}>Phone permission: {status}</Text>
      <Text style={styles.status}>In-app preference: {preferences.notifications ? "On" : "Off"}</Text>
      <View style={styles.buttons}>
        <Button icon="notifications-outline" onPress={requestNotifications} style={{ flex: 1 }}>Enable notifications</Button>
        <Button variant="ghost" icon="notifications-off-outline" onPress={() => preferences.setPreference("notifications", false)}>Turn off in app</Button>
      </View>
      <Button variant="secondary" icon="refresh-outline" onPress={checkStatus}>Check phone status</Button>
    </SettingsCard>
  </SettingsScreen>;
}

const styles = StyleSheet.create({
  status: { color: colors.navy, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  buttons: { flexDirection: "row", gap: 9, marginVertical: 10, flexWrap: "wrap" }
});
