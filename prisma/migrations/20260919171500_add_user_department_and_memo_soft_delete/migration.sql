-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Memo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "sequence" INTEGER,
    "buddhistYear" INTEGER,
    "documentNo" TEXT,
    "documentDate" DATETIME NOT NULL,
    "recipient" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "subHeader" TEXT,
    "logoAssetId" TEXT,
    "logoUrl" TEXT,
    "reference" TEXT,
    "carbonCopy" TEXT,
    "content" TEXT NOT NULL,
    "remark" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Memo_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Memo_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Memo_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Memo" ("buddhistYear", "cancelledAt", "carbonCopy", "content", "createdAt", "createdById", "departmentId", "documentDate", "documentNo", "id", "logoAssetId", "logoUrl", "recipient", "reference", "remark", "sender", "sequence", "status", "subHeader", "subject", "updatedAt", "updatedById") SELECT "buddhistYear", "cancelledAt", "carbonCopy", "content", "createdAt", "createdById", "departmentId", "documentDate", "documentNo", "id", "logoAssetId", "logoUrl", "recipient", "reference", "remark", "sender", "sequence", "status", "subHeader", "subject", "updatedAt", "updatedById" FROM "Memo";
DROP TABLE "Memo";
ALTER TABLE "new_Memo" RENAME TO "Memo";
CREATE UNIQUE INDEX "Memo_documentNo_key" ON "Memo"("documentNo");
CREATE INDEX "Memo_departmentId_idx" ON "Memo"("departmentId");
CREATE INDEX "Memo_status_idx" ON "Memo"("status");
CREATE INDEX "Memo_documentDate_idx" ON "Memo"("documentDate");
CREATE INDEX "Memo_documentNo_idx" ON "Memo"("documentNo");
CREATE INDEX "Memo_logoAssetId_idx" ON "Memo"("logoAssetId");
CREATE INDEX "Memo_deletedAt_idx" ON "Memo"("deletedAt");
CREATE INDEX "Memo_deletedById_idx" ON "Memo"("deletedById");
CREATE UNIQUE INDEX "Memo_departmentId_buddhistYear_sequence_key" ON "Memo"("departmentId", "buddhistYear", "sequence");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "departmentId" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "fullName", "id", "passwordHash", "phone", "role", "updatedAt", "username") SELECT "createdAt", "fullName", "id", "passwordHash", "phone", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
