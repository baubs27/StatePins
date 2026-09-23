import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { OFFLINE_DEV, api, tokenStore } from "@/lib/api";

type User = { id: string; email: string; username: string; displayName: string; avatarUrl?: string | null; role: string; passportNumber?: number; emailVerified?: boolean; hasPassword?: boolean };
type AuthValue = {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (value: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  loginWithProvider: (provider: "google" | "apple", idToken: string, displayName?: string, nonce?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeEmail: (currentPassword: string, newEmail: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | undefined>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);
const DEMO_EMAIL = "demo@stateup.app";
const DEMO_PASSWORD = "StateUp123!";
const localDemoUser: User = {
  id: "demo-local",
  email: DEMO_EMAIL,
  username: "mia.travels",
  displayName: "Mia Rhodes",
  role: "USER",
  passportNumber: 1,
  hasPassword: true
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (OFFLINE_DEV) {
      setIsGuest(true);
      setLoading(false);
      return;
    }
    tokenStore.get().then((token) => {
      if (!token) return;
      return api<{ user: User }>("/v1/auth/me").then((result) => setUser(result.user));
    }).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);
  const value = useMemo<AuthValue>(() => ({
    user,
    isGuest,
    loading,
    login: async (email, password) => {
      const normalizedEmail = email.trim().toLowerCase();
      const demoMatch = normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD;
      if (OFFLINE_DEV) {
        await tokenStore.clear();
        setIsGuest(false);
        setUser(demoMatch ? localDemoUser : {
          id: `local-${normalizedEmail || "user"}`,
          email: normalizedEmail,
          username: normalizedEmail.split("@")[0] || "local.traveler",
          displayName: normalizedEmail.split("@")[0] || "Local Traveler",
          role: "USER",
          passportNumber: simulatedPassportNumber(normalizedEmail || "local"),
          hasPassword: true
        });
        return;
      }
      try {
        const result = await api<{ accessToken: string; refreshToken: string; user: User }>("/v1/auth/login", { method: "POST", body: JSON.stringify({ email: normalizedEmail, password }) });
        await tokenStore.setSession(result);
        setIsGuest(false);
        setUser(result.user);
      } catch (error) {
        if (__DEV__ && demoMatch) {
          await tokenStore.clear();
          setIsGuest(false);
          setUser(localDemoUser);
          return;
        }
        throw error;
      }
    },
    register: async (body) => {
      if (OFFLINE_DEV) {
        await tokenStore.clear();
        setIsGuest(false);
        setUser({
          id: "local-register",
          email: body.email.trim().toLowerCase(),
          username: body.username.trim(),
          displayName: body.displayName.trim(),
          role: "USER",
          passportNumber: simulatedPassportNumber(body.email),
          hasPassword: true
        });
        return;
      }
      const result = await api<{ accessToken: string; refreshToken: string; user: User }>("/v1/auth/register", { method: "POST", body: JSON.stringify(body) });
      await tokenStore.setSession(result);
      setIsGuest(false);
      setUser(result.user);
    },
    loginWithProvider: async (provider, idToken, displayName, nonce) => {
      if (OFFLINE_DEV) throw new Error("Social sign-in needs API mode. Set EXPO_PUBLIC_USE_API=1 and configure provider client IDs.");
      const result = await api<{ accessToken: string; refreshToken: string; user: User }>(`/v1/auth/oauth/${provider}`, { method: "POST", body: JSON.stringify({ idToken, displayName, nonce }) });
      await tokenStore.setSession(result);
      setIsGuest(false);
      setUser(result.user);
    },
    continueAsGuest: async () => {
      await tokenStore.clear();
      setIsGuest(true);
      setUser({
        id: "guest",
        email: "",
        username: "guest.traveler",
        displayName: "Guest Traveler",
        role: "GUEST",
        passportNumber: 0
      });
    },
    changePassword: async (currentPassword, newPassword) => {
      if (OFFLINE_DEV) return;
      const result = await api<{ updated: boolean; accessToken: string; refreshToken: string }>("/v1/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      await tokenStore.setSession(result);
    },
    changeEmail: async (currentPassword, newEmail) => {
      if (OFFLINE_DEV) {
        setUser((current) => current ? { ...current, email: newEmail.trim().toLowerCase() } : current);
        return;
      }
      const result = await api<{ accessToken: string; refreshToken: string; user: User }>("/v1/auth/email", { method: "PUT", body: JSON.stringify({ currentPassword, newEmail }) });
      await tokenStore.setSession(result);
      setUser(result.user);
    },
    requestPasswordReset: async (email) => {
      if (OFFLINE_DEV) return "development-reset-token";
      const result = await api<{ developmentResetToken?: string }>("/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      return result.developmentResetToken;
    },
    resetPassword: async (token, newPassword) => {
      if (OFFLINE_DEV) return;
      await api<{ updated: boolean }>("/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
      await tokenStore.clear();
      setUser(null);
      setIsGuest(false);
    },
    deleteAccount: async (password) => {
      if (!OFFLINE_DEV) await api<{ deleted: boolean }>("/v1/auth/account", { method: "DELETE", body: JSON.stringify({ password, confirmation: "DELETE" }) });
      await tokenStore.clear();
      setIsGuest(false);
      setUser(null);
    },
    logout: async () => {
      const refreshToken = await tokenStore.getRefresh();
      if (!OFFLINE_DEV && refreshToken) await api("/v1/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
      await tokenStore.clear();
      setIsGuest(false);
      setUser(null);
    }
  }), [user, isGuest, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function simulatedPassportNumber(seed: string) {
  let hash = 0;
  for (const char of seed.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 900000;
  return hash + 1000;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
