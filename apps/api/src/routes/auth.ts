import { readdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { issueSession, passwordHelp, revokeAllSessions, secureToken, sha256, strongPassword } from "../lib/security.js";
import { verifyProviderToken } from "../lib/oauth.js";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().max(128).refine(strongPassword, passwordHelp);
const authRateLimit = { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } };

export async function authRoutes(app: FastifyInstance) {
  app.post("/oauth/:provider", authRateLimit, async (request, reply) => {
    const providerResult = z.enum(["google", "apple"]).safeParse((request.params as { provider?: string }).provider);
    const body = z.object({ idToken: z.string().min(20).max(10_000), nonce: z.string().max(500).optional(), displayName: z.string().trim().max(60).optional() }).safeParse(request.body);
    if (!providerResult.success || !body.success) return reply.code(400).send({ message: "Invalid social sign-in request." });
    const identity = await verifyProviderToken(providerResult.data, body.data.idToken, body.data.nonce);
    let account = await prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider: providerResult.data, providerAccountId: identity.subject } }, include: { user: true } });
    if (!account) {
      if (!identity.email || !identity.emailVerified) return reply.code(400).send({ message: "The provider must share a verified email the first time you sign in." });
      let user = await prisma.user.findUnique({ where: { email: identity.email } });
      if (!user) {
        const username = await uniqueUsername(identity.email.split("@")[0] || "traveler");
        user = await prisma.user.create({ data: { email: identity.email, username, displayName: body.data.displayName || identity.displayName || username, passwordHash: await bcrypt.hash(secureToken(), 12), passwordAuthEnabled: false, emailVerifiedAt: new Date() } });
      }
      account = await prisma.oAuthAccount.create({ data: { provider: providerResult.data, providerAccountId: identity.subject, userId: user.id }, include: { user: true } });
    }
    const session = await issueSession(app, account.user);
    return { ...session, token: session.accessToken, user: await publicUser(account.user) };
  });

  app.post("/register", authRateLimit, async (request, reply) => {
    const parsed = z.object({ email: emailSchema, password: passwordSchema, username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/), displayName: z.string().trim().min(2).max(60) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0].message });
    const username = parsed.data.username.toLowerCase();
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: parsed.data.email }, { username }] } });
    if (existing) return reply.code(409).send({ message: "That email or username is already in use." });
    const user = await prisma.user.create({ data: { email: parsed.data.email, username, displayName: parsed.data.displayName, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
    const session = await issueSession(app, user);
    return reply.code(201).send({ ...session, token: session.accessToken, user: await publicUser(user) });
  });

  app.post("/login", authRateLimit, async (request, reply) => {
    const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Enter a valid email and password." });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const valid = user?.passwordAuthEnabled ? await bcrypt.compare(parsed.data.password, user.passwordHash) : await bcrypt.compare(parsed.data.password, "$2b$12$KIXQ4fQ0hxC8Qn4BzCFvoeI.rnU6TQHG9U7zBTL/XmDpyTqzjYl8q");
    if (!user || !valid) return reply.code(401).send({ message: "Email or password is incorrect." });
    const session = await issueSession(app, user);
    return { ...session, token: session.accessToken, user: await publicUser(user) };
  });

  app.post("/refresh", authRateLimit, async (request, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(32).max(500) }).safeParse(request.body);
    if (!parsed.success) return reply.code(401).send({ message: "Your session has expired. Please sign in again." });
    const stored = await prisma.refreshSession.findUnique({ where: { tokenHash: sha256(parsed.data.refreshToken) }, include: { user: true } });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      if (stored) await revokeAllSessions(stored.userId);
      return reply.code(401).send({ message: "Your session has expired. Please sign in again." });
    }
    await prisma.refreshSession.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const session = await issueSession(app, stored.user);
    return { ...session, token: session.accessToken, user: await publicUser(stored.user) };
  });

  app.post("/logout", async (request) => {
    const parsed = z.object({ refreshToken: z.string().optional() }).safeParse(request.body);
    if (parsed.success && parsed.data.refreshToken) await prisma.refreshSession.updateMany({ where: { tokenHash: sha256(parsed.data.refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
    return { signedOut: true };
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) return reply.code(401).send({ message: "Sign in to continue." });
    return { user: await publicUser(user) };
  });

  app.put("/password", { preHandler: requireAuth, config: { rateLimit: { max: 5, timeWindow: "5 minutes" } } }, async (request, reply) => {
    const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0].message });
    if (parsed.data.currentPassword === parsed.data.newPassword) return reply.code(400).send({ message: "Choose a password you have not just used." });
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) return reply.code(401).send({ message: "Your current password is incorrect." });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } });
    await revokeAllSessions(user.id);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const session = await issueSession(app, updated);
    return { updated: true, ...session, token: session.accessToken };
  });

  app.put("/email", { preHandler: requireAuth, config: { rateLimit: { max: 5, timeWindow: "5 minutes" } } }, async (request, reply) => {
    const parsed = z.object({ currentPassword: z.string().min(1).max(128), newEmail: emailSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Enter a valid new email address." });
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) return reply.code(401).send({ message: "Your current password is incorrect." });
    if (await prisma.user.findFirst({ where: { email: parsed.data.newEmail, NOT: { id: user.id } } })) return reply.code(409).send({ message: "That email is already in use." });
    await prisma.user.update({ where: { id: user.id }, data: { email: parsed.data.newEmail, emailVerifiedAt: null } });
    await revokeAllSessions(user.id);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const session = await issueSession(app, updated);
    return { updated: true, ...session, token: session.accessToken, user: await publicUser(updated) };
  });

  app.post("/forgot-password", authRateLimit, async (request, reply) => {
    const parsed = z.object({ email: emailSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Enter a valid email address." });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    let developmentResetToken: string | undefined;
    if (user) {
      await prisma.passwordResetToken.deleteMany({ where: { OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }] } });
      const token = secureToken(32);
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      await sendResetEmail(user.email, token);
      if (process.env.NODE_ENV !== "production" && process.env.DEV_RETURN_RESET_TOKEN === "1") developmentResetToken = token;
    }
    return { message: "If that email is registered, a password reset link is on its way.", ...(developmentResetToken ? { developmentResetToken } : {}) };
  });

  app.post("/reset-password", authRateLimit, async (request, reply) => {
    const parsed = z.object({ token: z.string().min(32).max(500), newPassword: passwordSchema }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0].message });
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(parsed.data.token) } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return reply.code(400).send({ message: "That reset link is invalid or expired." });
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12), sessionVersion: { increment: 1 } } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.refreshSession.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    return { updated: true };
  });

  app.delete("/account", { preHandler: requireAuth, config: { rateLimit: { max: 3, timeWindow: "10 minutes" } } }, async (request, reply) => {
    const parsed = z.object({ password: z.string().max(128).optional().default(""), confirmation: z.literal("DELETE") }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Type DELETE to confirm." });
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user || (user.passwordAuthEnabled && !(await bcrypt.compare(parsed.data.password, user.passwordHash)))) return reply.code(401).send({ message: "Your password is incorrect." });
    await prisma.user.delete({ where: { id: user.id } });
    await removeUserUploads(user.id);
    return reply.send({ deleted: true });
  });
}

