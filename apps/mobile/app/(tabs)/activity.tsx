import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { activities } from "@/data/mock";
import { colors } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";

export default function ActivityScreen() {
  const { effectiveBackground, background } = usePreferences();
  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>TRAVEL SIGNALS</Text>
        <Text style={styles.title}>A small feed for the places people cared enough to pin.</Text>
        <Text style={styles.subtitle}>Comments, upvotes, saves, and visit milestones without the endless-scroll fog machine.</Text>
      </View>

      <View style={styles.trail}>
        {activities.map((item, index) => <View key={item.id} style={styles.eventRow}>
          <View style={styles.rail}>
            <View style={[styles.icon, index === 0 && styles.iconActive]}><Ionicons name={item.icon as never} size={19} color={index === 0 ? colors.white : colors.blue} /></View>
            {index < activities.length - 1 && <View style={styles.line} />}
          </View>
          <View style={[styles.event, index === 0 && styles.eventActive]}>
            <Text style={[styles.eventTitle, index === 0 && { color: colors.white }]}>{item.title}</Text>
            <Text style={[styles.meta, index === 0 && { color: "rgba(255,255,255,0.72)" }]}>{item.meta}</Text>
          </View>
        </View>)}
      </View>

      <View style={styles.caughtUp}>
        <Ionicons name="leaf-outline" size={18} color={colors.green} />
        <Text style={styles.end}>You’re all caught up. The map has the next move.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 118, maxWidth: 720, width: "100%", alignSelf: "center" },
  hero: { marginBottom: 24 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: colors.navy, fontSize: 31, lineHeight: 35, fontWeight: "900", letterSpacing: -0.9, marginTop: 7 },
  subtitle: { color: colors.grayText, fontSize: 15, lineHeight: 22, marginTop: 9 },
  trail: { marginTop: 4, borderRadius: 32, paddingTop: 6, paddingRight: 4, backgroundColor: "rgba(255,253,248,0.24)" },
  eventRow: { flexDirection: "row", gap: 13 },
  rail: { width: 44, alignItems: "center" },
  icon: { width: 42, height: 42, borderRadius: 18, backgroundColor: "rgba(36,119,232,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderSoft },
  iconActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  line: { flex: 1, width: 2, backgroundColor: "rgba(16,36,62,0.08)", marginVertical: 8 },
  event: { flex: 1, marginBottom: 16, padding: 16, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.34)", borderWidth: 1, borderColor: "rgba(16,36,62,0.045)" },
  eventActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  eventTitle: { color: colors.navy, fontSize: 15, fontWeight: "900", lineHeight: 20 },
  meta: { color: colors.grayText, fontSize: 12, marginTop: 6 },
  caughtUp: { alignSelf: "center", marginTop: 12, flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "rgba(255,253,248,0.44)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  end: { color: colors.grayText, fontSize: 12, fontWeight: "700" }
});
