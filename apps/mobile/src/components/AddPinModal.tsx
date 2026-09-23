import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, USState } from "@/types";
import { colors } from "@/lib/theme";
import { findStateForCoordinates } from "@/lib/usGeo";
import { Button } from "./ui";

const categories: Category[] = ["Food", "Nature", "Landmark", "Hidden Gem", "Road Trip Stop", "Museum", "Other"];

type PinCoordinates = { latitude: number; longitude: number };

export function AddPinModal({ visible, state, currentLocation, onClose, onSubmit }: {
  visible: boolean;
  state: USState;
  currentLocation: PinCoordinates | null;
  onClose: () => void;
  onSubmit: (value: { stateId: string; name: string; city: string; description: string; category: Category; imageUrl: string; coordinates: PinCoordinates }) => void;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Hidden Gem");
  const [image, setImage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState(String(state.centerCoordinates.latitude));
  const [longitude, setLongitude] = useState(String(state.centerCoordinates.longitude));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const coordinates = currentLocation ?? state.centerCoordinates;
    setLatitude(coordinates.latitude.toFixed(5));
    setLongitude(coordinates.longitude.toFixed(5));
    setError("");
  }, [visible, state.centerCoordinates, currentLocation]);

  async function selectPhoto(camera = false) {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo permission needed", "StateUp uses photos so users can upload real images with their recommended places.");
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setImage(result.assets[0].uri);
  }

  function useCurrentLocation() {
    if (!currentLocation) {
      setError("Tap “Use my location” on the map first, then open Add Pin again to use your exact spot.");
      return;
    }
    setLatitude(currentLocation.latitude.toFixed(5));
    setLongitude(currentLocation.longitude.toFixed(5));
    setError("");
  }

  function submit() {
    if (!image) return setError("Please add a photo to post a recommendation.");
    if (name.trim().length < 2 || city.trim().length < 2 || description.trim().length < 10) return setError("Add a place, city, and a little more detail before posting.");
    const coordinates = { latitude: Number(latitude), longitude: Number(longitude) };
    if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) return setError("Add valid latitude and longitude so this blue pin lands in the right spot.");
    if (!findStateForCoordinates(coordinates, [state])) return setError(`Those coordinates do not look like they are inside ${state.name}. Adjust them or use your current location.`);
    onSubmit({ stateId: state.id, name: name.trim(), city: city.trim(), description: description.trim(), category, imageUrl: image, coordinates });
    setName("");
    setCity("");
    setDescription("");
    setImage(null);
    setError("");
    onClose();
  }

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}><Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={23} color={colors.navy} /></Pressable><Text style={styles.headerTitle}>Add a blue pin</Text><View style={{ width: 42 }} /></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>RECOMMEND {state.name.toUpperCase()}</Text>
        <Text style={styles.title}>Share a place worth the stop.</Text>
        <Text style={styles.subtitle}>Real photos help people know what it actually feels like.</Text>
        <Pressable style={[styles.photo, image && { padding: 0 }]} onPress={() => selectPhoto(false)}>
          {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : <>
            <View style={styles.photoIcon}><Ionicons name="camera" size={25} color={colors.blue} /></View>
            <Text style={styles.photoTitle}>Add a photo *</Text><Text style={styles.photoSubtitle}>Choose one from your library</Text>
          </>}
        </Pressable>
        <Button variant="ghost" icon="camera-outline" onPress={() => selectPhoto(true)}>Take a photo instead</Button>
        <Field label="PLACE NAME" value={name} onChangeText={setName} placeholder="Hawk Mountain Overlook" />
        <Field label="CITY / LOCATION" value={city} onChangeText={setCity} placeholder="Kempton" />
        <Field label="WHY DO YOU RECOMMEND IT?" value={description} onChangeText={setDescription} placeholder="Tell people what makes it special…" multiline />
        <View style={styles.locationHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PINPOINT LOCATION</Text>
            <Text style={styles.locationHelp}>Use exact coordinates so the map marker lands on the real spot.</Text>
          </View>
          <Pressable onPress={useCurrentLocation} style={styles.locationButton}><Ionicons name="locate" size={15} color={colors.blue} /><Text style={styles.locationButtonText}>Use mine</Text></Pressable>
        </View>
        <View style={styles.coordinateRow}>
          <CoordinateField label="LATITUDE" value={latitude} onChangeText={setLatitude} placeholder="40.64100" />
          <CoordinateField label="LONGITUDE" value={longitude} onChangeText={setLongitude} placeholder="-75.99800" />
        </View>
        <Text style={styles.label}>CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></Pressable>)}</ScrollView>
        {!!error && <View style={styles.error}><Ionicons name="alert-circle" size={18} color={colors.coral} /><Text style={styles.errorText}>{error}</Text></View>}
        <Button onPress={submit} icon="paper-plane">Post Recommendation</Button>
        <Text style={styles.rules}>Map visibility is earned: new pins get a 30-day window, and 250+ upvote pins stay prominent. Keep it helpful, respectful, and first-hand.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return <View style={{ marginTop: 18 }}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor="#9AA1A9" textAlignVertical={props.multiline ? "top" : "center"} /></View>;
}

function CoordinateField(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={{ flex: 1 }}><Text style={styles.smallLabel}>{props.label}</Text><TextInput {...props} keyboardType="numbers-and-punctuation" style={styles.input} placeholderTextColor="#9AA1A9" /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  close: { width: 42, height: 42, borderRadius: 15, backgroundColor: "#F1F1EF", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.navy, fontWeight: "900", fontSize: 16 },
  content: { padding: 22, paddingBottom: 50, maxWidth: 620, width: "100%", alignSelf: "center" },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: colors.navy, fontSize: 27, fontWeight: "900", letterSpacing: -0.5, marginTop: 8 },
  subtitle: { color: colors.grayText, marginTop: 8, lineHeight: 20 },
  photo: { height: 190, borderRadius: 22, borderWidth: 2, borderStyle: "dashed", borderColor: "#B7CBE7", backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", marginTop: 22, marginBottom: 10, overflow: "hidden" },
  photoIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  photoTitle: { color: colors.navy, fontWeight: "900", marginTop: 12 },
  photoSubtitle: { color: colors.grayText, fontSize: 12, marginTop: 4 },
  label: { color: colors.grayText, fontSize: 11, fontWeight: "900", letterSpacing: 1.1, marginBottom: 8, marginTop: 18 },
  input: { height: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, color: colors.navy, fontSize: 15 },
  multiline: { height: 110, paddingTop: 14 },
  locationHeader: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  locationHelp: { color: colors.grayText, fontSize: 12, lineHeight: 17 },
  locationButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.blueSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  locationButtonText: { color: colors.blue, fontSize: 12, fontWeight: "900" },
  coordinateRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  smallLabel: { color: colors.grayText, fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 8 },
  chips: { gap: 8, paddingBottom: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: colors.white },
  error: { flexDirection: "row", gap: 8, backgroundColor: "#FFF0EE", padding: 13, borderRadius: 14, marginBottom: 12 },
  errorText: { color: "#8F3E36", flex: 1, fontSize: 13 },
  rules: { color: colors.grayText, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 15 }
});
