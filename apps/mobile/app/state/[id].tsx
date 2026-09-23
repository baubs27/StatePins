import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { colors, softShadow } from "@/lib/theme";
import { AddPinModal } from "@/components/AddPinModal";
import { PinCard } from "@/components/PinCard";
import { StateMap } from "@/components/StateMap";
import { Badge, Button, EmptyState } from "@/components/ui";
import { usePreferences } from "@/context/PreferencesContext";
import { PIN_MAP_GRACE_DAYS, PIN_MAP_UPVOTE_THRESHOLD, isPinVisibleOnMap, sortPinsForMap } from "@/lib/pinVisibility";
import { findStateForCoordinates } from "@/lib/usGeo";

export default function StateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { states, pins, location, favoriteStateIds, favoritePinIds, toggleVisited, toggleSaved, toggleFavoriteState, toggleFavoritePin, addPin } = useApp();
  const { effectiveBackground, background } = usePreferences();
  const [showAdd, setShowAdd] = useState(false);
  const state = states.find((item) => item.id === id);
  if (!state) return null;
  const statePins = pins.filter((pin) => pin.stateId === state.id);
  const mapPins = statePins.filter((pin) => isPinVisibleOnMap(pin)).sort(sortPinsForMap);
  const locationInThisState = location && findStateForCoordinates(location, [state]) ? location : null;
  const saved = statePins.filter((pin) => pin.savedToItinerary).length;
  const favorited = favoriteStateIds.includes(state.id);

  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}>
    <View style={styles.topbar}>
      <Pressable onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.navy} /></Pressable>
      <Text style={styles.topTitle}>{state.name}</Text>
      <Pressable onPress={() => toggleVisited(state.id)} style={[styles.visited, state.visited && styles.visitedOn]}>
        <Ionicons name={state.visited ? "checkmark" : "add"} size={16} color={state.visited ? colors.white : colors.navy} />
        <Text style={[styles.visitedText, state.visited && { color: colors.white }]}>{state.visited ? "Visited" : "Mark visited"}</Text>
      </Pressable>
    </View>

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.destinationHero}>
        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />
        <View style={styles.heading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{state.abbreviation} - LOCAL FIELD NOTES</Text>
            <Text style={styles.title}>{state.name}</Text>
            <Text style={styles.heroCopy}>A living page of blue pins, favorite detours, and places worth crossing a state line for.</Text>
          </View>
          <Badge tone="green">{state.visited ? "Stamped" : "Next up"}</Badge>
        </View>
        <View style={styles.stats}>
          <Stat value={state.visited ? "Yes" : "Not yet"} label="Visited" />
          <Stat value={String(statePins.length)} label="Blue pins" />
          <Stat value={String(saved)} label="Saved" />
        </View>
        <Button variant={favorited ? "secondary" : "ghost"} icon={favorited ? "heart" : "heart-outline"} onPress={() => toggleFavoriteState(state.id)} style={styles.favoriteStateButton}>
          {favorited ? "Favorited state" : "Favorite this state"}
        </Button>
      </View>

      <StateMap state={state} pins={mapPins} location={locationInThisState} />
      <View style={styles.mapRule}>
        <Ionicons name="sparkles-outline" size={16} color={colors.blue} />
        <Text style={styles.mapRuleText}>Pinpoints stay on the map while they are new. After {PIN_MAP_GRACE_DAYS} days, pins need {PIN_MAP_UPVOTE_THRESHOLD}+ upvotes to remain featured here.</Text>
      </View>

      <View style={styles.sectionTitle}>
        <View>
          <Text style={styles.sectionHeading}>Blue pins</Text>
          <Text style={styles.sectionSubtitle}>Places locals would take a friend.</Text>
        </View>
        <Button icon="add" onPress={() => setShowAdd(true)}>Add Pin</Button>
      </View>

      {!statePins.length ? <EmptyState icon="location-outline" title="No blue pins yet" message={`Be the first to recommend somewhere in ${state.name}.`} action={<Button onPress={() => setShowAdd(true)}>Add a recommendation</Button>} /> :
        statePins.map((pin) => <PinCard key={pin.id} pin={pin} onSave={() => toggleSaved(pin.id)} onFavorite={() => toggleFavoritePin(pin.id)} favorited={favoritePinIds.includes(pin.id)} />)}
    </ScrollView>

    <AddPinModal visible={showAdd} state={state} currentLocation={locationInThisState} onClose={() => setShowAdd(false)} onSubmit={addPin} />
  </SafeAreaView>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: { height: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(255,255,255,0.42)" },
  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderSoft },
  topTitle: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  visited: { height: 38, paddingHorizontal: 11, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", gap: 5, alignItems: "center" },
  visitedOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  visitedText: { color: colors.navy, fontSize: 11, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 70, maxWidth: 760, width: "100%", alignSelf: "center" },
  destinationHero: { borderRadius: 32, padding: 18, marginBottom: 16, backgroundColor: "rgba(255,253,248,0.58)", borderWidth: 1, borderColor: "rgba(16,36,62,0.05)", overflow: "hidden", ...softShadow },
  heroOrbOne: { position: "absolute", width: 155, height: 155, borderRadius: 78, backgroundColor: "rgba(36,119,232,0.08)", top: -70, right: -46 },
  heroOrbTwo: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(155,200,164,0.18)", bottom: -82, left: -50 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.navy, fontSize: 34, fontWeight: "900", letterSpacing: -0.9, marginTop: 4 },
  heroCopy: { color: colors.grayText, fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 520 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  favoriteStateButton: { marginTop: 14 },
  stat: { flex: 1, alignItems: "center", borderRadius: 18, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.34)", borderWidth: 1, borderColor: "rgba(16,36,62,0.045)" },
  statValue: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  statLabel: { color: colors.grayText, fontSize: 10, marginTop: 4, fontWeight: "800", textTransform: "uppercase" },
  mapRule: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(255,253,248,0.42)", borderWidth: 1, borderColor: "rgba(16,36,62,0.045)", borderRadius: 18, padding: 12, marginTop: 12, marginBottom: 20 },
  mapRuleText: { color: colors.grayText, fontSize: 12, lineHeight: 17, flex: 1 },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionHeading: { color: colors.navy, fontSize: 22, fontWeight: "900" },
  sectionSubtitle: { color: colors.grayText, fontSize: 12, marginTop: 3 }
});
