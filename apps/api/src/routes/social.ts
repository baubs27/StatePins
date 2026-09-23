import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

const safeUser = { id: true, username: true, displayName: true, avatarUrl: true } as const;

export async function socialRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/users", async (request, reply) => {
    const parsed = z.object({ q: z.string().trim().min(2).max(50) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ message: "Search with at least two characters." });
    const users = await prisma.user.findMany({
      where: {
        id: { not: request.user.sub },
        AND: [
          { OR: [{ username: { contains: parsed.data.q } }, { displayName: { contains: parsed.data.q } }] },
          { blocksGot: { none: { blockerId: request.user.sub } } },
          { blocksMade: { none: { blockedId: request.user.sub } } }
        ]
      },
      select: safeUser,
      take: 20,
      orderBy: { username: "asc" }
    });
    return { users };
  });

  app.get("/friends", async (request) => {
    const rows = await prisma.friendship.findMany({
      where: { OR: [{ requesterId: request.user.sub }, { addresseeId: request.user.sub }] },
      include: { requester: { select: safeUser }, addressee: { select: safeUser } },
      orderBy: { updatedAt: "desc" }
    });
    return {
      friends: rows.filter((row) => row.status === "ACCEPTED").map((row) => ({ friendshipId: row.id, user: row.requesterId === request.user.sub ? row.addressee : row.requester })),
      incoming: rows.filter((row) => row.status === "PENDING" && row.addresseeId === request.user.sub).map((row) => ({ friendshipId: row.id, user: row.requester })),
      outgoing: rows.filter((row) => row.status === "PENDING" && row.requesterId === request.user.sub).map((row) => ({ friendshipId: row.id, user: row.addressee }))
    };
  });

  app.post("/friends/:userId", async (request, reply) => {
    const addresseeId = (request.params as { userId: string }).userId;
    if (addresseeId === request.user.sub) return reply.code(400).send({ message: "You cannot add yourself." });
    const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: request.user.sub, blockedId: addresseeId }, { blockerId: addresseeId, blockedId: request.user.sub }] } });
    if (blocked) return reply.code(403).send({ message: "This friend request is not available." });
    const target = await prisma.user.findUnique({ where: { id: addresseeId }, select: { id: true } });
    if (!target) return reply.code(404).send({ message: "User not found." });
    const existing = await prisma.friendship.findFirst({ where: { OR: [{ requesterId: request.user.sub, addresseeId }, { requesterId: addresseeId, addresseeId: request.user.sub }] } });
    if (existing) return reply.code(409).send({ message: existing.status === "ACCEPTED" ? "You are already friends." : "A friend request already exists." });
    const friendship = await prisma.friendship.create({ data: { requesterId: request.user.sub, addresseeId } });
    return reply.code(201).send({ friendship });
  });

  app.patch("/friends/:id", async (request, reply) => {
    const parsed = z.object({ action: z.enum(["ACCEPT", "REJECT"]) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Choose accept or reject." });
    const friendship = await prisma.friendship.findFirst({ where: { id: (request.params as { id: string }).id, addresseeId: request.user.sub, status: "PENDING" } });
    if (!friendship) return reply.code(404).send({ message: "Friend request not found." });
    if (parsed.data.action === "REJECT") {
      await prisma.friendship.delete({ where: { id: friendship.id } });
      return { accepted: false };
    }
    await prisma.friendship.update({ where: { id: friendship.id }, data: { status: "ACCEPTED" } });
    return { accepted: true };
  });

  app.delete("/friends/:id", async (request, reply) => {
    const friendship = await prisma.friendship.findFirst({ where: { id: (request.params as { id: string }).id, OR: [{ requesterId: request.user.sub }, { addresseeId: request.user.sub }] } });
    if (!friendship) return reply.code(404).send({ message: "Friendship not found." });
    await prisma.friendship.delete({ where: { id: friendship.id } });
    return { removed: true };
  });
}