async function sendResetEmail(email: string, token: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
  const resetUrl = `${process.env.PASSWORD_RESET_URL_BASE ?? "stateup://auth"}?resetToken=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: "Reset your StateUp password", html: `<p>A password reset was requested for your StateUp account.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in one hour. If this was not you, ignore this email.</p>` }) });
  if (!response.ok) throw new Error("The password reset email could not be sent.");
}

async function removeUserUploads(userId: string) {
  const uploadDir = resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const files = await readdir(uploadDir).catch(() => [] as string[]);
  await Promise.all(files.filter((name) => name.startsWith(`${userId}-`)).map((name) => unlink(resolve(uploadDir, name)).catch(() => undefined)));
}

async function publicUser(user: { id: string; email: string; username: string; displayName: string; avatarUrl: string | null; role: string; createdAt: Date; emailVerifiedAt: Date | null; passwordAuthEnabled: boolean }) {
  const passportNumber = await prisma.user.count({ where: { createdAt: { lte: user.createdAt } } });
  return { id: user.id, email: user.email, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role, passportNumber, emailVerified: Boolean(user.emailVerifiedAt), hasPassword: user.passwordAuthEnabled };
}

async function uniqueUsername(source: string) {
  const base = source.toLowerCase().replace(/[^a-z0-9._]/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 22) || "traveler";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}.${secureToken(3).toLowerCase().slice(0, 5)}`;
    if (!await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) return candidate;
  }
  return `traveler.${secureToken(6).toLowerCase().slice(0, 10)}`;
}
