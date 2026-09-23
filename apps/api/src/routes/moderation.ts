import { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export async function moderationRoutes(app: FastifyInstance) {
  app.post("/reports", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = z.object({
      targetType: z.enum(["PIN", "COMMENT", "MESSAGE", "USER"]),
      targetId: z.string().min(1).max(100),
      reason: z.enum(["SPAM", "HARASSMENT", "UNSAFE", "INAPPROPRIATE", "MISINFORMATION", "OTHER"]),
      details: z.string().trim().max(1000).optional()
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Choose a reason for your report." });
    const report = await prisma.report.create({ data: { reporterId: request.user.sub, ...parsed.data } });
    return reply.code(201).send({ report, message: "Thanks. Your report is queued for review." });
  });

  app.post("/blocks/:userId", { preHandler: requireAuth }, async (request, reply) => {
    const blockedId = (request.params as { userId: string }).userId;
    if (blockedId === request.user.sub) return reply.code(400).send({ message: "You cannot block yourself." });
    if (!await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } })) return reply.code(404).send({ message: "User not found." });
    const [block] = await prisma.$transaction([
      prisma.block.upsert({ where: { blockerId_blockedId: { blockerId: request.user.sub, blockedId } }, update: {}, create: { blockerId: request.user.sub, blockedId } }),
      prisma.friendship.deleteMany({ where: { OR: [{ requesterId: request.user.sub, addresseeId: blockedId }, { requesterId: blockedId, addresseeId: request.user.sub }] } })
    ]);
    return reply.code(201).send({ blocked: true });
  });

  app.delete("/blocks/:userId", { preHandler: requireAuth }, async (request) => {
    await prisma.block.deleteMany({ where: { blockerId: request.user.sub, blockedId: (request.params as { userId: string }).userId } });
    return { blocked: false };
  });

  app.get("/blocks", { preHandler: requireAuth }, async (request) => ({
    blockedUsers: await prisma.block.findMany({ where: { blockerId: request.user.sub }, include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" } })
  }));

  app.get("/admin/reports", { preHandler: requireAdmin }, async (request) => {
    const query = z.object({ status: z.string().default("OPEN") }).parse(request.query);
    return { reports: await prisma.report.findMany({ where: { status: query.status }, include: { reporter: { select: { username: true, email: true } } }, orderBy: { createdAt: "asc" } }) };
  });

  app.patch("/admin/reports/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = z.object({ status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ message: "Invalid review status." });
    const report = await prisma.report.update({ where: { id: (request.params as { id: string }).id }, data: { status: parsed.data.status, reviewedBy: request.user.sub, reviewedAt: new Date() } }).catch(() => null);
    if (!report) return reply.code(404).send({ message: "Report not found." });
    return { report };
  });
}
