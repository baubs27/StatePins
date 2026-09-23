import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { colors, shadow, softShadow } from "@/lib/theme";
import { Button } from "@/components/ui";
import { Pin, USState } from "@/types";

const passportInk = "#173151";
const passportPaper = "#FFF7E8";
const passportGold = "#D6AA4D";

export default function ProfileScreen() {
  const {
    visitedCount,
    states,
    pins,
    savedPins,
    favoriteStateIds,
    favoritePinIds,
    favoriteLocationKeys,
    clearLocalData,
    toggleFavoriteState,
    toggleFavoritePin,
    toggleFavoriteLocation
  } = useApp();
  const { user, isGuest, logout } = useAuth();
  const { effectiveBackground, background, feedback } = usePreferences();
  const [stateQuery, setStateQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [pinQuery, setPinQuery] = useState("");
  const displayName = user?.displayName ?? "StateUp Traveler";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const issuedNumber = formatPassportNumber(user?.passportNumber ?? simulatedPassportNumber(user?.id || user?.email || "guest"));
  const userPins = pins.filter((pin) => pin.recommendedBy === "you");
  const stats: [string, string][] = [
    [`${visitedCount}/50`, "States stamped"],
    [String(userPins.length), "Pins posted"],
    [String(savedPins.length), "Saved stops"],
    [String(pins.reduce((sum, pin) => sum + pin.upvotes, 0)), "Community votes"]
  ];

  const favoriteStates = useMemo(() => favoriteStateIds.map((id) => states.find((state) => state.id === id)).filter(Boolean) as USState[], [favoriteStateIds, states]);

  const favoriteLocations = useMemo(() => {
    const seen = new Set<string>();
    return favoriteLocationKeys.map((key) => pins.find((pin) => locationKey(pin) === key)).filter((pin) => {
      if (!pin) return false;
      const key = locationKey(pin);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) as Pin[];
  }, [favoriteLocationKeys, pins]);

  const favoriteRecommendations = useMemo(() => {
    return favoritePinIds.map((id) => pins.find((pin) => pin.id === id)).filter(Boolean) as Pin[];
  }, [favoritePinIds, pins]);

  const stateResults = useMemo(() => {
    const query = stateQuery.trim().toLowerCase();
    if (!query) return [];
    return states.filter((state) => `${state.name} ${state.abbreviation}`.toLowerCase().includes(query)).slice(0, 5);
  }, [stateQuery, states]);

  const placeResults = useMemo(() => {
    const query = placeQuery.trim().toLowerCase();
    if (!query) return [];
    const seen = new Set<string>();
    return pins.filter((pin) => {
      const state = states.find((item) => item.id === pin.stateId);
      const searchable = `${pin.name} ${pin.city} ${state?.name ?? ""} ${state?.abbreviation ?? ""} ${pin.category}`.toLowerCase();
      const key = locationKey(pin);
      if (!searchable.includes(query) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, [pins, placeQuery, states]);

  const pinResults = useMemo(() => {
    const query = pinQuery.trim().toLowerCase();
    if (!query) return [];
    return pins.filter((pin) => {
      const state = states.find((item) => item.id === pin.stateId);
      return `${pin.name} ${pin.city} ${state?.name ?? ""} ${state?.abbreviation ?? ""} ${pin.category}`.toLowerCase().includes(query);
    }).slice(0, 5);
  }, [pinQuery, pins, states]);

  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.eyebrow}>STATEUP PASSPORT</Text>
          <Text style={styles.title}>Your travel book</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
            onPress={() => { feedback(); router.push("/settings" as never); }}
          style={styles.gear}
        >
          <Ionicons name="settings-outline" size={23} color={passportInk} />
        </Pressable>
      </View>

      <View style={styles.passportBook}>
        <View style={styles.passportCover}>
          <View style={styles.coverBorder}>
            <Text style={styles.coverSmall}>UNITED STATES OF GOOD STOPS</Text>
            <Text style={styles.coverTitle}>StateUp</Text>
            <View style={styles.coverSeal}>
              <Ionicons name="compass-outline" size={38} color={passportGold} />
            </View>
            <Text style={styles.coverCode}>PASSPORT NO. SU-{issuedNumber}</Text>
          </View>
        </View>

        <View style={styles.passportPage}>
          <View style={styles.pagePatternOne} />
          <View style={styles.pagePatternTwo} />
          <View style={styles.pageHeader}>
            <View>
              <Text style={styles.pageLabel}>Traveler ID</Text>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.handle}>{isGuest ? "Guest mode - saved locally" : user ? `@${user.username}` : "Local demo profile"}</Text>
            </View>
            <View style={styles.avatarFrame}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials || "SP"}</Text></View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {stats.map(([value, label]) => <View key={label} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>)}
          </View>

          <View style={styles.actionRow}>
            {user
              ? <Button variant="ghost" onPress={logout}>{isGuest ? "Exit guest" : "Sign out"}</Button>
              : <Button onPress={() => router.push("/auth")}>Sign in</Button>}
            <Button variant="secondary" icon="map-outline" onPress={() => router.push("/")}>Open map</Button>
          </View>
        </View>
      </View>

      <PassportSection
        title="Favorite states"
        subtitle="Your stamped states, styled like border-control marks."
        empty="Mark states visited on the map to start this page."
        actionLabel="Add states"
        actionIcon="add-circle-outline"
        onAction={() => router.push("/")}
        tools={<StateFavoriteSearch query={stateQuery} onChange={setStateQuery} results={stateResults} favoriteStateIds={favoriteStateIds} onToggle={toggleFavoriteState} />}
      >
        {favoriteStates.map((state, index) => <StateStamp key={state.id} state={state} index={index} onToggleFavorite={() => toggleFavoriteState(state.id)} />)}
      </PassportSection>

      <PassportSection
        title="Favorite locations"
        subtitle="Cities and stops you keep coming back to."
        empty="Save blue pins to build a favorite-location shelf."
        actionLabel="Find places"
        actionIcon="search-outline"
        onAction={() => setPlaceQuery(placeQuery ? "" : " ")}
        tools={<PlaceFavoriteSearch query={placeQuery} onChange={setPlaceQuery} results={placeResults} favoriteLocationKeys={favoriteLocationKeys} onToggle={toggleFavoriteLocation} />}
      >
        {favoriteLocations.map((pin, index) => <LocationBubble key={locationKey(pin)} pin={pin} index={index} onToggleFavorite={() => toggleFavoriteLocation(locationKey(pin))} />)}
      </PassportSection>

      <PassportSection
        title="Pinned recommendations"
        subtitle="Your favorite blue pins, kept handy like passport stickers."
        empty="Favorite a recommendation to pin it here. Itinerary saves are separate."
        actionLabel="Find pins"
        actionIcon="search-outline"
        onAction={() => setPinQuery(pinQuery ? "" : " ")}
        tools={<PinFavoriteSearch query={pinQuery} onChange={setPinQuery} results={pinResults} favoritePinIds={favoritePinIds} onToggle={toggleFavoritePin} />}
      >
        {favoriteRecommendations.map((pin, index) => <RecommendationSticker key={pin.id} pin={pin} index={index} onToggleFavorite={() => toggleFavoritePin(pin.id)} />)}
      </PassportSection>

      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Text style={styles.sectionTitle}>Passport controls</Text>
          <Text style={styles.sectionCopy}>Comfort, privacy, and account settings.</Text>
        </View>
        <Setting icon="location-outline" title="Location permissions" subtitle="Show your blue dot and nearby picks" onPress={() => router.push("/settings/location" as never)} />
        <Setting icon="camera-outline" title="Photos & camera" subtitle="Photo picker and camera permissions" onPress={() => router.push("/settings/photos" as never)} />
        <Setting icon="notifications-outline" title="Notifications" subtitle="Comments, upvotes, and reminders" onPress={() => router.push("/settings/notifications" as never)} />
        <Setting icon="person-circle-outline" title="Password & account" subtitle="Sign-in, guest mode, and password" onPress={() => router.push("/settings/account" as never)} />
        <Setting icon="people-outline" title="Friends" subtitle="Search, requests, and your private friend list" onPress={() => router.push("/friends" as never)} />
        <Setting icon="document-text-outline" title="Terms & privacy" subtitle="Data use, community rules, and legal links" onPress={() => router.push("/settings/legal" as never)} />
      </View>

      <Button variant="danger" icon="trash-outline" onPress={() => Alert.alert(
        "Clear local data?",
        "This resets visited states, saved places, and demo activity.",
        [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: clearLocalData }]
      )}>Clear local data</Button>
      <Text style={styles.version}>StateUp 1.0.0 - Made for the long way home</Text>
    </ScrollView>
  </SafeAreaView>;
}

function PassportSection({ title, subtitle, empty, actionLabel, actionIcon, onAction, tools, children }: {
  title: string;
  subtitle: string;
  empty: string;
  actionLabel: string;
  actionIcon: keyof typeof Ionicons.glyphMap;
  onAction: () => void;
  tools?: ReactNode;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCopy}>{subtitle}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onAction} style={styles.addButton}>
        <Ionicons name={actionIcon} size={16} color={colors.blue} />
        <Text style={styles.addButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
    {tools}
    {hasChildren ? <View style={styles.bubbleWrap}>{children}</View> : <Text style={styles.emptyText}>{empty}</Text>}
  </View>;
}

function StateFavoriteSearch({ query, onChange, results, favoriteStateIds, onToggle }: {
  query: string;
  onChange: (value: string) => void;
  results: USState[];
  favoriteStateIds: string[];
  onToggle: (stateId: string) => void;
}) {
  return <View style={styles.searchPanel}>
    <View style={styles.searchBox}><Ionicons name="search-outline" size={17} color={colors.grayText} /><TextInput value={query} onChangeText={onChange} placeholder="Search a state to favorite" placeholderTextColor="#939AA2" style={styles.searchInput} /></View>
    {!!query.trim() && <View style={styles.resultList}>
      {results.length ? results.map((state) => {
        const active = favoriteStateIds.includes(state.id);
        return <Pressable key={state.id} style={styles.resultRow} onPress={() => onToggle(state.id)}>
          <View style={styles.resultIcon}><Text style={styles.resultCode}>{state.abbreviation}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.resultTitle}>{state.name}</Text><Text style={styles.resultMeta}>{active ? "Favorited state" : "Tap to favorite this state"}</Text></View>
          <Ionicons name={active ? "heart" : "heart-outline"} size={20} color={active ? colors.coral : colors.grayText} />
        </Pressable>;
      }) : <Text style={styles.noResults}>No states found.</Text>}
    </View>}
  </View>;
}

function PlaceFavoriteSearch({ query, onChange, results, favoriteLocationKeys, onToggle }: {
  query: string;
  onChange: (value: string) => void;
  results: Pin[];
  favoriteLocationKeys: string[];
  onToggle: (locationKey: string) => void;
}) {
  return <View style={styles.searchPanel}>
    <View style={styles.searchBox}><Ionicons name="search-outline" size={17} color={colors.grayText} /><TextInput value={query} onChangeText={onChange} placeholder="Search by place, city, or state" placeholderTextColor="#939AA2" style={styles.searchInput} /></View>
    {!!query.trim() && <View style={styles.resultList}>
      {results.length ? results.map((pin) => {
        const key = locationKey(pin);
        const active = favoriteLocationKeys.includes(key);
        return <Pressable key={key} style={styles.resultRow} onPress={() => onToggle(key)}>
          <View style={styles.resultIcon}><Ionicons name="location" size={16} color={colors.blue} /></View>
          <View style={{ flex: 1 }}><Text style={styles.resultTitle}>{pin.city}</Text><Text style={styles.resultMeta}>Found from {pin.name}</Text></View>
          <Ionicons name={active ? "heart" : "heart-outline"} size={20} color={active ? colors.coral : colors.grayText} />
        </Pressable>;
      }) : <Text style={styles.noResults}>No places found. Try a city, state, or recommendation name.</Text>}
    </View>}
  </View>;
}

function PinFavoriteSearch({ query, onChange, results, favoritePinIds, onToggle }: {
  query: string;
  onChange: (value: string) => void;
  results: Pin[];
  favoritePinIds: string[];
  onToggle: (pinId: string) => void;
}) {
  return <View style={styles.searchPanel}>
    <View style={styles.searchBox}><Ionicons name="search-outline" size={17} color={colors.grayText} /><TextInput value={query} onChangeText={onChange} placeholder="Search pinpoints by name or city" placeholderTextColor="#939AA2" style={styles.searchInput} /></View>
    {!!query.trim() && <View style={styles.resultList}>
      {results.length ? results.map((pin) => {
        const active = favoritePinIds.includes(pin.id);
        return <Pressable key={pin.id} style={styles.resultRow} onPress={() => onToggle(pin.id)}>
          <View style={styles.resultIcon}><Ionicons name="pin" size={16} color={colors.blue} /></View>
          <View style={{ flex: 1 }}><Text style={styles.resultTitle}>{pin.name}</Text><Text style={styles.resultMeta}>{pin.city} - {pin.upvotes} upvotes</Text></View>
          <Ionicons name={active ? "heart" : "heart-outline"} size={20} color={active ? colors.coral : colors.grayText} />
        </Pressable>;
      }) : <Text style={styles.noResults}>No pinpoints found.</Text>}
    </View>}
  </View>;
}

function StateStamp({ state, index, onToggleFavorite }: { state: USState; index: number; onToggleFavorite: () => void }) {
  const colorsForStamp = [styles.stampGreen, styles.stampBlue, styles.stampClay, styles.stampGold];
  return <Pressable onPress={() => router.push(`/state/${state.id}`)} style={[styles.stateStamp, colorsForStamp[index % colorsForStamp.length], { transform: [{ rotate: index % 2 ? "2deg" : "-2deg" }] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${state.name} from favorites`} onPress={onToggleFavorite} style={styles.miniHeart}><Ionicons name="heart" size={12} color={colors.coral} /></Pressable>
    <Text style={styles.stateAbbr}>{state.abbreviation}</Text>
    <Text style={styles.stateName}>{state.name}</Text>
    <Text style={styles.stampTiny}>{state.visited ? "VISITED" : "FAVORITE"}</Text>
  </Pressable>;
}

function LocationBubble({ pin, index, onToggleFavorite }: { pin: Pin; index: number; onToggleFavorite: () => void }) {
  return <Pressable onPress={() => router.push(`/state/${pin.stateId}`)} style={[styles.locationBubble, index % 2 ? styles.locationBubbleAlt : null]}>
    <Ionicons name="location" size={14} color={index % 2 ? colors.navy : colors.blue} />
    <Text style={styles.locationText}>{pin.city}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${pin.city} from favorite locations`} onPress={onToggleFavorite} style={styles.inlineHeart}><Ionicons name="heart" size={13} color={colors.coral} /></Pressable>
  </Pressable>;
}

function RecommendationSticker({ pin, index, onToggleFavorite }: { pin: Pin; index: number; onToggleFavorite: () => void }) {
  return <Pressable onPress={() => router.push(`/pin/${pin.id}`)} style={[styles.recommendation, index % 2 ? styles.recommendationAlt : null]}>
    <View style={styles.stickerIcon}><Ionicons name="pin" size={15} color={colors.white} /></View>
    <View style={{ flex: 1 }}>
      <Text style={styles.recommendationTitle} numberOfLines={1}>{pin.name}</Text>
      <Text style={styles.recommendationMeta}>{pin.city} - {pin.upvotes} upvotes</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${pin.name} from favorites`} onPress={onToggleFavorite} style={styles.stickerHeart}><Ionicons name="heart" size={18} color={colors.coral} /></Pressable>
  </Pressable>;
}

function Setting({ icon, title, subtitle, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return <Pressable style={styles.setting} onPress={onPress}>
    <View style={styles.settingIcon}><Ionicons name={icon} size={20} color={colors.blue} /></View>
    <View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingSubtitle}>{subtitle}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={colors.grayText} />
  </Pressable>;
}

function formatPassportNumber(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(6, "0");
}

function simulatedPassportNumber(seed: string) {
  if (seed === "guest") return 0;
  if (seed === "demo-local") return 1;
  let hash = 0;
  for (const char of seed.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 900000;
  return hash + 1000;
}

function locationKey(pin: Pin) {
  return `${pin.city.trim().toLowerCase()}::${pin.stateId}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 122, maxWidth: 760, width: "100%", alignSelf: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.7 },
  title: { color: colors.navy, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  gear: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center", ...softShadow },
  passportBook: { gap: 0, borderRadius: 34, marginBottom: 18, overflow: "hidden", backgroundColor: passportInk, ...shadow },
  passportCover: { backgroundColor: passportInk, padding: 15 },
  coverBorder: { minHeight: 190, borderRadius: 24, borderWidth: 1.5, borderColor: "rgba(214,170,77,0.72)", alignItems: "center", justifyContent: "center", padding: 18 },
  coverSmall: { color: "rgba(255,238,195,0.78)", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textAlign: "center" },
  coverTitle: { color: "#FFEEC3", fontSize: 38, fontWeight: "900", letterSpacing: 0.8, marginTop: 8 },
  coverSeal: { width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, borderColor: "rgba(214,170,77,0.75)", alignItems: "center", justifyContent: "center", marginVertical: 18 },
  coverCode: { color: "rgba(255,238,195,0.74)", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  passportPage: { backgroundColor: passportPaper, padding: 17, borderTopWidth: 1, borderTopColor: "rgba(214,170,77,0.34)", overflow: "hidden" },
  pagePatternOne: { position: "absolute", right: -42, top: -32, width: 145, height: 145, borderRadius: 73, borderWidth: 1, borderColor: "rgba(36,119,232,0.12)" },
  pagePatternTwo: { position: "absolute", left: -32, bottom: -52, width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: "rgba(155,200,164,0.18)" },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  pageLabel: { color: colors.warning, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  name: { color: passportInk, fontSize: 24, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
  handle: { color: colors.grayText, fontSize: 12, marginTop: 3 },
  avatarFrame: { width: 78, height: 90, borderRadius: 17, backgroundColor: "#EFE3CA", borderWidth: 1, borderColor: "rgba(23,49,81,0.14)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "2deg" }] },
  avatar: { width: 60, height: 60, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(23,49,81,0.12)" },
  avatarText: { color: passportInk, fontSize: 19, fontWeight: "900" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  stat: { width: "48.6%", borderRadius: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.52)", borderWidth: 1, borderColor: "rgba(23,49,81,0.08)" },
  statValue: { color: passportInk, fontWeight: "900", fontSize: 18 },
  statLabel: { color: colors.grayText, fontSize: 10, fontWeight: "800", marginTop: 3, textTransform: "uppercase" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 15, flexWrap: "wrap" },
  sectionCard: { borderRadius: 30, padding: 16, marginBottom: 14, backgroundColor: "rgba(255,253,248,0.58)", borderWidth: 1, borderColor: "rgba(16,36,62,0.05)", ...softShadow },
  sectionHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  sectionTitle: { color: colors.navy, fontSize: 20, fontWeight: "900", letterSpacing: -0.3 },
  sectionCopy: { color: colors.grayText, fontSize: 12, lineHeight: 17, marginTop: 3 },
  addButton: { minHeight: 34, borderRadius: 17, paddingHorizontal: 10, backgroundColor: colors.blueSoft, flexDirection: "row", alignItems: "center", gap: 5 },
  addButtonText: { color: colors.blue, fontSize: 11, fontWeight: "900" },
  searchPanel: { marginBottom: 12 },
  searchBox: { minHeight: 46, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.68)", borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.navy, fontSize: 13, fontWeight: "700", paddingVertical: 10 },
  resultList: { gap: 7, marginTop: 9 },
  resultRow: { minHeight: 58, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.62)", borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10 },
  resultIcon: { width: 34, height: 34, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" },
  resultCode: { color: colors.blue, fontSize: 11, fontWeight: "900" },
  resultTitle: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  resultMeta: { color: colors.grayText, fontSize: 11, marginTop: 2 },
  noResults: { color: colors.grayText, fontSize: 12, lineHeight: 18, paddingHorizontal: 4, paddingBottom: 2 },
  bubbleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  emptyText: { color: colors.grayText, fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  stateStamp: { minWidth: 94, borderRadius: 22, borderWidth: 1.5, borderStyle: "dashed", paddingHorizontal: 12, paddingVertical: 11, alignItems: "center", overflow: "hidden" },
  miniHeart: { position: "absolute", right: 7, top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center" },
  stampGreen: { backgroundColor: "#EBF7ED", borderColor: "#77B889" },
  stampBlue: { backgroundColor: "#EAF2FF", borderColor: "#6EA7F0" },
  stampClay: { backgroundColor: "#FFF0E8", borderColor: "#D99B75" },
  stampGold: { backgroundColor: "#FFF7DE", borderColor: "#D0A849" },
  stateAbbr: { color: passportInk, fontSize: 18, fontWeight: "900" },
  stateName: { color: colors.grayText, fontSize: 10, fontWeight: "800", marginTop: 2 },
  stampTiny: { color: colors.warning, fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginTop: 7 },
  locationBubble: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: colors.blueSoft, flexDirection: "row", alignItems: "center", gap: 6 },
  locationBubbleAlt: { backgroundColor: colors.greenSoft },
  locationText: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  inlineHeart: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center", marginLeft: 1 },
  recommendation: { width: "100%", borderRadius: 22, padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 10 },
  recommendationAlt: { backgroundColor: "#FFF9EA" },
  stickerIcon: { width: 32, height: 32, borderRadius: 13, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  recommendationTitle: { color: colors.navy, fontWeight: "900", fontSize: 14 },
  recommendationMeta: { color: colors.grayText, fontSize: 11, marginTop: 2 },
  stickerHeart: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF0EE", alignItems: "center", justifyContent: "center" },
  settingsCard: { borderRadius: 30, padding: 14, marginBottom: 16, backgroundColor: "rgba(255,253,248,0.42)", borderWidth: 1, borderColor: "rgba(16,36,62,0.045)" },
  settingsHeader: { marginBottom: 10, paddingHorizontal: 2 },
  setting: { minHeight: 72, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.36)", borderWidth: 1, borderColor: "rgba(16,36,62,0.045)", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13, marginTop: 9 },
  settingIcon: { width: 42, height: 42, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.blueSoft },
  settingTitle: { color: colors.navy, fontWeight: "900", fontSize: 14 },
  settingSubtitle: { color: colors.grayText, fontSize: 11, marginTop: 3 },
  version: { textAlign: "center", color: colors.grayText, marginTop: 25, fontSize: 11 }
});
