import { resolve } from "node:path";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chat.js";
import { itineraryRoutes } from "./routes/itinerary.js";
import { moderationRoutes } from "./routes/moderation.js";
import { pinRoutes } from "./routes/pins.js";
import { socialRoutes } from "./routes/social.js";
import { stateRoutes } from "./routes/states.js";

export async function buildApp() {
  const production = process.env.NODE_ENV === "production";
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || (production && /replace|change|example/i.test(jwtSecret))) {
    throw new Error("JWT_SECRET must be a unique secret of at least 32 characters.");
  }
  const allowedOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (production && allowedOrigins.length === 0) throw new Error("CORS_ORIGIN is required in production.");
  if (production && process.env.PUBLIC_API_URL && !process.env.PUBLIC_API_URL.startsWith("https://")) {
    throw new Error("PUBLIC_API_URL must use HTTPS in production.");
  }

  const app = Fastify({
    trustProxy: production,
    bodyLimit: 1_000_000,
    logger: process.env.NODE_ENV === "test" ? false : {
      level: production ? "info" : "debug",
      redact: ["req.headers.authorization", "req.headers.cookie", "body.password", "body.currentPassword", "body.newPassword", "body.refreshToken", "body.idToken"]
    }
  });
  await app.register(helmet, {
    contentSecurityPolicy: production,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    strictTransportSecurity: production ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false
  });
  await app.register(cors, {
    origin: production ? allowedOrigins : true,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute", ban: 3 });
  await app.register(jwt, { secret: jwtSecret });
  await app.register(multipart, { limits: { files: 1, fields: 10, fileSize: Number(process.env.MAX_UPLOAD_MB ?? 8) * 1024 * 1024 } });
  await app.register(fastifyStatic, {
    root: resolve(process.env.UPLOAD_DIR ?? "./uploads"),
    prefix: "/uploads/",
    decorateReply: false,
    cacheControl: true,
    maxAge: production ? "7d" : 0,
    immutable: production
  });

  app.get("/health", async () => ({ ok: true, service: "stateup-api", timestamp: new Date().toISOString() }));
  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(stateRoutes, { prefix: "/v1/states" });
  await app.register(pinRoutes, { prefix: "/v1/pins" });
  await app.register(itineraryRoutes, { prefix: "/v1/itinerary" });
  await app.register(moderationRoutes, { prefix: "/v1/moderation" });
  await app.register(chatRoutes, { prefix: "/v1/chat" });
  await app.register(socialRoutes, { prefix: "/v1/social" });

  app.setErrorHandler((error, _request, reply) => {
    const apiError = error as { validation?: unknown; code?: string; statusCode?: number; message?: string };
    app.log.error(error);
    if (apiError.validation) return reply.code(400).send({ message: "The request contains invalid data." });
    if (apiError.code === "FST_REQ_FILE_TOO_LARGE") return reply.code(413).send({ message: `Photos must be under ${process.env.MAX_UPLOAD_MB ?? 8} MB.` });
    const status = apiError.statusCode && apiError.statusCode < 500 ? apiError.statusCode : 500;
    return reply.code(status).send({ message: status < 500 ? apiError.message : "Something went wrong. Please try again." });
  });
  return app;
}
