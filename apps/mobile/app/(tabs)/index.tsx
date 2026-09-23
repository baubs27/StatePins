import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { usePreferences } from "@/context/PreferencesContext";
import { colors } from "@/lib/theme";
import { Button, Card } from "@/components/ui";
import { USMap } from "@/components/USMap";
import { findNearestStateCenter, findStateForCoordinates } from "@/lib/usGeo";

export default function MapScreen() {
  const { states, pins, visitedCount, toggleVisited, requestLocation, location, locationMessage } = useApp();
  const { effectiveBackground, background } = usePreferences();
  const [visitedOnly, setVisitedOnly] = useState(false);
  const percent = Math.round((visitedCount / 50) * 100);
  const nearState = useMemo(() => {
    if (!location) return states.find((state) => state.id === "pa") ?? states[0];
    return findStateForCoordinates(location, states) ?? findNearestStateCenter(location, states);
  }, [location, states]);
  const nearbyPins = pins.filter((pin) => pin.stateId === nearState.id);
  const remaining = 50 - visitedCount;

  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />

      <View style={styles.hero}>
        <View style={styles.compass}><Ionicons name="navigate" size={18} color={colors.blue} /></View>
        <Text style={styles.eyebrow}>STATEUP ATLAS</Text>
        <Text style={styles.title}>Your U.S. map, one good stop at a time.</Text>
        <Text style={styles.subtitle}>Check off states you have visited, then follow local blue pins when you are ready to explore deeper.</Text>
        <View style={styles.tripLine}>
          <Metric value={`${visitedCount}/50`} label="visited" />
          <View style={styles.tripTrack}><View style={[styles.tripFill, { width: `${percent}%` }]} /></View>
          <Metric value={`${remaining}`} label="left" align="right" />
        </View>
      </View>

      <Card style={styles.mapCard}>
        <View style={styles.mapTopline}>
          <View style={styles.mapTitleRow}><View style={styles.greenDot} /><Text style={styles.mapTitle}>Tap states, not menus</Text></View>
          <Text style={styles.mapPercent}>{percent}% explored</Text>
        </View>
        <Text style={styles.mapHint}>Start with the full country, then tap + to zoom in and pan around the small-state details.</Text>
        <USMap states={states} onToggle={toggleVisited} visitedOnly={visitedOnly} currentLocation={location} />
      </Card>

      <View style={styles.belowMap}>
        <View style={styles.legend}>
          <Legend color="#7FD09E" label="Visited" />
          <Legend color="#DDE1E4" label="Not yet" />
          <Legend color="#1598E5" label="You’re here" />
        </View>
        <View style={styles.controls}>
          <Button variant="secondary" icon={location ? "locate" : "navigate-outline"} onPress={requestLocation} style={{ flex: 1 }}>
            {location ? "Update location" : "Use my location"}
          </Button>
          <Button variant={visitedOnly ? "secondary" : "ghost"} icon="checkmark-circle-outline" onPress={() => setVisitedOnly((value) => !value)}>
            Visited only
          </Button>
        </View>
        {!!locationMessage && <Text style={styles.message}>{locationMessage}</Text>}
      </View>

      <Pressable onPress={() => router.push(`/state/${nearState.id}`)} style={styles.nextStop}>
        <View style={styles.nextIcon}><Ionicons name="trail-sign-outline" size={20} color={colors.blue} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nextEyebrow}>{location ? "NEAR YOU" : "GOOD FIRST DETOUR"}</Text>
          <Text style={styles.nextTitle}>{nearState.name}</Text>
          <Text style={styles.nextCopy}>{nearbyPins.length} {nearbyPins.length === 1 ? "recommended place" : "recommended places"} waiting on the state map</Text>
        </View>
        <View style={styles.exploreButton}><Ionicons name="arrow-forward" size={17} color={colors.white} /></View>
      </Pressable>
    </ScrollView>
  </SafeAreaView>;
}

function Metric({ value, label, align = "left" }: { value: string; label: string; align?: "left" | "right" }) {
  return <View style={align === "right" && { alignItems: "flex-end" }}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 10, paddingTop: 18, paddingBottom: 142, maxWidth: 980, width: "100%", alignSelf: "center" },
  blobOne: { position: "absolute", right: -86, top: -72, width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(36,119,232,0.08)" },
  blobTwo: { position: "absolute", left: -74, top: 170, width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(155,200,164,0.14)" },
  hero: { paddingHorizontal: 8, paddingTop: 6, marginBottom: 18 },
  compass: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginBottom: 13, borderWidth: 1, borderColor: colors.borderSoft },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.8 },
  title: { color: colors.navy, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: -1.1, marginTop: 7 },
  subtitle: { color: colors.grayText, fontSize: 15, lineHeight: 22, marginTop: 9, maxWidth: 640 },
  tripLine: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  tripTrack: { flex: 1, height: 8, borderRadius: 99, backgroundColor: "rgba(16,36,62,0.08)", overflow: "hidden" },
  tripFill: { height: "100%", borderRadius: 99, backgroundColor: colors.green },
  metricValue: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  metricLabel: { color: colors.grayText, fontWeight: "800", fontSize: 10, textTransform: "uppercase", marginTop: 2 },
  mapCard: { padding: 6, borderRadius: 34, overflow: "hidden", marginHorizontal: 0, backgroundColor: "rgba(255,253,248,0.64)", borderColor: "rgba(16,36,62,0.045)" },
  mapTopline: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mapTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  greenDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  mapTitle: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  mapPercent: { color: colors.grayText, fontSize: 11, fontWeight: "800" },
  mapHint: { color: colors.grayText, fontSize: 11, lineHeight: 15, paddingHorizontal: 12, paddingBottom: 8 },
  belowMap: { paddingHorizontal: 4 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 15, marginTop: 15 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 6 },
  legendText: { color: colors.grayText, fontSize: 12 },
  controls: { flexDirection: "row", gap: 9, marginTop: 16 },
  message: { color: colors.grayText, fontSize: 12, textAlign: "center", marginTop: 9 },
  nextStop: { marginTop: 42, marginBottom: 10, backgroundColor: colors.navy, borderRadius: 30, padding: 17, flexDirection: "row", gap: 14, alignItems: "center", overflow: "hidden" },
  nextIcon: { width: 44, height: 44, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  nextEyebrow: { color: "#9EC9FF", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  nextTitle: { color: colors.white, fontSize: 20, fontWeight: "900", marginTop: 3 },
  nextCopy: { color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 17, marginTop: 2 },
  exploreButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" }
});
