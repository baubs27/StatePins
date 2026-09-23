import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { InfoRow, SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { colors } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";

export default function PhotoSettingsScreen() {
  const { chooseBackgroundPhoto } = usePreferences();
  const [libraryStatus, setLibraryStatus] = useState("Unknown");
  const [cameraStatus, setCameraStatus] = useState("Unknown");

  async function checkPermissions() {
    const library = await ImagePicker.getMediaLibraryPermissionsAsync();
    const camera = await ImagePicker.getCameraPermissionsAsync();
    setLibraryStatus(library.status);
    setCameraStatus(camera.status);
  }

  async function requestLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setLibraryStatus(permission.status);
    if (!permission.granted) Alert.alert("Photos are off", "Open phone Settings > StateUp > Photos to allow image uploads and background photos.");
  }

  async function requestCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    setCameraStatus(permission.status);
    if (!permission.granted) Alert.alert("Camera is off", "Open phone Settings > StateUp > Camera to let users take a photo directly.");
  }

  return <SettingsScreen eyebrow="PERMISSION" title="Photos & camera" subtitle="StateUp uses photos so users can upload real images with their recommended places.">
    <SettingsCard>
      <InfoRow icon="image-outline" title="Photo library" body="Needed to choose an existing photo for blue pin uploads or a custom background." />
      <InfoRow icon="camera-outline" title="Camera" body="Needed only if a user chooses to take a new photo directly from the app." />
      <InfoRow icon="lock-closed-outline" title="Privacy note" body="The prototype asks when you use a photo feature. It should not browse or upload photos without a user action." />
    </SettingsCard>
    <SettingsCard>
      <Text style={styles.status}>Photo library: {libraryStatus}</Text>
      <Text style={styles.status}>Camera: {cameraStatus}</Text>
      <View style={styles.buttons}>
        <Button icon="image-outline" onPress={requestLibrary} style={{ flex: 1 }}>Allow photos</Button>
        <Button variant="ghost" icon="camera-outline" onPress={requestCamera}>Allow camera</Button>
      </View>
      <Button variant="secondary" icon="color-palette-outline" onPress={chooseBackgroundPhoto}>Test background photo picker</Button>
      <Button variant="ghost" icon="refresh-outline" onPress={checkPermissions}>Check current status</Button>
    </SettingsCard>
  </SettingsScreen>;
}

const styles = StyleSheet.create({
  status: { color: colors.navy, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  buttons: { flexDirection: "row", gap: 9, marginVertical: 10, flexWrap: "wrap" }
});
