import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "./prisma.js";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_DAYS = 30;

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function secureToken(bytes = 48) {
  return randomBytes(bytes).toString("base64url");
}

export async function issueSession(app: FastifyInstance, user: { id: string; email: string; role: string; sessionVersion: number }) {
  const refreshToken = secureToken();
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)
    }
  });
  return {
    accessToken: app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, sv: user.sessionVersion },
      { expiresIn: ACCESS_TOKEN_TTL }
    ),
    refreshToken
  };
}

export async function revokeAllSessions(userId: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
    prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);
}

export function strongPassword(value: string) {
  return value.length >= 10 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

export const passwordHelp = "Use 10–128 characters with uppercase, lowercase, a number, and a symbol.";
