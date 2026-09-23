import { PropsWithChildren } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, softShadow } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";

export function SettingsScreen({ eyebrow, title, subtitle, children }: PropsWithChildren<{ eyebrow: string; title: string; subtitle: string }>) {
  const { effectiveBackground, background } = usePreferences();
  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={22} color={colors.navy} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
  </SafeAreaView>;
}

export function SettingsCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function InfoRow({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View style={styles.infoRow}>
    <View style={styles.infoIcon}><Ionicons name={icon} size={19} color={colors.blue} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 13, padding: 18, paddingBottom: 10 },
  back: { width: 44, height: 44, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  title: { color: colors.navy, fontSize: 31, lineHeight: 35, fontWeight: "900", letterSpacing: -0.8, marginTop: 3 },
  subtitle: { color: colors.grayText, fontSize: 14, lineHeight: 20, marginTop: 7 },
  content: { padding: 18, paddingBottom: 70, maxWidth: 720, width: "100%", alignSelf: "center" },
  card: { borderRadius: 28, padding: 16, backgroundColor: "rgba(255,255,255,0.76)", borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 14, ...softShadow },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 10 },
  infoIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
  infoTitle: { color: colors.navy, fontSize: 15, fontWeight: "900" },
  infoBody: { color: colors.grayText, fontSize: 12, lineHeight: 18, marginTop: 3 }
});

export const settingsStyles = styles;
