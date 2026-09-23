import { Linking, Platform } from "react-native";

export async function openDirections(name: string, latitude: number, longitude: number) {
  const label = encodeURIComponent(name);
  const destination = `${latitude},${longitude}`;
  const apple = `maps://?daddr=${destination}&q=${label}`;
  const googleNative = `google.navigation:q=${destination}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`;
  const preferred = Platform.OS === "ios" ? apple : Platform.OS === "android" ? googleNative : web;
  if (await Linking.canOpenURL(preferred)) return Linking.openURL(preferred);
  return Linking.openURL(web);
}
