import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

export async function enableNotifications() {
  if (!Device.isDevice) throw new Error("Push notifications require a physical device.");
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Notification permission was not granted.");
  const token = await Notifications.getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID });
  return token.data;
}
