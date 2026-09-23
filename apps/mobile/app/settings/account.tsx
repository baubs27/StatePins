import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { InfoRow, SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useApp } from "@/context/AppContext";

export default function AccountSettingsScreen() {
  const { user, isGuest, logout, changePassword, changeEmail, deleteAccount } = useAuth();
  const { clearLocalData } = useApp();
  const preferences = usePreferences();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function savePassword() {
    if (!strongPassword(newPassword)) return Alert.alert("Use a stronger password", "Use 10+ characters with uppercase, lowercase, a number, and a symbol.");
    try {
      setSaving(true);
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      preferences.feedback("success");
      Alert.alert("Password updated", "Your new password is ready to use.");
    } catch (error) {
      Alert.alert("Could not update password", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEmail() {
    if (!newEmail.includes("@")) return Alert.alert("Invalid email", "Enter a valid email address.");
    try {
      setSaving(true);
      await changeEmail(emailPassword, newEmail);
      setEmailPassword("");
      preferences.feedback("success");
      Alert.alert("Email updated", "Use your new email the next time you sign in.");
    } catch (error) {
      Alert.alert("Could not update email", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  }

  function confirmDelete() {
    if (deleteConfirmation !== "DELETE" || (user?.hasPassword !== false && !deletePassword)) return Alert.alert("Confirmation required", user?.hasPassword === false ? "Type DELETE exactly." : "Enter your password and type DELETE exactly.");
    Alert.alert("Permanently delete account?", "Your profile, pins, photos, comments, votes, friends, and saved places will be permanently deleted. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete forever", style: "destructive", onPress: async () => {
        try {
          setSaving(true);
          await deleteAccount(deletePassword);
          await clearLocalData();
          router.replace("/auth");
        } catch (error) {
          Alert.alert("Could not delete account", error instanceof Error ? error.message : "Please try again.");
        } finally { setSaving(false); }
      } }
    ]);
  }

  return <SettingsScreen eyebrow="SECURITY" title="Account" subtitle={isGuest ? "Guest activity stays on this device." : "Manage sign-in, password, and account security."}>
    <SettingsCard>
      <InfoRow icon="person-circle-outline" title="Current mode" body={user ? `Signed in as ${user.email || user.username}` : "You are not signed in yet."} />
      <InfoRow icon="cloud-upload-outline" title="Why sign in later" body="A production account can sync your map, passport favorites, itinerary, comments, and uploaded recommendations across devices." />
    </SettingsCard>
    <SettingsCard>
      {(!user || isGuest) ? <>
        <Text style={styles.copy}>Create or sign in to an account when you want your StateUp activity available on other devices.</Text>
        <Button onPress={() => router.push("/auth")}>Sign in or create account</Button>
      </> : user.hasPassword === false ? <>
        <Text style={styles.copy}>This account uses Apple or Google sign-in. Password changes are managed by that provider.</Text>
        <Button variant="ghost" icon="log-out-outline" onPress={logout}>Sign out</Button>
      </> : <>
        <TextInput secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#929AA3" style={styles.input} />
        <TextInput secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="New strong password (10+ characters)" placeholderTextColor="#929AA3" style={styles.input} />
        <View style={styles.buttons}>
          <Button loading={saving} disabled={!currentPassword || !newPassword} onPress={savePassword} style={{ flex: 1 }}>Update password</Button>
          <Button variant="ghost" icon="log-out-outline" onPress={logout}>Sign out</Button>
        </View>
      </>}
    </SettingsCard>
    {!!user && !isGuest && user.hasPassword !== false && <SettingsCard>
      <Text style={styles.heading}>Change email</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" value={newEmail} onChangeText={setNewEmail} placeholder="New email" placeholderTextColor="#929AA3" style={styles.input} />
      <TextInput secureTextEntry value={emailPassword} onChangeText={setEmailPassword} placeholder="Current password" placeholderTextColor="#929AA3" style={styles.input} />
      <Button loading={saving} disabled={!emailPassword || !newEmail} onPress={saveEmail}>Update email</Button>
    </SettingsCard>}
    {!!user && !isGuest && <SettingsCard>
      <Text style={styles.dangerHeading}>Delete account and data</Text>
      <Text style={styles.copy}>This permanently removes your profile and associated user-generated content. It cannot be undone.</Text>
      {user.hasPassword !== false && <TextInput secureTextEntry value={deletePassword} onChangeText={setDeletePassword} placeholder="Current password" placeholderTextColor="#929AA3" style={styles.input} />}
      <TextInput autoCapitalize="characters" value={deleteConfirmation} onChangeText={setDeleteConfirmation} placeholder="Type DELETE" placeholderTextColor="#929AA3" style={styles.input} />
      <Button variant="danger" loading={saving} disabled={(user.hasPassword !== false && !deletePassword) || deleteConfirmation !== "DELETE"} onPress={confirmDelete}>Permanently delete account</Button>
    </SettingsCard>}
  </SettingsScreen>;
}

const styles = StyleSheet.create({
  copy: { color: colors.grayText, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  input: { height: 50, backgroundColor: "#FAFAF8", borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 14, color: colors.navy, marginBottom: 10 },
  buttons: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  heading: { color: colors.navy, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  dangerHeading: { color: colors.coral, fontSize: 17, fontWeight: "900", marginBottom: 8 }
});

function strongPassword(value: string) {
  return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}
