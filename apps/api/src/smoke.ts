import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const apiRoot = resolve(process.cwd());
const databasePath = resolve(apiRoot, "prisma", "smoke.db");
const uploadPath = resolve(apiRoot, "smoke-uploads");
const prismaCli = resolve(apiRoot, "node_modules", "prisma", "build", "index.js");

rmSync(databasePath, { force: true });
rmSync(uploadPath, { recursive: true, force: true });
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./smoke.db";
process.env.JWT_SECRET = "smoke-test-secret-is-longer-than-thirty-two-characters";
process.env.PUBLIC_API_URL = "http://localhost:4000";
process.env.UPLOAD_DIR = uploadPath;
process.env.DEV_RETURN_RESET_TOKEN = "1";
execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: apiRoot, env: { ...process.env, RUST_BACKTRACE: "full", RUST_LOG: "trace" }, stdio: "pipe" });

const { buildApp } = await import("./app.js");
const { prisma } = await import("./lib/prisma.js");
const app = await buildApp();

type Json = Record<string, any>;
const userA = { email: "smoke.a@stateup.test", username: "smoke.a", displayName: "Smoke A", password: "SmokeTest1!" };
const userB = { email: "smoke.b@stateup.test", username: "smoke.b", displayName: "Smoke B", password: "SmokeTest2!" };

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
async function json(method: Method, url: string, body?: unknown, token?: string) {
  const response = await app.inject({ method, url, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }) }, payload: body === undefined ? undefined : JSON.stringify(body) });
  const data = response.body ? JSON.parse(response.body) as Json : {};
  return { status: response.statusCode, data, headers: response.headers };
}

