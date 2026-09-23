import { router, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { colors } from "@/lib/theme";
import { useAuth } from "@/context/AuthContext";

const icons = { index: "map", itinerary: "bookmark", activity: "sparkles", profile: "person-circle" } as const;

export default function TabLayout() {
  const { user, isGuest, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user && !isGuest) router.replace("/auth");
  }, [user, isGuest, loading]);
  if (loading || (!user && !isGuest)) return null;
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.blue,
    tabBarInactiveTintColor: "#86909B",
    tabBarStyle: {
      height: 76,
      marginHorizontal: 18,
      marginBottom: 14,
      paddingTop: 8,
      paddingBottom: 12,
      borderRadius: 28,
      position: "absolute",
      backgroundColor: "rgba(255,255,255,0.92)",
      borderTopWidth: 0,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      shadowColor: colors.navy,
      shadowOpacity: 0.09,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons] ?? "ellipse"} color={color} size={size} />
  })}>
    <Tabs.Screen name="index" options={{ title: "Map" }} />
    <Tabs.Screen name="itinerary" options={{ title: "Itinerary" }} />
    <Tabs.Screen name="activity" options={{ title: "Activity" }} />
    <Tabs.Screen name="profile" options={{ title: "Profile" }} />
  </Tabs>;
}
