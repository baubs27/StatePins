import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const USE_API_IN_DEV = process.env.EXPO_PUBLIC_USE_API === "1";
export const OFFLINE_DEV = __DEV__ && !USE_API_IN_DEV;

type Session = { accessToken: string; refreshToken: string };
const ACCESS_KEY = "stateup.access-token";
const REFRESH_KEY = "stateup.refresh-token";
const secureOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

function hostFromExpo(value?: string | null) {
  if (!value) return null;
  const withoutScheme = value.replace(/^[a-zA-Z]+:\/\//, "");
  const host = withoutScheme.split("/")[0]?.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  if (__DEV__ && Platform.OS !== "web") {
    const manifestHost = Constants as typeof Constants & { manifest2?: { extra?: { expoClient?: { hostUri?: string } } }; expoGoConfig?: { debuggerHost?: string } };
    const metroHost = hostFromExpo(Constants.expoConfig?.hostUri) ?? hostFromExpo(manifestHost.manifest2?.extra?.expoClient?.hostUri) ?? hostFromExpo(manifestHost.expoGoConfig?.debuggerHost);
    if (metroHost) return `http://${metroHost}:4000`;
  }
  return "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

function webStorage() {
  return typeof sessionStorage === "undefined" ? null : sessionStorage;
}

export const tokenStore = {
  get: () => Platform.OS === "web" ? Promise.resolve(webStorage()?.getItem(ACCESS_KEY) ?? null) : SecureStore.getItemAsync(ACCESS_KEY),
  set: (value: string) => Platform.OS === "web" ? Promise.resolve(webStorage()?.setItem(ACCESS_KEY, value)) : SecureStore.setItemAsync(ACCESS_KEY, value, secureOptions),
  getRefresh: () => Platform.OS === "web" ? Promise.resolve(webStorage()?.getItem(REFRESH_KEY) ?? null) : SecureStore.getItemAsync(REFRESH_KEY),
  setSession: async ({ accessToken, refreshToken }: Session) => {
    if (Platform.OS === "web") {
      webStorage()?.setItem(ACCESS_KEY, accessToken);
      webStorage()?.setItem(REFRESH_KEY, refreshToken);
      return;
    }
    await Promise.all([SecureStore.setItemAsync(ACCESS_KEY, accessToken, secureOptions), SecureStore.setItemAsync(REFRESH_KEY, refreshToken, secureOptions)]);
  },
  clear: async () => {
    if (Platform.OS === "web") {
      webStorage()?.removeItem(ACCESS_KEY);
      webStorage()?.removeItem(REFRESH_KEY);
      return;
    }
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  }
};

async function request(path: string, init: RequestInit, accessToken: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), __DEV__ ? 5_000 : 15_000);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers
      }
    });
  } catch {
    throw new Error(`StateUp could not reach its server at ${API_URL}. Make sure your phone is on the same Wi-Fi as this computer and allow Node.js through Windows Firewall.`);
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSession() {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return null;
  const response = await request("/v1/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }, null);
  if (!response.ok) {
    await tokenStore.clear();
    return null;
  }
  const session = await response.json() as Session;
  await tokenStore.setSession(session);
  return session.accessToken;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (OFFLINE_DEV) throw new Error("StateUp is running in local phone demo mode without API requests.");
  let response = await request(path, init, await tokenStore.get());
  if (response.status === 401 && path !== "/v1/auth/login" && path !== "/v1/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) response = await request(path, init, refreshed);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "Something went wrong." }));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
