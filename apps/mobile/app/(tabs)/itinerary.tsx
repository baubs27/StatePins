import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { colors } from "@/lib/theme";
import { EmptyState } from "@/components/ui";
import { PinCard } from "@/components/PinCard";
import { usePreferences } from "@/context/PreferencesContext";

export default function ItineraryScreen() {
  const { savedPins, states, favoritePinIds, toggleSaved, toggleFavoritePin } = useApp();
  const { effectiveBackground, background } = usePreferences();
  const grouped = savedPins.reduce<Record<string, typeof savedPins>>((result, pin) => {
    (result[pin.stateId] ??= []).push(pin);
    return result;
  }, {});
  const stateNames = Object.keys(grouped).map((id) => states.find((state) => state.id === id)?.abbreviation.toUpperCase() ?? id.toUpperCase());

  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>TRIP POCKET</Text>
          <Text style={styles.title}>Saved stops that are starting to look like a route.</Text>
        </View>
        <View style={styles.countBubble}><Text style={styles.countValue}>{savedPins.length}</Text><Text style={styles.countLabel}>stops</Text></View>
      </View>

      {!!savedPins.length && <View style={styles.routeCard}>
        <View style={styles.routeIcon}><Ionicons name="map-outline" size={20} color={colors.blue} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.routeTitle}>{stateNames.join(" → ")}</Text>
          <Text style={styles.routeCopy}>A lightweight itinerary for places you actually want to remember.</Text>
        </View>
      </View>}

      {!savedPins.length ? <EmptyState icon="map-outline" title="No places saved yet." message="Open a state, tap a blue pin, and save it when it feels worth the detour." /> :
        Object.entries(grouped).map(([stateId, pins], groupIndex) => {
          const state = states.find((item) => item.id === stateId);
          return <View key={stateId} style={styles.groupWrap}>
            <View style={styles.routeRail}>
              <View style={styles.railDot}><Text style={styles.railDotText}>{groupIndex + 1}</Text></View>
              <View style={styles.railLine} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.group}>
                <View>
                  <Text style={styles.groupTitle}>{state?.name ?? stateId.toUpperCase()}</Text>
                  <Text style={styles.groupSubtitle}>{pins.length} {pins.length === 1 ? "saved stop" : "saved stops"}</Text>
                </View>
                <Text style={styles.groupCode}>{state?.abbreviation ?? stateId.toUpperCase()}</Text>
              </View>
              {pins.map((pin) => <PinCard key={pin.id} pin={pin} onSave={() => toggleSaved(pin.id)} onFavorite={() => toggleFavoritePin(pin.id)} favorited={favoritePinIds.includes(pin.id)} />)}
            </View>
          </View>;
        })}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 118, maxWidth: 760, width: "100%", alignSelf: "center" },
  hero: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: colors.navy, fontSize: 31, lineHeight: 35, fontWeight: "900", letterSpacing: -0.9, marginTop: 7, maxWidth: 520, flexShrink: 1 },
  countBubble: { width: 74, height: 74, borderRadius: 28, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  countValue: { color: colors.white, fontSize: 23, fontWeight: "900" },
  countLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "800", marginTop: 1 },
  routeCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15, borderRadius: 28, backgroundColor: "rgba(255,253,248,0.46)", borderWidth: 1, borderColor: "rgba(16,36,62,0.045)", marginBottom: 24 },
  routeIcon: { width: 44, height: 44, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
  routeTitle: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  routeCopy: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 3 },
  groupWrap: { flexDirection: "row", gap: 13, marginBottom: 4 },
  routeRail: { width: 30, alignItems: "center" },
  railDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  railDotText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  railLine: { flex: 1, width: 2, backgroundColor: "rgba(16,36,62,0.07)", marginTop: 8, marginBottom: 18 },
  group: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  groupTitle: { color: colors.navy, fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },
  groupSubtitle: { color: colors.grayText, fontSize: 12, marginTop: 3 },
  groupCode: { color: colors.blue, fontSize: 12, fontWeight: "900", backgroundColor: colors.blueSoft, overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }
});
