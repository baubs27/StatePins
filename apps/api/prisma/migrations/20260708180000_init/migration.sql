CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "displayName" TEXT NOT NULL, "avatarUrl" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "State" (
  "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "abbr" TEXT NOT NULL,
  "latitude" REAL NOT NULL, "longitude" REAL NOT NULL
);
CREATE UNIQUE INDEX "State_abbr_key" ON "State"("abbr");

CREATE TABLE "Pin" (
  "id" TEXT NOT NULL PRIMARY KEY, "stateId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "name" TEXT NOT NULL, "city" TEXT NOT NULL, "description" TEXT NOT NULL,
  "category" TEXT NOT NULL, "imageUrl" TEXT NOT NULL, "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Pin_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Pin_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Pin_stateId_status_idx" ON "Pin"("stateId", "status");
CREATE INDEX "Pin_authorId_idx" ON "Pin"("authorId");

CREATE TABLE "Comment" (
  "id" TEXT NOT NULL PRIMARY KEY, "pinId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "text" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Comment_pinId_status_idx" ON "Comment"("pinId", "status");

CREATE TABLE "Vote" (
  "userId" TEXT NOT NULL, "pinId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "pinId"),
  CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Vote_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ItineraryItem" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "pinId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0, "visited" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ItineraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ItineraryItem_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ItineraryItem_userId_pinId_key" ON "ItineraryItem"("userId", "pinId");
CREATE INDEX "ItineraryItem_userId_position_idx" ON "ItineraryItem"("userId", "position");

CREATE TABLE "VisitedState" (
  "userId" TEXT NOT NULL, "stateId" TEXT NOT NULL, "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "stateId"),
  CONSTRAINT "VisitedState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VisitedState_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Report" (
  "id" TEXT NOT NULL PRIMARY KEY, "reporterId" TEXT NOT NULL, "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL, "reason" TEXT NOT NULL, "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN', "reviewedBy" TEXT, "reviewedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

CREATE TABLE "Block" (
  "blockerId" TEXT NOT NULL, "blockedId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("blockerId", "blockedId"),
  CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ChatRoom" (
  "id" TEXT NOT NULL PRIMARY KEY, "stateId" TEXT, "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY, "roomId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "text" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");
