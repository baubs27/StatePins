import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Pin, USState } from "@/types";
import { colors } from "@/lib/theme";
import { openDirections } from "@/lib/directions";
import { US_MAP_HEIGHT, US_MAP_WIDTH, buildUsProjection, projectCoordinates } from "@/lib/usGeo";
import { isFeaturedPin, sortPinsForMap } from "@/lib/pinVisibility";

export function StateMap({ state, pins, location }: { state: USState; pins: Pin[]; location: { latitude: number; longitude: number } | null }) {
  const { projection, shapes } = useMemo(() => buildUsProjection([state], 18), [state]);
  const shape = shapes[0];
  const visiblePins = useMemo(() => [...pins].sort(sortPinsForMap), [pins]);
  const userPoint = location ? projectCoordinates(projection, location) : null;

  return <View style={styles.map}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${US_MAP_WIDTH} ${US_MAP_HEIGHT}`}>
      {!!shape && <Path d={shape.path} fill="#DDEBE8" stroke={colors.white} strokeWidth={4} />}
    </Svg>
    <Text style={styles.stateName}>{state.name.toUpperCase()}</Text>
    {visiblePins.map((pin, index) => {
      const point = projectCoordinates(projection, pin.coordinates);
      if (!point) return null;
      const featured = isFeaturedPin(pin);
      return <Pressable
        key={pin.id}
        onPress={() => openDirections(pin.name, pin.coordinates.latitude, pin.coordinates.longitude)}
        style={[styles.pin, featured && styles.pinFeatured, { left: `${(point[0] / US_MAP_WIDTH) * 100}%`, top: `${(point[1] / US_MAP_HEIGHT) * 100}%` }]}
      >
        {(featured || index < 2) ? <Image source={pin.imageUrl} style={styles.pinPhoto} contentFit="cover" /> : <View style={styles.pinDot} />}
        {featured && <View style={styles.rank}><Text style={styles.rankText}>#{index + 1}</Text></View>}
      </Pressable>;
    })}
    {userPoint && <View style={[styles.youDot, { left: `${(userPoint[0] / US_MAP_WIDTH) * 100}%`, top: `${(userPoint[1] / US_MAP_HEIGHT) * 100}%` }]} />}
    <View style={styles.ruleBadge}><Text style={styles.ruleText}>Map shows new pins + 250+ upvote keepers</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  map: { height: 300, borderRadius: 24, overflow: "hidden", marginBottom: 18, backgroundColor: "#EAF2F1", position: "relative" },
  stateName: { position: "absolute", left: 20, bottom: 16, color: "#B1C5C2", fontSize: 26, fontWeight: "900", letterSpacing: 2 },
  pin: { position: "absolute", width: 28, height: 28, marginLeft: -14, marginTop: -14, borderRadius: 14, backgroundColor: colors.blue, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  pinFeatured: { width: 50, height: 50, marginLeft: -25, marginTop: -25, borderRadius: 18, borderWidth: 4 },
  pinPhoto: { width: "100%", height: "100%", borderRadius: 14 },
  pinDot: { width: 10, height: 10, borderRadius: 10, backgroundColor: colors.white },
  rank: { position: "absolute", right: -8, top: -8, backgroundColor: colors.navy, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, borderWidth: 2, borderColor: colors.white },
  rankText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  youDot: { position: "absolute", width: 13, height: 13, marginLeft: -6.5, marginTop: -6.5, borderRadius: 7, backgroundColor: "#1598E5", borderWidth: 2.5, borderColor: colors.white, shadowColor: "#1598E5", shadowOpacity: 0.35, shadowRadius: 9 },
  ruleBadge: { position: "absolute", left: 12, right: 12, top: 12, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  ruleText: { color: colors.grayText, fontSize: 11, textAlign: "center", fontWeight: "700" }
});
