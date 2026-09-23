import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const account = await prisma.user.findUnique({ where: { id: request.user.sub }, select: { sessionVersion: true } });
    if (!account || account.sessionVersion !== request.user.sv) throw new Error("revoked session");
  } catch {
    return reply.code(401).send({ message: "Sign in to continue." });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (!request.user || request.user.role !== "ADMIN") return reply.code(403).send({ message: "Admin access required." });
}
