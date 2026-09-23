import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const pinBody = z.object({
  stateId: z.string().min(2).max(3),
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1500),
  category: z.enum(["Food", "Nature", "Landmark", "Hidden Gem", "Road Trip Stop", "Museum", "Other"]),
  imageUrl: z.string().url(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

const include = {
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  comments: { where: { status: "ACTIVE" }, include: { author: { select: { username: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" as const } },
  _count: { select: { votes: true } }
};

export async function pinRoutes(app: FastifyInstance) {
  app.get("/favorites/me", { preHandler: requireAuth }, async (request) => ({
    favorites: await prisma.favoritePin.findMany({ where: { userId: request.user.sub }, include: { pin: { include } }, orderBy: { createdAt: "desc" } })
  }));

  app.get("/", async (request) => {
    const query = z.object({ stateId: z.string().optional(), nearLat: z.coerce.number().optional(), nearLng: z.coerce.number().optional() }).parse(request.query);
    let viewerId: string | undefined;
    try { await request.jwtVerify(); viewerId = request.user.sub; } catch { /* public discovery */ }
    const pins = await prisma.pin.findMany({ where: {
      status: "ACTIVE",
      ...(query.stateId ? { stateId: query.stateId } : {}),
      ...(viewerId ? { author: { blocksGot: { none: { blockerId: viewerId } }, blocksMade: { none: { blockedId: viewerId } } } } : {})
    }, include, orderBy: { createdAt: "desc" } });
    return { pins };
  });

  app.get("/:id", async (request, reply) => {
    const pin = await prisma.pin.findFirst({ where: { id: (request.params as { id: string }).id, status: "ACTIVE" }, include });
    if (!pin) return reply.code(404).send({ message: "Recommendation not found." });
    return { pin };
  });

  app.post("/", { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, async (request, reply) => {
    const parsed = pinBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: parsed.error.issues[0].message });
    const pin = await prisma.pin.create({ data: { ...parsed.data, authorId: request.user.sub }, include });
    return reply.code(201).send({ pin });
  });

  app.post("/:id/vote", { preHandler: requireAuth }, async (request, reply) => {
    const pinId = (request.params as { id: string }).id;
    if (!await prisma.pin.findFirst({ where: { id: pinId, status: "ACTIVE" } })) return reply.code(404).send({ message: "Recommendation not found." });
    const key = { userId_pinId: { userId: request.user.sub, pinId } };
    const vote = await prisma.vote.findUnique({ where: key });
    if (vote) await prisma.vote.delete({ where: key });
    else await prisma.vote.create({ data: { userId: request.user.sub, pinId } });
    return { upvoted: !vote, count: await prisma.vote.count({ where: { pinId } }) };
  });

  app.post("/:id/favorite", { preHandler: requireAuth }, async (request, reply) => {
    const pinId = (request.params as { id: string }).id;
    if (!await prisma.pin.findFirst({ where: { id: pinId, status: "ACTIVE" } })) return reply.code(404).send({ message: "Recommendation not found." });
    const key = { userId_pinId: { userId: request.user.sub, pinId } };
    const favorite = await prisma.favoritePin.findUnique({ where: key });
    if (favorite) await prisma.favoritePin.delete({ where: key });
    else await prisma.favoritePin.create({ data: { userId: request.user.sub, pinId } });
    return { favorited: !favorite };
  });

  app.post("/:id/comments", { preHandler: requireAuth, config: { rateLimit: { max: 30, timeWindow: "5 minutes" } } }, async (request, reply) => {
    const body = z.object({ text: z.string().trim().min(1).max(500) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Comment must be between 1 and 500 characters." });
    const pinId = (request.params as { id: string }).id;
    if (!await prisma.pin.findFirst({ where: { id: pinId, status: "ACTIVE" } })) return reply.code(404).send({ message: "Recommendation not found." });
    const comment = await prisma.comment.create({ data: { pinId, authorId: request.user.sub, text: body.data.text }, include: { author: { select: { username: true, avatarUrl: true } } } });
    return reply.code(201).send({ comment });
  });

  app.post("/uploads", { preHandler: requireAuth, config: { rateLimit: { max: 12, timeWindow: "1 hour" } } }, async (request, reply) => {
    const file = await request.file({ limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 8) * 1024 * 1024, files: 1 } });
    if (!file) return reply.code(400).send({ message: "Please add a photo to post a recommendation." });
    const buffer = await file.toBuffer();
    const detected = detectImage(buffer);
    if (!detected) return reply.code(415).send({ message: "Use a real JPEG, PNG, WebP, or HEIC photo." });
    if (!new Set(detected.mimes).has(file.mimetype.toLowerCase())) return reply.code(415).send({ message: "The photo type does not match its contents." });
    const uploadDir = resolve(process.env.UPLOAD_DIR ?? "./uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${request.user.sub}-${randomUUID()}.${detected.extension}`;
    await writeFile(resolve(uploadDir, filename), buffer, { flag: "wx" });
    return reply.code(201).send({ url: `${process.env.PUBLIC_API_URL ?? "http://localhost:4000"}/uploads/${filename}` });
  });
}

function detectImage(value: Buffer): { extension: string; mimes: string[] } | null {
  if (value.length < 12) return null;
  if (value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff) return { extension: "jpg", mimes: ["image/jpeg"] };
  if (value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: "png", mimes: ["image/png"] };
  if (value.subarray(0, 4).toString("ascii") === "RIFF" && value.subarray(8, 12).toString("ascii") === "WEBP") return { extension: "webp", mimes: ["image/webp"] };
  if (value.subarray(4, 8).toString("ascii") === "ftyp" && /heic|heix|hevc|hevx|mif1/.test(value.subarray(8, 12).toString("ascii"))) return { extension: "heic", mimes: ["image/heic", "image/heif"] };
  return null;
}