try {
  await app.ready();
  assert.equal((await json("GET", "/health")).status, 200);
  assert.equal((await json("GET", "/v1/auth/me")).status, 401);
  assert.equal((await json("POST", "/v1/auth/oauth/google", { idToken: "not-a-real-provider-token" })).status, 503);

  const registerA = await json("POST", "/v1/auth/register", userA);
  assert.equal(registerA.status, 201);
  assert.ok(registerA.data.accessToken && registerA.data.refreshToken);
  assert.ok(!registerA.data.user.passwordHash);
  let tokenA = registerA.data.accessToken as string;

  const duplicate = await json("POST", "/v1/auth/register", userA);
  assert.equal(duplicate.status, 409);
  const badLogin = await json("POST", "/v1/auth/login", { email: userA.email, password: "wrong" });
  assert.equal(badLogin.status, 401);
  assert.equal(badLogin.data.message, "Email or password is incorrect.");

  const registerB = await json("POST", "/v1/auth/register", userB);
  assert.equal(registerB.status, 201);
  const tokenB = registerB.data.accessToken as string;
  const userBId = registerB.data.user.id as string;

  await prisma.state.create({ data: { id: "pa", name: "Pennsylvania", abbr: "PA", latitude: 41.2, longitude: -77.2 } });
  const boundary = "----stateup-smoke-boundary";
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZrSUAAAAASUVORK5CYII=", "base64");
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="pin.png"\r\nContent-Type: image/png\r\n\r\n`),
    png,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
  const upload = await app.inject({ method: "POST", url: "/v1/pins/uploads", headers: { authorization: `Bearer ${tokenA}`, "content-type": `multipart/form-data; boundary=${boundary}` }, payload: multipart });
  assert.equal(upload.statusCode, 201);
  const imageUrl = (JSON.parse(upload.body) as Json).url as string;
  assert.ok(imageUrl.endsWith(".png"));
  assert.ok(existsSync(uploadPath));

  const fakeUploadBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="fake.png"\r\nContent-Type: image/png\r\n\r\nnot-an-image\r\n--${boundary}--\r\n`)
  ]);
  const fakeUpload = await app.inject({ method: "POST", url: "/v1/pins/uploads", headers: { authorization: `Bearer ${tokenA}`, "content-type": `multipart/form-data; boundary=${boundary}` }, payload: fakeUploadBody });
  assert.equal(fakeUpload.statusCode, 415);

  const pinResult = await json("POST", "/v1/pins", { stateId: "pa", name: "Smoke Trail", city: "Harrisburg", description: "A real smoke-tested recommendation with a useful description.", category: "Nature", imageUrl, latitude: 40.2732, longitude: -76.8867 }, tokenA);
  assert.equal(pinResult.status, 201);
  const pinId = pinResult.data.pin.id as string;
  assert.equal((await json("GET", `/v1/pins/${pinId}`)).status, 200);

  const vote = await json("POST", `/v1/pins/${pinId}/vote`, undefined, tokenB);
  assert.deepEqual({ status: vote.status, upvoted: vote.data.upvoted, count: vote.data.count }, { status: 200, upvoted: true, count: 1 });
  assert.equal((await json("POST", `/v1/pins/${pinId}/favorite`, undefined, tokenB)).data.favorited, true);
  assert.equal((await json("GET", "/v1/pins/favorites/me", undefined, tokenB)).data.favorites.length, 1);
  assert.equal((await json("POST", `/v1/itinerary/${pinId}`, undefined, tokenB)).data.saved, true);
  assert.equal((await json("GET", "/v1/itinerary", undefined, tokenB)).data.items.length, 1);
  assert.equal((await json("POST", `/v1/pins/${pinId}/comments`, { text: "Smoke-tested comment." }, tokenB)).status, 201);

  const search = await json("GET", "/v1/social/users?q=smoke.a", undefined, tokenB);
  assert.equal(search.data.users.length, 1);
  const friendRequest = await json("POST", `/v1/social/friends/${registerA.data.user.id}`, undefined, tokenB);
  assert.equal(friendRequest.status, 201);
  const incoming = await json("GET", "/v1/social/friends", undefined, tokenA);
  assert.equal(incoming.data.incoming.length, 1);
  assert.equal((await json("PATCH", `/v1/social/friends/${friendRequest.data.friendship.id}`, { action: "ACCEPT" }, tokenA)).data.accepted, true);
  assert.equal((await json("GET", "/v1/social/friends", undefined, tokenB)).data.friends.length, 1);

  assert.equal((await json("POST", "/v1/moderation/reports", { targetType: "PIN", targetId: pinId, reason: "OTHER", details: "Automated smoke test report." }, tokenB)).status, 201);
  await prisma.chatRoom.create({ data: { id: "pa-smoke", stateId: "pa", name: "PA Smoke Room" } });
  assert.equal((await json("POST", "/v1/chat/rooms/pa-smoke/messages", { text: "Hello from the smoke suite." }, tokenB)).status, 201);
  assert.equal((await json("GET", "/v1/chat/rooms/pa-smoke/messages", undefined, tokenA)).data.messages.length, 1);

  const emailChanged = await json("PUT", "/v1/auth/email", { currentPassword: userA.password, newEmail: "smoke.a.changed@stateup.test" }, tokenA);
  assert.equal(emailChanged.status, 200);
  assert.equal((await json("GET", "/v1/auth/me", undefined, tokenA)).status, 401);
  tokenA = emailChanged.data.accessToken;
  const passwordChanged = await json("PUT", "/v1/auth/password", { currentPassword: userA.password, newPassword: "ChangedSmoke3!" }, tokenA);
  assert.equal(passwordChanged.status, 200);
  assert.equal((await json("POST", "/v1/auth/login", { email: "smoke.a.changed@stateup.test", password: userA.password })).status, 401);
  assert.equal((await json("POST", "/v1/auth/login", { email: "smoke.a.changed@stateup.test", password: "ChangedSmoke3!" })).status, 200);

  const forgot = await json("POST", "/v1/auth/forgot-password", { email: userB.email });
  assert.equal(forgot.status, 200);
  assert.ok(forgot.data.developmentResetToken);
  assert.equal((await json("POST", "/v1/auth/reset-password", { token: forgot.data.developmentResetToken, newPassword: "ResetSmoke4!" })).status, 200);
  const loginResetB = await json("POST", "/v1/auth/login", { email: userB.email, password: "ResetSmoke4!" });
  assert.equal(loginResetB.status, 200);
  const freshTokenB = loginResetB.data.accessToken as string;

  assert.equal((await json("POST", `/v1/moderation/blocks/${registerA.data.user.id}`, undefined, freshTokenB)).status, 201);
  assert.equal((await json("GET", "/v1/social/friends", undefined, freshTokenB)).data.friends.length, 0);
  assert.equal((await json("DELETE", `/v1/moderation/blocks/${registerA.data.user.id}`, undefined, freshTokenB)).data.blocked, false);

  const deleteB = await json("DELETE", "/v1/auth/account", { password: "ResetSmoke4!", confirmation: "DELETE" }, freshTokenB);
  assert.equal(deleteB.status, 200);
  assert.equal(await prisma.user.findUnique({ where: { id: userBId } }), null);
  assert.equal(await prisma.comment.count({ where: { authorId: userBId } }), 0);

  console.log("PASS StateUp API smoke suite: auth, privacy, upload, pins, votes, favorites, itinerary, comments, friends, moderation, chat, recovery, and deletion.");
} finally {
  await app.close();
  await prisma.$disconnect();
  rmSync(databasePath, { force: true });
  rmSync(uploadPath, { recursive: true, force: true });
}
