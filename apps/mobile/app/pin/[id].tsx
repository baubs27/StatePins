import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { openDirections } from "@/lib/directions";
import { colors } from "@/lib/theme";
import { Badge, Button } from "@/components/ui";
import { usePreferences } from "@/context/PreferencesContext";

export default function PinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pins, states, favoritePinIds, toggleSaved, toggleFavoritePin, toggleUpvote, addComment } = useApp();
  const { effectiveBackground, background } = usePreferences();
  const [comment, setComment] = useState("");
  const pin = pins.find((item) => item.id === id);
  if (!pin) return null;
  const state = states.find((item) => item.id === pin.stateId);
  const favorited = favoritePinIds.includes(pin.id);
  function postComment() {
    if (comment.trim().length < 2) return;
    addComment(pin!.id, comment);
    setComment("");
  }
  function report() {
    Alert.alert("Report this pin", "Why are you reporting it?", [
      { text: "Cancel", style: "cancel" },
      { text: "Spam or promotion", onPress: () => Alert.alert("Report received", "Thanks. An admin can review this report.") },
      { text: "Unsafe or inappropriate", style: "destructive", onPress: () => Alert.alert("Report received", "Thanks. An admin can review this report.") }
    ]);
  }
  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.topbar}><Pressable style={styles.iconButton} onPress={() => router.back()}><Ionicons name="close" size={22} color={colors.navy} /></Pressable><Text style={styles.topTitle}>Local recommendation</Text><Pressable style={styles.iconButton} onPress={() => Share.share({ message: `${pin.name} in ${pin.city} — found on StateUp` })}><Ionicons name="share-outline" size={21} color={colors.navy} /></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Image source={pin.imageUrl} style={styles.hero} contentFit="cover" transition={250} />
      <View style={styles.heading}>
        <View style={{ flex: 1 }}><Badge>{pin.category}</Badge><Text style={styles.title}>{pin.name}</Text><Text style={styles.location}><Ionicons name="navigate-outline" size={14} /> {pin.city}, {state?.abbreviation}</Text></View>
        <Pressable style={[styles.vote, pin.upvoted && styles.voteActive]} onPress={() => toggleUpvote(pin.id)}><Ionicons name="arrow-up" size={20} color={pin.upvoted ? colors.white : colors.blue} /><Text style={[styles.voteText, pin.upvoted && { color: colors.white }]}>{pin.upvotes}</Text></Pressable>
      </View>
      <Text style={styles.byline}>Recommended by <Text style={{ color: colors.navy, fontWeight: "900" }}>@{pin.recommendedBy}</Text></Text>
      <Text style={styles.description}>{pin.description}</Text>
      <View style={styles.actions}>
        <Button icon={favorited ? "heart" : "heart-outline"} variant={favorited ? "secondary" : "ghost"} onPress={() => toggleFavoritePin(pin.id)} style={{ flex: 1 }}>{favorited ? "Favorited" : "Favorite"}</Button>
        <Button icon={pin.savedToItinerary ? "checkmark" : "bookmark-outline"} variant={pin.savedToItinerary ? "secondary" : "primary"} onPress={() => toggleSaved(pin.id)} style={{ flex: 1 }}>{pin.savedToItinerary ? "In itinerary" : "Itinerary"}</Button>
        <Button variant="ghost" icon="navigate" onPress={() => openDirections(pin.name, pin.coordinates.latitude, pin.coordinates.longitude)}>Directions</Button>
      </View>
      <View style={styles.rule} />
      <View style={styles.commentHeader}><Text style={styles.sectionTitle}>Comments</Text><Text style={styles.count}>{pin.comments.length}</Text></View>
      {pin.comments.length ? pin.comments.map((item) => <View key={item.id} style={styles.comment}><View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{item.username.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><View style={styles.commentTop}><Text style={styles.username}>@{item.username}</Text><Text style={styles.time}>{item.createdAt}</Text></View><Text style={styles.commentText}>{item.text}</Text><Pressable onPress={() => Alert.alert("Report comment?", "An admin can review comments that break the content rules.", [{ text: "Cancel", style: "cancel" }, { text: "Report", style: "destructive" }])}><Text style={styles.reportText}>Report</Text></Pressable></View></View>) : <Text style={styles.noComments}>No comments yet. Add something useful, not just “first.”</Text>}
      <View style={styles.composer}><TextInput value={comment} onChangeText={setComment} placeholder="Add a helpful comment…" placeholderTextColor="#939AA2" style={styles.input} maxLength={500} /><Pressable onPress={postComment} disabled={!comment.trim()} style={[styles.send, !comment.trim() && { opacity: 0.4 }]}><Ionicons name="arrow-up" size={19} color={colors.white} /></Pressable></View>
      <View style={styles.safety}><Ionicons name="shield-checkmark-outline" size={18} color={colors.grayText} /><Text style={styles.safetyText}>Keep it kind, relevant, and safe. Personal information, harassment, and paid promotion are not allowed.</Text></View>
      <Button variant="ghost" icon="flag-outline" onPress={report}>Report this pin</Button>
      <Button variant="danger" icon="ban-outline" onPress={() => Alert.alert("Block user?", `Blocking @${pin.recommendedBy} will hide their future content.`, [{ text: "Cancel", style: "cancel" }, { text: "Block", style: "destructive" }])}>Block @{pin.recommendedBy}</Button>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topbar: { height: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F1F1EF", alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.navy, fontWeight: "900" },
  content: { paddingBottom: 55, maxWidth: 720, width: "100%", alignSelf: "center" },
  hero: { height: 310, width: "100%", backgroundColor: colors.gray },
  heading: { padding: 22, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 15 },
  title: { color: colors.navy, fontSize: 28, lineHeight: 32, fontWeight: "900", letterSpacing: -0.6, marginTop: 12 },
  location: { color: colors.grayText, marginTop: 7 },
  vote: { width: 58, height: 65, backgroundColor: colors.blueSoft, borderRadius: 19, alignItems: "center", justifyContent: "center", gap: 2 },
  voteActive: { backgroundColor: colors.blue },
  voteText: { color: colors.navy, fontWeight: "900" },
  byline: { color: colors.grayText, paddingHorizontal: 22, fontSize: 13 },
  description: { color: colors.navy, fontSize: 16, lineHeight: 25, paddingHorizontal: 22, marginTop: 17 },
  actions: { flexDirection: "row", gap: 9, padding: 22, flexWrap: "wrap" },
  rule: { height: 1, backgroundColor: colors.border, marginHorizontal: 22 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, marginTop: 22 },
  sectionTitle: { color: colors.navy, fontSize: 20, fontWeight: "900" },
  count: { color: colors.blue, backgroundColor: colors.blueSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, fontWeight: "900", fontSize: 11 },
  comment: { flexDirection: "row", gap: 11, paddingHorizontal: 22, marginTop: 18 },
  commentAvatar: { width: 36, height: 36, borderRadius: 13, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  commentAvatarText: { color: colors.white, fontWeight: "900" },
  commentTop: { flexDirection: "row", justifyContent: "space-between" },
  username: { color: colors.navy, fontWeight: "900", fontSize: 13 },
  time: { color: colors.grayText, fontSize: 11 },
  commentText: { color: colors.navy, lineHeight: 20, marginTop: 5 },
  reportText: { color: colors.grayText, fontSize: 10, marginTop: 6 },
  noComments: { color: colors.grayText, paddingHorizontal: 22, marginTop: 15, fontStyle: "italic" },
  composer: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 22, marginTop: 20 },
  input: { height: 50, flex: 1, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 15, color: colors.navy },
  send: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  safety: { flexDirection: "row", gap: 8, margin: 22, padding: 13, borderRadius: 15, backgroundColor: "#F0EFEB" },
  safetyText: { color: colors.grayText, fontSize: 11, lineHeight: 16, flex: 1 }
});
