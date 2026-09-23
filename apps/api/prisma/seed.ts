import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const stateData = [
  ["al","Alabama","AL",32.8,-86.8],["ak","Alaska","AK",64.2,-152.5],["az","Arizona","AZ",34,-111.1],["ar","Arkansas","AR",35.2,-92.4],
  ["ca","California","CA",36.8,-119.4],["co","Colorado","CO",39,-105.5],["ct","Connecticut","CT",41.6,-72.7],["de","Delaware","DE",39,-75.5],
  ["fl","Florida","FL",27.7,-81.5],["ga","Georgia","GA",32.7,-83.4],["hi","Hawaii","HI",19.9,-155.6],["id","Idaho","ID",44.2,-114.5],
  ["il","Illinois","IL",40,-89.2],["in","Indiana","IN",40.3,-86.1],["ia","Iowa","IA",42.1,-93.5],["ks","Kansas","KS",38.5,-98.4],
  ["ky","Kentucky","KY",37.8,-85.8],["la","Louisiana","LA",31,-92],["me","Maine","ME",45.3,-69.2],["md","Maryland","MD",39,-76.7],
  ["ma","Massachusetts","MA",42.4,-71.4],["mi","Michigan","MI",44.3,-85.6],["mn","Minnesota","MN",46.4,-94.6],["ms","Mississippi","MS",32.7,-89.7],
  ["mo","Missouri","MO",38.5,-92.5],["mt","Montana","MT",46.9,-110.4],["ne","Nebraska","NE",41.5,-99.8],["nv","Nevada","NV",38.8,-116.4],
  ["nh","New Hampshire","NH",43.7,-71.6],["nj","New Jersey","NJ",40.1,-74.7],["nm","New Mexico","NM",34.5,-106],["ny","New York","NY",43,-75],
  ["nc","North Carolina","NC",35.5,-79.4],["nd","North Dakota","ND",47.5,-100.5],["oh","Ohio","OH",40.4,-82.8],["ok","Oklahoma","OK",35.6,-97.5],
  ["or","Oregon","OR",43.9,-120.6],["pa","Pennsylvania","PA",41.2,-77.2],["ri","Rhode Island","RI",41.7,-71.6],["sc","South Carolina","SC",33.8,-80.9],
  ["sd","South Dakota","SD",44.4,-100.2],["tn","Tennessee","TN",35.8,-86.4],["tx","Texas","TX",31,-99.9],["ut","Utah","UT",39.3,-111.7],
  ["vt","Vermont","VT",44,-72.7],["va","Virginia","VA",37.4,-78.7],["wa","Washington","WA",47.4,-120.7],["wv","West Virginia","WV",38.6,-80.6],
  ["wi","Wisconsin","WI",44.6,-89.6],["wy","Wyoming","WY",43,-107.6]
] as const;

async function ensureSeedUser({
  email,
  legacyEmails = [],
  username,
  legacyUsernames = [],
  displayName,
  password,
  role = "USER"
}: {
  email: string;
  legacyEmails?: string[];
  username: string;
  legacyUsernames?: string[];
  displayName: string;
  password: string;
  role?: string;
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username },
        ...legacyEmails.map((legacyEmail) => ({ email: legacyEmail })),
        ...legacyUsernames.map((legacyUsername) => ({ username: legacyUsername }))
      ]
    },
    orderBy: { createdAt: "asc" }
  });
  const data = {
    email,
    username,
    displayName,
    passwordHash: await bcrypt.hash(password, 12),
    role
  };
  if (existing) return prisma.user.update({ where: { id: existing.id }, data });
  return prisma.user.create({ data });
}

async function main() {
  for (const [id,name,abbr,latitude,longitude] of stateData) {
    await prisma.state.upsert({ where: { id }, update: { name, abbr, latitude, longitude }, create: { id, name, abbr, latitude, longitude } });
  }
  const demo = await ensureSeedUser({
    email: "demo@stateup.app",
    legacyEmails: ["demo@statepins.app"],
    username: "mia.travels",
    displayName: "Mia Rhodes",
    password: "StateUp123!"
  });
  const admin = await ensureSeedUser({
    email: "admin@stateup.app",
    legacyEmails: ["admin@statepins.app"],
    username: "stateup.admin",
    legacyUsernames: ["statepins.admin"],
    displayName: "StateUp Admin",
    password: "AdminStateUp123!",
    role: "ADMIN"
  });
  for (const stateId of ["pa","ny","nj","md","va","oh","wv","de","ma","ct","fl","ca","co","tx"]) {
    await prisma.visitedState.upsert({
      where: { userId_stateId: { userId: demo.id, stateId } },
      update: {},
      create: { userId: demo.id, stateId }
    });
  }
  const pins = [
    ["seed-hawk","Hawk Mountain Overlook","Kempton","A ridge-top trail with huge sky views and migrating raptors.","Nature","https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",40.641,-75.998],
    ["seed-old-city","Old City Philadelphia","Philadelphia","Cobblestone blocks, tiny galleries, and the best kind of unplanned afternoon.","Landmark","https://images.unsplash.com/photo-1569761316261-9a8696fa2ca3?auto=format&fit=crop&w=1200&q=80",39.95,-75.145],
    ["seed-fallingwater","Fallingwater","Mill Run","Frank Lloyd Wright's masterpiece feels even stranger and better in person.","Museum","https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",39.906,-79.468]
  ] as const;
  for (const [id,name,city,description,category,imageUrl,latitude,longitude] of pins) {
    await prisma.pin.upsert({ where: { id }, update: {}, create: { id, stateId: "pa", authorId: demo.id, name, city, description, category, imageUrl, latitude, longitude } });
  }
  await prisma.chatRoom.upsert({ where: { id: "pa-locals" }, update: {}, create: { id: "pa-locals", stateId: "pa", name: "Pennsylvania Locals" } });
  console.log(`Seeded 50 states, demo user ${demo.email}, admin ${admin.email}, and sample content.`);
}

main().finally(() => prisma.$disconnect());
