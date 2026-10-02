-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generalManagerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Branch_generalManagerId_fkey" FOREIGN KEY ("generalManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sendPdfToIt" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoType_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoTypeRequiredApprover" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoTypeId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoTypeRequiredApprover_memoTypeId_fkey" FOREIGN KEY ("memoTypeId") REFERENCES "MemoType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemoTypeRequiredApprover_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "ApprovalTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ApprovalTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalTemplateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ApprovalTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "approvalChainSnapshot" TEXT NOT NULL,
    "attachmentSnapshot" TEXT,
    "contentHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoVersion_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoApprovalRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT NOT NULL,
    "memoVersionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoApprovalRound_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemoApprovalRound_memoVersionId_fkey" FOREIGN KEY ("memoVersionId") REFERENCES "MemoVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoApprovalStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "source" TEXT NOT NULL,
    "sourceMetadata" TEXT NOT NULL,
    "approverNameSnapshot" TEXT NOT NULL,
    "approverPositionSnapshot" TEXT,
    "actedById" TEXT,
    "actedByNameSnapshot" TEXT,
    "signatureSnapshot" TEXT,
    "delegationId" TEXT,
    "decisionReason" TEXT,
    "actedAt" DATETIME,
    "memoVersionId" TEXT NOT NULL,
    "integrityHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoApprovalStep_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MemoApprovalRound" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemoApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "delegatorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "memoTypeId" TEXT,
    "memoId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "ApprovalDelegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoPdfArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT NOT NULL,
    "memoVersionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OFFICIAL',
    "storageKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoPdfArtifact_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemoPdfArtifact_memoVersionId_fkey" FOREIGN KEY ("memoVersionId") REFERENCES "MemoVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "memoId" TEXT,
    "payload" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" DATETIME,
    "completedAt" DATETIME,
    "lastErrorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BackgroundJob_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "memoId" TEXT,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT,
    "recipient" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "lastErrorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailDelivery_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "branchId" TEXT,
    "hodId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Department_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Department_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Department" ("code", "createdAt", "id", "isActive", "logoAssetId", "logoUrl", "name", "nameEn", "updatedAt") SELECT "code", "createdAt", "id", "isActive", "logoAssetId", "logoUrl", "name", "nameEn", "updatedAt" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE INDEX "Department_logoAssetId_idx" ON "Department"("logoAssetId");
CREATE INDEX "Department_branchId_idx" ON "Department"("branchId");
CREATE INDEX "Department_hodId_idx" ON "Department"("hodId");
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
    "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "pdfStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "pdfErrorCode" TEXT,
    "branchId" TEXT,
    "memoTypeId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    CONSTRAINT "Memo_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Memo_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Memo_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Memo_memoTypeId_fkey" FOREIGN KEY ("memoTypeId") REFERENCES "MemoType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Memo_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Memo" ("buddhistYear", "cancelledAt", "carbonCopy", "content", "createdAt", "createdById", "deletedAt", "deletedById", "departmentId", "documentDate", "documentNo", "id", "logoAssetId", "logoUrl", "recipient", "reference", "remark", "sender", "sequence", "status", "subHeader", "subject", "updatedAt", "updatedById") SELECT "buddhistYear", "cancelledAt", "carbonCopy", "content", "createdAt", "createdById", "deletedAt", "deletedById", "departmentId", "documentDate", "documentNo", "id", "logoAssetId", "logoUrl", "recipient", "reference", "remark", "sender", "sequence", "status", "subHeader", "subject", "updatedAt", "updatedById" FROM "Memo";
