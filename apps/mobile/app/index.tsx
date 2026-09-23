import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/lib/theme";

export default function Index() {
  const { user, isGuest, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.blue} /></View>;
  return <Redirect href={user || isGuest ? "/(tabs)" : "/auth"} />;
}
