import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/lib/theme";
import { Button, Card } from "@/components/ui";
import { usePreferences } from "@/context/PreferencesContext";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const params = useLocalSearchParams<{ resetToken?: string }>();
  const { login, register, continueAsGuest, loginWithProvider, requestPasswordReset, resetPassword } = useAuth();
  const { effectiveBackground, background } = usePreferences();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(params.resetToken ? "reset" : "login");
  const [form, setForm] = useState({ email: "demo@stateup.app", password: "StateUp123!", username: "", displayName: "", resetToken: params.resetToken ?? "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (params.resetToken) {
      setForm((current) => ({ ...current, resetToken: params.resetToken ?? "" }));
      setMode("reset");
    }
  }, [params.resetToken]);
  useEffect(() => { if (Platform.OS === "ios") void AppleAuthentication.isAvailableAsync().then(setAppleAvailable); }, []);

  async function appleLogin() {
    try {
      setLoading(true);
      setError("");
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!credential.identityToken) throw new Error("Apple did not return a verifiable identity token.");
      const displayName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ") || undefined;
      await loginWithProvider("apple", credential.identityToken, displayName);
      router.replace("/(tabs)");
    } catch (caught) {
      if ((caught as { code?: string }).code !== "ERR_REQUEST_CANCELED") setError(caught instanceof Error ? caught.message : "Apple sign-in could not finish.");
    } finally { setLoading(false); }
  }
  async function submit() {
    setError("");
    try {
      setLoading(true);
      if (mode === "forgot") {
        if (!form.email.includes("@")) throw new Error("Enter the email address on your account.");
        const token = await requestPasswordReset(form.email);
        if (token) setForm((current) => ({ ...current, resetToken: token }));
        setMode(token ? "reset" : "login");
        setError(token ? "Development reset code loaded. Choose a new password." : "If that account exists, a reset link is on its way.");
        return;
      }
      if (mode === "reset") {
        if (!form.resetToken) throw new Error("Open the reset link from your email or enter its reset code.");
        if (!strongPassword(form.password)) throw new Error("Use 10+ characters with uppercase, lowercase, a number, and a symbol.");
        await resetPassword(form.resetToken, form.password);
        setMode("login");
        setForm((current) => ({ ...current, password: "", resetToken: "" }));
        setError("Password updated. Sign in with your new password.");
        return;
      }
      if (!form.email.includes("@") || form.password.length < 1) throw new Error("Enter a valid email and password.");
      if (mode === "login") await login(form.email, form.password);
      else {
        if (form.username.length < 3 || form.displayName.length < 2) throw new Error("Add your name and a username with at least 3 characters.");
        if (!strongPassword(form.password)) throw new Error("Use 10+ characters with uppercase, lowercase, a number, and a symbol.");
        await register(form);
      }
      router.replace("/(tabs)");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not sign in."); }
    finally { setLoading(false); }
  }
  async function guestLogin() {
    setError("");
    setLoading(true);
    await continueAsGuest();
    setLoading(false);
    router.replace("/(tabs)");
  }
  return <SafeAreaView style={[styles.safe, { backgroundColor: background === "photo" ? "transparent" : effectiveBackground }]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><Pressable onPress={() => router.back()} style={styles.close}><Ionicons name="close" size={22} color={colors.navy} /></Pressable><View style={styles.mark}><Ionicons name="location" size={29} color={colors.white} /></View></View>
    <Text style={styles.eyebrow}>WELCOME TO STATEUP</Text>
    <Text style={styles.title}>{mode === "login" ? "Pick up where you left off." : mode === "register" ? "Start your state story." : mode === "forgot" ? "Find your account." : "Choose a new password."}</Text>
    <Text style={styles.subtitle}>{mode === "forgot" ? "We’ll send a one-hour reset link if that email is registered." : mode === "reset" ? "Reset links work once and expire after one hour." : "Sign in to post pins, comment, vote, add friends, and sync your itinerary."}</Text>
    <Card style={styles.card}>
      {mode === "register" && <><Field label="DISPLAY NAME" value={form.displayName} onChangeText={update("displayName")} placeholder="Bailey Roads" /><Field label="USERNAME" value={form.username} onChangeText={update("username")} placeholder="bailey.roams" autoCapitalize="none" /></>}
      {mode !== "reset" && <Field label="EMAIL" value={form.email} onChangeText={update("email")} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />}
      {mode === "reset" && <Field label="RESET CODE" value={form.resetToken} onChangeText={update("resetToken")} placeholder="Paste reset code" autoCapitalize="none" />}
      {mode !== "forgot" && <Field label={mode === "reset" ? "NEW PASSWORD" : "PASSWORD"} value={form.password} onChangeText={update("password")} placeholder={mode === "login" ? "Your password" : "10+ characters with mixed types"} secureTextEntry />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button loading={loading} onPress={submit}>{mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Reset password"}</Button>
      {mode === "login" && <Pressable onPress={() => { setMode("forgot"); setError(""); }}><Text style={styles.forgot}>Forgot password?</Text></Pressable>}
      {mode === "login" && <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} /></View>}
      {mode === "login" && <GoogleSignInButton disabled={loading} onError={setError} onLoading={setLoading} onSignedIn={async (idToken) => { await loginWithProvider("google", idToken); router.replace("/(tabs)"); }} />}
      {mode === "login" && appleAvailable && <Button variant="ghost" icon="logo-apple" disabled={loading} onPress={appleLogin}>Continue with Apple</Button>}
      {mode === "login" && __DEV__ && <Button variant="ghost" icon="person-outline" disabled={loading} onPress={guestLogin}>Continue as development guest</Button>}
      <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}><Text style={styles.switch}>{mode === "login" ? "New here? Create an account" : "Back to sign in"}</Text></Pressable>
    </Card>
    <Text style={styles.demo}>Demo account is prefilled after you run the database seed.</Text>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={{ marginBottom: 15 }}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#979EA5" /></View>;
}

function GoogleSignInButton({ disabled, onSignedIn, onError, onLoading }: { disabled: boolean; onSignedIn: (idToken: string) => Promise<void>; onError: (message: string) => void; onLoading: (value: boolean) => void }) {
  const handledToken = useRef<string | null>(null);
  const configured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "not-configured.apps.googleusercontent.com",
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  });
  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.authentication?.idToken;
    if (!idToken) return onError("Google did not return a verifiable identity token.");
    if (handledToken.current === idToken) return;
    handledToken.current = idToken;
    onLoading(true);
    void onSignedIn(idToken).catch((caught) => onError(caught instanceof Error ? caught.message : "Google sign-in could not finish.")).finally(() => onLoading(false));
  }, [response, onError, onLoading, onSignedIn]);
  if (!configured) return null;
  return <Button variant="ghost" icon="logo-google" disabled={disabled} onPress={() => void promptAsync()}>Continue with Google</Button>;
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, maxWidth: 560, width: "100%", alignSelf: "center", justifyContent: "center", flexGrow: 1 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 35 },
  close: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  mark: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.blue, fontWeight: "900", letterSpacing: 1.3, fontSize: 11 },
  title: { color: colors.navy, fontSize: 31, lineHeight: 35, fontWeight: "900", letterSpacing: -0.7, marginTop: 9 },
  subtitle: { color: colors.grayText, lineHeight: 21, marginTop: 10, marginBottom: 22 },
  card: { padding: 20 },
  label: { color: colors.grayText, fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 7 },
  input: { height: 52, backgroundColor: "#FAFAF8", borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, color: colors.navy },
  error: { color: "#913C34", backgroundColor: "#FFF0EE", padding: 12, borderRadius: 12, marginBottom: 12, fontSize: 12 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.grayText, fontSize: 10, fontWeight: "900" },
  switch: { color: colors.blue, textAlign: "center", fontWeight: "800", marginTop: 18, fontSize: 13 },
  forgot: { color: colors.blue, textAlign: "right", fontWeight: "800", marginTop: 12, fontSize: 12 },
  demo: { color: colors.grayText, textAlign: "center", fontSize: 11, marginTop: 16 }
});

function strongPassword(value: string) {
  return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}
