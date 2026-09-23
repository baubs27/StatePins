import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function chatRoutes(app: FastifyInstance) {
  app.get("/rooms", { preHandler: requireAuth }, async () => ({
    rooms: await prisma.chatRoom.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } })
  }));

  app.get("/rooms/:id/messages", { preHandler: requireAuth }, async (request) => ({
    messages: await prisma.chatMessage.findMany({
      where: {
        roomId: (request.params as { id: string }).id,
        status: "ACTIVE",
        author: {
          blocksGot: { none: { blockerId: request.user.sub } },
          blocksMade: { none: { blockedId: request.user.sub } }
        }
      },
      include: { author: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  }));

  app.post("/rooms/:id/messages", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = z.object({ text: z.string().trim().min(1).max(1000) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Message must be between 1 and 1,000 characters." });
    const message = await prisma.chatMessage.create({ data: { roomId: (request.params as { id: string }).id, authorId: request.user.sub, text: parsed.data.text } }).catch(() => null);
    if (!message) return reply.code(404).send({ message: "Chat room not found." });
    return reply.code(201).send({ message });
  });
}
