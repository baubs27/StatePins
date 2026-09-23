import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.APP_ENV === "production";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  if (production && !apiUrl.startsWith("https://")) throw new Error("Production builds require EXPO_PUBLIC_API_URL with HTTPS.");
  if (production && !process.env.EXPO_PUBLIC_EAS_PROJECT_ID) throw new Error("Production builds require EXPO_PUBLIC_EAS_PROJECT_ID.");
  if (production && !process.env.EXPO_PUBLIC_PRIVACY_URL?.startsWith("https://")) throw new Error("Production builds require EXPO_PUBLIC_PRIVACY_URL with HTTPS.");
  if (production && !process.env.EXPO_PUBLIC_TERMS_URL?.startsWith("https://")) throw new Error("Production builds require EXPO_PUBLIC_TERMS_URL with HTTPS.");
  if (production && (!process.env.IOS_BUNDLE_IDENTIFIER || !process.env.ANDROID_PACKAGE_NAME)) throw new Error("Production builds require final iOS and Android application identifiers.");

  return {
    ...config,
    name: "StateUp",
    slug: "stateup",
    scheme: "stateup",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/icon.png",
    ios: {
      supportsTablet: true,
      usesAppleSignIn: true,
      bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER ?? "com.yourcompany.stateup",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "StateUp uses your location to show where you are on the map and help you find nearby recommendations.",
        NSPhotoLibraryUsageDescription: "StateUp uses photos so users can upload real images with their recommended places.",
        NSCameraUsageDescription: "StateUp uses photos so users can upload real images with their recommended places.",
        ITSAppUsesNonExemptEncryption: false
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [{ NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults", NSPrivacyAccessedAPITypeReasons: ["CA92.1"] }]
      }
    },
    android: {
      package: process.env.ANDROID_PACKAGE_NAME ?? "com.yourcompany.stateup",
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
      adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#10243E" },
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA", "READ_MEDIA_IMAGES", "POST_NOTIFICATIONS"],
      config: { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "" } }
    },
    web: { bundler: "metro", favicon: "./assets/favicon.png" },
    plugins: [
      "expo-router",
      "expo-apple-authentication",
      "./plugins/withAndroidSecurity",
      ["expo-secure-store", { configureAndroidBackup: true, faceIDPermission: "Allow StateUp to securely access your signed-in session." }],
      ["expo-splash-screen", { image: "./assets/splash.png", imageWidth: 220, resizeMode: "contain", backgroundColor: "#F7F4ED" }],
      ["expo-image-picker", { photosPermission: "StateUp uses photos so users can upload real images with their recommended places.", cameraPermission: "StateUp uses photos so users can upload real images with their recommended places." }],
      ["expo-location", { locationWhenInUsePermission: "StateUp uses your location to show where you are on the map and help you find nearby recommendations." }],
      ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#2477E8" }]
    ],
    experiments: { typedRoutes: true },
    extra: { apiUrl: apiUrl || "http://localhost:4000", eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "YOUR_EAS_PROJECT_ID" } }
  };
};
