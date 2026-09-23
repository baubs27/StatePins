import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

type Identity = { subject: string; email?: string; emailVerified: boolean; displayName?: string };
type JwtPayload = { sub?: string; email?: string; email_verified?: boolean | string; name?: string; aud?: string | string[]; iss?: string; exp?: number; nonce?: string };
type Jwk = JsonWebKey & { kid?: string; alg?: string };

let appleKeys: { keys: Jwk[]; expiresAt: number } | null = null;

export async function verifyProviderToken(provider: "google" | "apple", idToken: string, nonce?: string): Promise<Identity> {
  return provider === "google" ? verifyGoogle(idToken) : verifyApple(idToken, nonce);
}

async function verifyGoogle(idToken: string): Promise<Identity> {
  const allowed = splitEnv("GOOGLE_CLIENT_IDS");
  if (!allowed.length) throw serviceConfigurationError("GOOGLE_CLIENT_IDS");
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) throw invalidToken();
  const payload = await response.json() as JwtPayload;
  if (!payload.sub || !payload.aud || !allowed.includes(Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) || !["accounts.google.com", "https://accounts.google.com"].includes(payload.iss ?? "") || !payload.exp || payload.exp * 1000 <= Date.now()) throw invalidToken();
  const verified = payload.email_verified === true || payload.email_verified === "true";
  return { subject: payload.sub, email: payload.email?.toLowerCase(), emailVerified: verified, displayName: payload.name };
}

async function verifyApple(idToken: string, nonce?: string): Promise<Identity> {
  const allowed = splitEnv("APPLE_CLIENT_IDS");
  if (!allowed.length) throw serviceConfigurationError("APPLE_CLIENT_IDS");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw invalidToken();
  const header = decodeJson<{ alg?: string; kid?: string }>(parts[0]);
  const payload = decodeJson<JwtPayload>(parts[1]);
  if (header.alg !== "RS256" || !header.kid || payload.iss !== "https://appleid.apple.com" || !payload.sub || !payload.exp || payload.exp * 1000 <= Date.now()) throw invalidToken();
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud ?? ""];
  if (!audiences.some((value) => allowed.includes(value))) throw invalidToken();
  if (nonce && payload.nonce !== nonce) throw invalidToken();
  const keys = await getAppleKeys();
  const jwk = keys.find((item) => item.kid === header.kid && (!item.alg || item.alg === "RS256"));
  if (!jwk) throw invalidToken();
  const valid = verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"));
  if (!valid) throw invalidToken();
  return { subject: payload.sub, email: payload.email?.toLowerCase(), emailVerified: payload.email_verified === true || payload.email_verified === "true" };
}

async function getAppleKeys() {
  if (appleKeys && appleKeys.expiresAt > Date.now()) return appleKeys.keys;
  const response = await fetch("https://appleid.apple.com/auth/keys");
  if (!response.ok) throw invalidToken();
  const result = await response.json() as { keys: Jwk[] };
  appleKeys = { keys: result.keys, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return result.keys;
}

function decodeJson<T>(value: string): T {
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T; } catch { throw invalidToken(); }
}

function splitEnv(name: string) {
  return (process.env[name] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

function invalidToken() {
  return Object.assign(new Error("The identity provider could not verify this sign-in."), { statusCode: 401 });
}

function serviceConfigurationError(variable: string) {
  return Object.assign(new Error(`Social sign-in is not configured (${variable}).`), { statusCode: 503 });
}
