import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pin } from "@/types";
import { colors, softShadow } from "@/lib/theme";
import { openDirections } from "@/lib/directions";
import { Badge, Button, Card } from "./ui";

export function PinCard({ pin, onSave, onFavorite, favorited = false }: { pin: Pin; onSave: () => void; onFavorite?: () => void; favorited?: boolean }) {
  return <Card style={styles.card}>
    <Pressable onPress={() => router.push(`/pin/${pin.id}`)}>
      <Image source={pin.imageUrl} style={styles.image} contentFit="cover" transition={250} />
      <View style={styles.imageScrim} />
      <View style={styles.pinBubble}><Ionicons name="location" size={17} color={colors.white} /></View>
      <View style={styles.photoCaption}><Text style={styles.photoCaptionText}>{pin.city}</Text></View>
      <View style={styles.body}>
        <View style={styles.topline}>
          <Badge>{pin.category}</Badge>
          <View style={styles.social}><Ionicons name="arrow-up" size={14} color={colors.blue} /><Text style={styles.socialText}>{pin.upvotes}</Text></View>
        </View>
        <Text style={styles.name}>{pin.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{pin.description}</Text>
      </View>
    </Pressable>
    <View style={styles.actions}>
      <Button variant={favorited ? "secondary" : "ghost"} icon={favorited ? "heart" : "heart-outline"} onPress={onFavorite} style={styles.favoriteButton}>
        {favorited ? "Fave" : "Favorite"}
      </Button>
      <Button variant={pin.savedToItinerary ? "secondary" : "primary"} icon={pin.savedToItinerary ? "checkmark" : "bookmark-outline"} onPress={onSave} style={{ flex: 1 }}>
        {pin.savedToItinerary ? "Itinerary" : "Itinerary"}
      </Button>
      <Button variant="ghost" icon="navigate-outline" onPress={() => openDirections(pin.name, pin.coordinates.latitude, pin.coordinates.longitude)}>Directions</Button>
    </View>
  </Card>;
}

const styles = StyleSheet.create({
  card: { overflow: "hidden", marginBottom: 18, backgroundColor: "rgba(255,253,248,0.56)", borderRadius: 32, borderColor: "rgba(16,36,62,0.045)", ...softShadow },
  image: { width: "100%", height: 188, backgroundColor: colors.gray },
  imageScrim: { position: "absolute", left: 0, right: 0, top: 0, height: 176, backgroundColor: "rgba(16,36,62,0.12)" },
  pinBubble: { position: "absolute", top: 14, right: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  photoCaption: { position: "absolute", left: 14, top: 14, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  photoCaptionText: { color: colors.navy, fontSize: 11, fontWeight: "900" },
  body: { padding: 18, paddingBottom: 12 },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  social: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: "rgba(36,119,232,0.1)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  socialText: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  name: { color: colors.navy, fontSize: 20, fontWeight: "900", marginTop: 12 },
  description: { color: colors.grayText, fontSize: 14, lineHeight: 20, marginTop: 10 },
  actions: { flexDirection: "row", gap: 9, padding: 14, paddingTop: 0, flexWrap: "wrap" },
  favoriteButton: { minWidth: 112 }
});
