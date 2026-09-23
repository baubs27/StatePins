import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { colors } from "@/lib/theme";

const pages: { href: string; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }[] = [
  { href: "/settings/location", icon: "location-outline", title: "Location", subtitle: "Blue dot, nearby states, and map permission." },
  { href: "/settings/photos", icon: "camera-outline", title: "Photos & camera", subtitle: "Photo library and camera access for pin uploads." },
  { href: "/settings/notifications", icon: "notifications-outline", title: "Notifications", subtitle: "Comments, upvotes, and itinerary reminders." },
  { href: "/settings/appearance", icon: "contrast-outline", title: "Appearance", subtitle: "System day/night, pastels, and background photos." },
  { href: "/settings/feedback", icon: "sparkles-outline", title: "Tap feedback", subtitle: "Haptics and interaction sounds." },
  { href: "/settings/account", icon: "person-circle-outline", title: "Account", subtitle: "Sign-in, password, guest mode, and security." }
];

export default function SettingsHomeScreen() {
  return <SettingsScreen eyebrow="STATEUP SETTINGS" title="Controls that actually explain themselves." subtitle="Pick a setting to see what it does, why StateUp asks for it, and how to change it.">
    <SettingsCard>
      {pages.map((page, index) => <Pressable key={page.href} onPress={() => router.push(page.href as never)} style={[styles.row, index > 0 && styles.rowBorder]}>
        <View style={styles.icon}><Ionicons name={page.icon} size={21} color={colors.blue} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{page.title}</Text>
          <Text style={styles.subtitle}>{page.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.grayText} />
      </Pressable>)}
    </SettingsCard>
  </SettingsScreen>;
}

const styles = StyleSheet.create({
  row: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  icon: { width: 43, height: 43, borderRadius: 17, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
  title: { color: colors.navy, fontSize: 15, fontWeight: "900" },
  subtitle: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 3 }
});
