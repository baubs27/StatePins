import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { BackgroundChoice, pastelBackgrounds, usePreferences } from "@/context/PreferencesContext";
import { enableNotifications } from "@/lib/notifications";
import { colors } from "@/lib/theme";
import { Button, Card } from "./ui";

const swatches: { id: Exclude<BackgroundChoice, "system" | "photo">; label: string }[] = [
  { id: "red", label: "Red" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "yellow", label: "Yellow" },
  { id: "tan", label: "Tan" }
];

export function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const preferences = usePreferences();
  const { user, isGuest, logout, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function updateNotifications(value: boolean) {
    if (!value) {
      preferences.setPreference("notifications", false);
      return;
    }
    try {
      await enableNotifications();
      preferences.setPreference("notifications", true);
    } catch (error) {
      Alert.alert("Notifications are off", error instanceof Error ? error.message : "Permission was not granted.");
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) return Alert.alert("Use a longer password", "Your new password must contain at least 8 characters.");
    try {
      setSavingPassword(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      preferences.feedback("success");
      Alert.alert("Password updated", "Your new password is ready to use.");
    } catch (error) {
      Alert.alert("Couldn’t update password", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingPassword(false);
    }
  }

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>MAKE IT YOURS</Text><Text style={styles.title}>Settings</Text></View>
        <Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={23} color={colors.navy} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="FEEDBACK" subtitle="Choose how StateUp responds when you tap or finish something." />
        <Card style={styles.card}>
          <ToggleRow icon="phone-portrait-outline" title="Haptics" subtitle="Gentle vibration for taps and updates" value={preferences.haptics} onChange={(value) => preferences.setPreference("haptics", value)} />
          <View style={styles.divider} />
          <ToggleRow icon="volume-medium-outline" title="Interaction sounds" subtitle="Native tap and update sounds where supported" value={preferences.interactionSounds} onChange={(value) => preferences.setPreference("interactionSounds", value)} />
          <View style={styles.divider} />
          <ToggleRow icon="notifications-outline" title="Notifications" subtitle="Comments, upvotes, and itinerary reminders" value={preferences.notifications} onChange={updateNotifications} />
        </Card>

        <SectionTitle title="BACKGROUND" subtitle="Follow your phone, choose a pastel, or use one of your photos." />
        <Card style={styles.backgroundCard}>
          <Pressable onPress={() => preferences.setPreference("background", "system")} style={[styles.systemChoice, preferences.background === "system" && styles.selectedChoice]}>
            <Ionicons name="contrast-outline" size={21} color={colors.navy} />
            <View style={{ flex: 1 }}><Text style={styles.rowTitle}>Match phone appearance</Text><Text style={styles.rowSubtitle}>Changes automatically with day and night mode</Text></View>
            {preferences.background === "system" && <Ionicons name="checkmark-circle" size={21} color={colors.blue} />}
          </Pressable>
          <View style={styles.swatches}>
            {swatches.map((swatch) => <Pressable
              key={swatch.id}
              accessibilityLabel={`Pastel ${swatch.label} background`}
              onPress={() => preferences.setPreference("background", swatch.id)}
              style={[styles.swatchWrap, preferences.background === swatch.id && styles.swatchSelected]}
            >
              <View style={[styles.swatch, { backgroundColor: pastelBackgrounds[swatch.id] }]} />
              <Text style={styles.swatchLabel}>{swatch.label}</Text>
            </Pressable>)}
          </View>
          <Button variant={preferences.background === "photo" ? "secondary" : "ghost"} icon="image-outline" onPress={preferences.chooseBackgroundPhoto}>
            {preferences.background === "photo" ? "Change background photo" : "Choose a background photo"}
          </Button>
        </Card>

        <SectionTitle title="ACCOUNT" subtitle={isGuest ? "Guest activity stays on this device." : "Manage your sign-in and security."} />
        <Card style={styles.card}>
          {(!user || isGuest) ? <>
            <Text style={styles.accountCopy}>Create or sign in to an account when you want your map and itinerary available on other devices.</Text>
            <Button onPress={() => { onClose(); router.push("/auth"); }}>Sign in or create account</Button>
          </> : <>
            <Text style={styles.signedIn}>Signed in as <Text style={{ fontWeight: "900" }}>{user.email}</Text></Text>
            <TextInput secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#929AA3" style={styles.input} />
            <TextInput secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="New password (8+ characters)" placeholderTextColor="#929AA3" style={styles.input} />
            <Button loading={savingPassword} disabled={!currentPassword || !newPassword} onPress={savePassword}>Update password</Button>
            <Button variant="ghost" icon="log-out-outline" onPress={async () => { await logout(); onClose(); }}>Sign out</Button>
          </>}
        </Card>
        <Text style={styles.footer}>Settings save automatically on this device.</Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

function ToggleRow({ icon, title, subtitle, value, onChange }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void | Promise<void>;
}) {
  return <View style={styles.toggleRow}>
    <View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.navy} /></View>
    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View>
    <Switch value={value} onValueChange={onChange} trackColor={{ false: "#D7DBDD", true: colors.green }} thumbColor="#FFFFFF" />
  </View>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionLabel}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.blue, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.navy, fontSize: 27, fontWeight: "900", marginTop: 2 },
  close: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  content: { padding: 20, paddingBottom: 50, maxWidth: 660, width: "100%", alignSelf: "center" },
  sectionTitle: { marginTop: 12, marginBottom: 10, paddingHorizontal: 4 },
  sectionLabel: { color: colors.navy, fontSize: 12, fontWeight: "900", letterSpacing: 1.1 },
  sectionSubtitle: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 4 },
  card: { paddingHorizontal: 17, paddingVertical: 5, marginBottom: 12 },
  backgroundCard: { padding: 16, gap: 14, marginBottom: 12 },
  toggleRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: "#F1F1EF", alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.navy, fontWeight: "800", fontSize: 14 },
  rowSubtitle: { color: colors.grayText, fontSize: 11, lineHeight: 15, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 51 },
  systemChoice: { minHeight: 65, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  selectedChoice: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  swatches: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  swatchWrap: { alignItems: "center", padding: 5, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.blue },
  swatch: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: "rgba(16,36,62,0.12)" },
  swatchLabel: { color: colors.grayText, fontSize: 9, fontWeight: "700", marginTop: 4 },
  accountCopy: { color: colors.grayText, lineHeight: 20, marginVertical: 12 },
  signedIn: { color: colors.grayText, fontSize: 13, marginVertical: 12 },
  input: { height: 50, backgroundColor: "#FAFAF8", borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.navy, marginBottom: 10 },
  footer: { textAlign: "center", color: colors.grayText, fontSize: 11, marginTop: 12 }
});
