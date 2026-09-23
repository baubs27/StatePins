import { Image } from "expo-image";
import { useMemo, useState } from "react";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";
import { Pin, USState } from "@/types";
import { colors } from "@/lib/theme";
import { isFeaturedPin, sortPinsForMap } from "@/lib/pinVisibility";

export function StateMap({ state, pins, location }: { state: USState; pins: Pin[]; location: { latitude: number; longitude: number } | null }) {
  const [region, setRegion] = useState<Region>({ ...state.centerCoordinates, latitudeDelta: 3.8, longitudeDelta: 4.5 });
  const zoomedIn = region.latitudeDelta < 2.4;
  const visiblePins = useMemo(() => [...pins].sort(sortPinsForMap), [pins]);

  return <View style={styles.frame}>
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onRegionChangeComplete={setRegion}
      showsUserLocation
      showsMyLocationButton
    >
      {visiblePins.map((pin, index) => {
        const featured = isFeaturedPin(pin);
        const showPhoto = featured || zoomedIn;
        return <Marker key={pin.id} coordinate={pin.coordinates} zIndex={featured ? 10 : 2}>
          <View style={[styles.marker, featured && styles.markerFeatured]}>
            {showPhoto ? <Image source={pin.imageUrl} style={styles.markerPhoto} contentFit="cover" /> : <View style={styles.pinDot} />}
            {featured && <View style={styles.rank}><Text style={styles.rankText}>#{index + 1}</Text></View>}
          </View>
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{pin.name}</Text>
              <Text style={styles.calloutMeta}>{pin.city} · {pin.upvotes} upvotes</Text>
            </View>
          </Callout>
        </Marker>;
      })}
      {location && <Marker coordinate={location} title="You are here">
        <View style={styles.userPulse}><View style={styles.userDot} /></View>
      </Marker>}
    </MapView>
    <View style={styles.ruleBadge}><Text style={styles.ruleText}>Map shows new pins + 250+ upvote keepers</Text></View>
  </View>;
}
const styles = StyleSheet.create({
  frame: { height: 300, borderRadius: 24, overflow: "hidden", marginBottom: 18, backgroundColor: "#EAF2F1" },
  marker: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  markerFeatured: { width: 52, height: 52, borderRadius: 20, borderWidth: 4 },
  markerPhoto: { width: "100%", height: "100%", borderRadius: 15 },
  pinDot: { width: 10, height: 10, borderRadius: 10, backgroundColor: colors.white },
  rank: { position: "absolute", right: -8, top: -8, backgroundColor: colors.navy, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, borderWidth: 2, borderColor: colors.white },
  rankText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  userPulse: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(21,152,229,0.18)", alignItems: "center", justifyContent: "center" },
  userDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#1598E5", borderWidth: 2, borderColor: colors.white },
  callout: { minWidth: 160, backgroundColor: colors.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  calloutTitle: { color: colors.navy, fontWeight: "900", fontSize: 14 },
  calloutMeta: { color: colors.grayText, fontSize: 11, marginTop: 3 },
  ruleBadge: { position: "absolute", left: 12, right: 12, bottom: 12, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  ruleText: { color: colors.grayText, fontSize: 11, textAlign: "center", fontWeight: "700" }
});