DROP TABLE "Memo";
ALTER TABLE "new_Memo" RENAME TO "Memo";
-- Backward-compatible status mapping for memos created before E-Approve.
UPDATE "Memo"
SET "approvalStatus" = CASE
    WHEN "status" = 'FINAL' THEN 'APPROVED'
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'DRAFT'
END;
CREATE UNIQUE INDEX "Memo_documentNo_key" ON "Memo"("documentNo");
CREATE INDEX "Memo_departmentId_idx" ON "Memo"("departmentId");
CREATE INDEX "Memo_status_idx" ON "Memo"("status");
CREATE INDEX "Memo_documentDate_idx" ON "Memo"("documentDate");
CREATE INDEX "Memo_documentNo_idx" ON "Memo"("documentNo");
CREATE INDEX "Memo_logoAssetId_idx" ON "Memo"("logoAssetId");
CREATE INDEX "Memo_deletedAt_idx" ON "Memo"("deletedAt");
CREATE INDEX "Memo_deletedById_idx" ON "Memo"("deletedById");
CREATE INDEX "Memo_approvalStatus_idx" ON "Memo"("approvalStatus");
CREATE INDEX "Memo_pdfStatus_idx" ON "Memo"("pdfStatus");
CREATE INDEX "Memo_branchId_idx" ON "Memo"("branchId");
CREATE INDEX "Memo_memoTypeId_idx" ON "Memo"("memoTypeId");
CREATE UNIQUE INDEX "Memo_departmentId_buddhistYear_sequence_key" ON "Memo"("departmentId", "buddhistYear", "sequence");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "departmentId" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "email" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApprover" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "departmentId", "fullName", "id", "passwordHash", "phone", "role", "updatedAt", "username") SELECT "createdAt", "departmentId", "fullName", "id", "passwordHash", "phone", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_branchId_isActive_isApprover_idx" ON "User"("branchId", "isActive", "isApprover");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Branch_generalManagerId_idx" ON "Branch"("generalManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoType_code_key" ON "MemoType"("code");

-- CreateIndex
CREATE INDEX "MemoType_branchId_isActive_idx" ON "MemoType"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "MemoTypeRequiredApprover_approverId_idx" ON "MemoTypeRequiredApprover"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoTypeRequiredApprover_memoTypeId_approverId_key" ON "MemoTypeRequiredApprover"("memoTypeId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoTypeRequiredApprover_memoTypeId_sortOrder_key" ON "MemoTypeRequiredApprover"("memoTypeId", "sortOrder");

-- CreateIndex
CREATE INDEX "ApprovalTemplate_departmentId_branchId_isActive_idx" ON "ApprovalTemplate"("departmentId", "branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalTemplate_departmentId_branchId_name_key" ON "ApprovalTemplate"("departmentId", "branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalTemplateItem_templateId_approverId_key" ON "ApprovalTemplateItem"("templateId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalTemplateItem_templateId_sortOrder_key" ON "ApprovalTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalTemplateVersion_templateId_version_key" ON "ApprovalTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "MemoVersion_contentHash_idx" ON "MemoVersion"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "MemoVersion_memoId_version_key" ON "MemoVersion"("memoId", "version");

-- CreateIndex
CREATE INDEX "MemoApprovalRound_memoId_status_idx" ON "MemoApprovalRound"("memoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MemoApprovalRound_memoId_roundNumber_key" ON "MemoApprovalRound"("memoId", "roundNumber");

-- CreateIndex
CREATE INDEX "MemoApprovalStep_approverId_status_idx" ON "MemoApprovalStep"("approverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MemoApprovalStep_roundId_sortOrder_key" ON "MemoApprovalStep"("roundId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MemoApprovalStep_roundId_approverId_key" ON "MemoApprovalStep"("roundId", "approverId");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_delegatorId_startsAt_endsAt_isActive_idx" ON "ApprovalDelegation"("delegatorId", "startsAt", "endsAt", "isActive");

-- CreateIndex
CREATE INDEX "ApprovalDelegation_delegateId_isActive_idx" ON "ApprovalDelegation"("delegateId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MemoPdfArtifact_jobKey_key" ON "MemoPdfArtifact"("jobKey");

-- CreateIndex
CREATE UNIQUE INDEX "MemoPdfArtifact_memoId_memoVersionId_kind_key" ON "MemoPdfArtifact"("memoId", "memoVersionId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_idempotencyKey_key" ON "BackgroundJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_availableAt_idx" ON "BackgroundJob"("status", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_idempotencyKey_key" ON "Notification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");
