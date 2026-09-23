import { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, softShadow } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ children, tone = "blue" }: PropsWithChildren<{ tone?: "blue" | "green" | "neutral" }>) {
  return <View style={[styles.badge, tone === "green" && styles.badgeGreen, tone === "neutral" && styles.badgeNeutral]}>
    <Text style={styles.badgeText}>{children}</Text>
  </View>;
}

export function Button({ children, onPress, variant = "primary", icon, loading, disabled, style }: PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const { feedback, interactionSounds } = usePreferences();
  return <Pressable
    accessibilityRole="button"
    disabled={disabled || loading}
    android_disableSound={!interactionSounds}
    onPress={() => { feedback("tap"); onPress?.(); }}
    style={({ pressed }) => [styles.button, styles[`button_${variant}`], pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}
  >
    {loading ? <ActivityIndicator color={variant === "primary" ? colors.white : colors.navy} /> : <>
      {icon && <Ionicons name={icon} size={18} color={variant === "primary" ? colors.white : variant === "danger" ? colors.coral : colors.navy} />}
      <Text style={[styles.buttonText, variant !== "primary" && styles.buttonTextDark, variant === "danger" && { color: colors.coral }]}>{children}</Text>
    </>}
  </Pressable>;
}

export function ScreenHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return <View style={styles.header}>
    <View style={{ flex: 1 }}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
    {right}
  </View>;
}

export function EmptyState({ icon, title, message, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; message: string; action?: ReactNode }) {
  return <Card style={styles.empty}>
    <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.blue} /></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {action}
  </Card>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,253,248,0.62)", borderRadius: 30, borderWidth: 1, borderColor: "rgba(16,36,62,0.055)", ...softShadow },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(36,119,232,0.12)" },
  badgeGreen: { backgroundColor: colors.greenSoft },
  badgeNeutral: { backgroundColor: "#F1F1EF" },
  badgeText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  button_primary: { backgroundColor: colors.blue },
  button_secondary: { backgroundColor: "rgba(36,119,232,0.12)" },
  button_ghost: { backgroundColor: "rgba(255,255,255,0.48)", borderWidth: 1, borderColor: colors.borderSoft },
  button_danger: { backgroundColor: "#FFF0EE" },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  buttonTextDark: { color: colors.navy },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 22 },
  eyebrow: { color: colors.blue, fontWeight: "800", fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 5 },
  title: { color: colors.navy, fontSize: 30, lineHeight: 34, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.grayText, fontSize: 15, lineHeight: 21, marginTop: 6 },
  empty: { alignItems: "center", padding: 28, marginTop: 20, backgroundColor: "rgba(255,253,248,0.58)" },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontWeight: "900", color: colors.navy },
  emptyMessage: { color: colors.grayText, textAlign: "center", lineHeight: 21, marginTop: 7, marginBottom: 18 },
});
