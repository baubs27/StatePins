import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function itineraryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/", async (request) => {
    const items = await prisma.itineraryItem.findMany({
      where: { userId: request.user.sub },
      include: { pin: { include: { state: true, author: { select: { username: true } }, _count: { select: { votes: true, comments: true } } } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }]
    });
    return { items };
  });

  app.post("/:pinId", async (request, reply) => {
    const pinId = (request.params as { pinId: string }).pinId;
    const existing = await prisma.itineraryItem.findUnique({ where: { userId_pinId: { userId: request.user.sub, pinId } } });
    if (existing) {
      await prisma.itineraryItem.delete({ where: { id: existing.id } });
      return { saved: false };
    }
    const position = await prisma.itineraryItem.count({ where: { userId: request.user.sub } });
    const item = await prisma.itineraryItem.create({ data: { userId: request.user.sub, pinId, position } }).catch(() => null);
    if (!item) return reply.code(404).send({ message: "Recommendation not found." });
    return reply.code(201).send({ saved: true, item });
  });

  app.patch("/reorder", async (request, reply) => {
    const parsed = z.object({ pinIds: z.array(z.string()).max(100) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid itinerary order." });
    await prisma.$transaction(parsed.data.pinIds.map((pinId, position) => prisma.itineraryItem.updateMany({ where: { userId: request.user.sub, pinId }, data: { position } })));
    return { updated: true };
  });
}
