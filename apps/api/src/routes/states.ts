import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

export async function stateRoutes(app: FastifyInstance) {
  app.get("/", async (request) => {
    let userId: string | undefined;
    try { await request.jwtVerify(); userId = request.user.sub; } catch { /* public map */ }
    const states = await prisma.state.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { pins: { where: { status: "ACTIVE" } } } },
        visits: userId ? { where: { userId } } : false
      }
    });
    return { states: states.map((state) => ({ ...state, pinCount: state._count.pins, visited: "visits" in state && Array.isArray(state.visits) && state.visits.length > 0, _count: undefined, visits: undefined })) };
  });

  app.put("/:id/visited", { preHandler: requireAuth }, async (request, reply) => {
    const stateId = (request.params as { id: string }).id;
    const state = await prisma.state.findUnique({ where: { id: stateId } });
    if (!state) return reply.code(404).send({ message: "State not found." });
    const key = { userId_stateId: { userId: request.user.sub, stateId } };
    const current = await prisma.visitedState.findUnique({ where: key });
    if (current) {
      await prisma.visitedState.delete({ where: key });
      return { visited: false };
    }
    await prisma.visitedState.create({ data: { userId: request.user.sub, stateId } });
    return { visited: true };
  });
}
