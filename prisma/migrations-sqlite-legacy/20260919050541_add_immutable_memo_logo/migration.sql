-- CreateTable
CREATE TABLE "LogoAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoAssetId" TEXT,
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Department_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Department" ("code", "createdAt", "id", "isActive", "name", "updatedAt") SELECT "code", "createdAt", "id", "isActive", "name", "updatedAt" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE INDEX "Department_logoAssetId_idx" ON "Department"("logoAssetId");
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
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    CONSTRAINT "Memo_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Memo_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Memo" ("buddhistYear", "cancelledAt", "carbonCopy", "content", "createdAt", "createdById", "departmentId", "documentDate", "documentNo", "id", "recipient", "reference", "sender", "sequence", "status", "subject", "updatedAt", "updatedById") SELECT "buddhistYear", "cancelledAt", "carbonCopy", "content", "createdAt", "createdById", "departmentId", "documentDate", "documentNo", "id", "recipient", "reference", "sender", "sequence", "status", "subject", "updatedAt", "updatedById" FROM "Memo";
DROP TABLE "Memo";
ALTER TABLE "new_Memo" RENAME TO "Memo";
CREATE UNIQUE INDEX "Memo_documentNo_key" ON "Memo"("documentNo");
CREATE INDEX "Memo_departmentId_idx" ON "Memo"("departmentId");
CREATE INDEX "Memo_status_idx" ON "Memo"("status");
CREATE INDEX "Memo_documentDate_idx" ON "Memo"("documentDate");
CREATE INDEX "Memo_documentNo_idx" ON "Memo"("documentNo");
CREATE INDEX "Memo_logoAssetId_idx" ON "Memo"("logoAssetId");
CREATE UNIQUE INDEX "Memo_departmentId_buddhistYear_sequence_key" ON "Memo"("departmentId", "buddhistYear", "sequence");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LogoAsset_fileName_key" ON "LogoAsset"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "LogoAsset_url_key" ON "LogoAsset"("url");
