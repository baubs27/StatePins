import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: string; sv: number };
    user: { sub: string; email: string; role: string; sv: number };
  }
}
