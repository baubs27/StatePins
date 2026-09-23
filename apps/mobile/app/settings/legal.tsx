import { Linking, StyleSheet, Text } from "react-native";
import { InfoRow, SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";

const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL;
const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL;

export default function LegalSettingsScreen() {
  return <SettingsScreen eyebrow="PRIVACY" title="Terms & privacy" subtitle="How StateUp handles account information, location, photos, and community content.">
    <SettingsCard>
      <InfoRow icon="lock-closed-outline" title="Private account data" body="Email, password hashes, sessions, private friends, and saved itinerary items are not public. Passwords never leave the API as readable text." />
      <InfoRow icon="location-outline" title="Location" body="Current location is optional and stays on the device unless you deliberately post a recommendation at chosen coordinates." />
      <InfoRow icon="images-outline" title="Public posts" body="Profile names, recommendations, selected coordinates, photos, comments, vote counts, and chat messages can be visible to others." />
      <InfoRow icon="trash-outline" title="Deletion" body="Account settings can permanently delete the profile and associated user-generated content." />
    </SettingsCard>
    <SettingsCard>
      <Text style={styles.copy}>The operator must configure public HTTPS versions of these documents before store submission.</Text>
      <Button disabled={!privacyUrl} onPress={() => privacyUrl && Linking.openURL(privacyUrl)}>Open privacy policy</Button>
      <Button variant="ghost" disabled={!termsUrl} onPress={() => termsUrl && Linking.openURL(termsUrl)}>Open terms of service</Button>
    </SettingsCard>
  </SettingsScreen>;
}

const styles = StyleSheet.create({ copy: { color: colors.grayText, lineHeight: 20, marginBottom: 14 } });
