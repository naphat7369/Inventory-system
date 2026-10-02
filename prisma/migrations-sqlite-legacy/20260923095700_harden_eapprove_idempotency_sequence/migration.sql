-- CreateTable
CREATE TABLE "MemoDocumentSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "buddhistYear" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoDocumentSequence_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "responseJson" TEXT,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "expiresAt" DATETIME
);

-- Continue from every document number already issued by the legacy system.
INSERT INTO "MemoDocumentSequence" (
    "id", "departmentId", "buddhistYear", "lastSequence", "createdAt", "updatedAt"
)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    "departmentId", "buddhistYear", MAX("sequence"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Memo"
WHERE "buddhistYear" IS NOT NULL AND "sequence" IS NOT NULL
GROUP BY "departmentId", "buddhistYear";

-- CreateIndex
CREATE UNIQUE INDEX "MemoDocumentSequence_departmentId_buddhistYear_key" ON "MemoDocumentSequence"("departmentId", "buddhistYear");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_actorId_action_createdAt_idx" ON "IdempotencyRecord"("actorId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_status_expiresAt_idx" ON "IdempotencyRecord"("status", "expiresAt");
