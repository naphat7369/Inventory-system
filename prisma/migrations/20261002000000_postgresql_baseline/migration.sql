-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "department" TEXT,
    "owner" TEXT,
    "os" TEXT,
    "location" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Available',
    "userId" TEXT,
    "categoryId" TEXT NOT NULL,
    "propertyId" TEXT,
    "parentId" TEXT,
    "customData" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isBorrowable" BOOLEAN NOT NULL DEFAULT true,
    "isQuantityBased" BOOLEAN NOT NULL DEFAULT false,
    "totalQuantity" INTEGER NOT NULL DEFAULT 1,
    "availableQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "technician" TEXT,
    "sentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionDate" TIMESTAMP(3),
    "costCents" INTEGER,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorrowLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT,
    "borrowerName" TEXT NOT NULL,
    "borrowerDept" TEXT,
    "borrowerContact" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "borrowDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3) NOT NULL,
    "originalReturnDate" TIMESTAMP(3) NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'BORROWED',
    "purpose" TEXT,
    "borrowNotes" TEXT,
    "returnNotes" TEXT,
    "returnCondition" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "voidReason" TEXT,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorrowLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
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
    "isAllBranches" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountEmail" TEXT,
    "productKey" TEXT,
    "totalSlots" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "propertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseAssignment" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "userId" TEXT,
    "assignedTo" TEXT NOT NULL,
    "assignedEmail" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "assetId" TEXT,
    "deviceName" TEXT,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generalManagerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL DEFAULT 'SYSTEM',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalContract" (
    "id" TEXT NOT NULL,
    "contractNo" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Service',
    "vendor" TEXT,
    "costCents" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3) NOT NULL,
    "alertAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewalContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalAttachment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "attachmentCategory" TEXT NOT NULL DEFAULT 'General',
    "renewalHistoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalHistory" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "previousStartDate" TIMESTAMP(3),
    "previousEndDate" TIMESTAMP(3) NOT NULL,
    "newStartDate" TIMESTAMP(3),
    "newEndDate" TIMESTAMP(3) NOT NULL,
    "costCents" INTEGER,
    "renewedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogoAsset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoAssetId" TEXT,
    "logoUrl" TEXT,
    "branchId" TEXT,
    "hodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchDepartment" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "hodId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoDocumentSequence" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "buddhistYear" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoDocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "responseJson" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "sequence" INTEGER,
    "buddhistYear" INTEGER,
    "documentNo" TEXT,
    "documentDate" TIMESTAMP(3) NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Memo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sendPdfToIt" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoTypeRequiredApprover" (
    "id" TEXT NOT NULL,
    "memoTypeId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoTypeRequiredApprover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ApprovalTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoVersion" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "approvalChainSnapshot" TEXT NOT NULL,
    "attachmentSnapshot" TEXT,
    "contentHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoApprovalRound" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "memoVersionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoApprovalRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoApprovalStep" (
    "id" TEXT NOT NULL,
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
    "actedAt" TIMESTAMP(3),
    "memoVersionId" TEXT NOT NULL,
    "integrityHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDelegation" (
    "id" TEXT NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "memoTypeId" TEXT,
    "memoId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoPdfArtifact" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "memoVersionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'OFFICIAL',
    "storageKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoPdfArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "memoId" TEXT,
    "payload" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoId" TEXT,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "memoId" TEXT,
    "recipient" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoSignature" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "position" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MemoSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoAttachment" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "SignatureTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalSignature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetId_key" ON "Asset"("assetId");

-- CreateIndex
CREATE INDEX "RepairLog_assetId_status_idx" ON "RepairLog"("assetId", "status");

-- CreateIndex
CREATE INDEX "RepairLog_status_idx" ON "RepairLog"("status");

-- CreateIndex
CREATE INDEX "BorrowLog_assetId_status_idx" ON "BorrowLog"("assetId", "status");

-- CreateIndex
CREATE INDEX "BorrowLog_status_idx" ON "BorrowLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_branchId_isActive_isApprover_idx" ON "User"("branchId", "isActive", "isApprover");

-- CreateIndex
CREATE INDEX "User_isAllBranches_isActive_isApprover_idx" ON "User"("isAllBranches", "isActive", "isApprover");

-- CreateIndex
CREATE INDEX "LicenseAssignment_licenseId_idx" ON "LicenseAssignment"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_userId_idx" ON "LicenseAssignment"("userId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_assetId_idx" ON "LicenseAssignment"("assetId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_isActive_idx" ON "LicenseAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Branch_generalManagerId_idx" ON "Branch"("generalManagerId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_module_createdAt_idx" ON "AuditLog"("module", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "RenewalContract_endDate_idx" ON "RenewalContract"("endDate");

-- CreateIndex
CREATE INDEX "RenewalAttachment_contractId_idx" ON "RenewalAttachment"("contractId");

-- CreateIndex
CREATE INDEX "RenewalAttachment_renewalHistoryId_idx" ON "RenewalAttachment"("renewalHistoryId");

-- CreateIndex
CREATE INDEX "RenewalHistory_contractId_idx" ON "RenewalHistory"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "LogoAsset_fileName_key" ON "LogoAsset"("fileName");

-- CreateIndex
CREATE UNIQUE INDEX "LogoAsset_url_key" ON "LogoAsset"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "Department_logoAssetId_idx" ON "Department"("logoAssetId");

-- CreateIndex
CREATE INDEX "Department_branchId_idx" ON "Department"("branchId");

-- CreateIndex
CREATE INDEX "Department_hodId_idx" ON "Department"("hodId");

-- CreateIndex
CREATE INDEX "BranchDepartment_departmentId_isActive_idx" ON "BranchDepartment"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "BranchDepartment_hodId_idx" ON "BranchDepartment"("hodId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchDepartment_branchId_departmentId_key" ON "BranchDepartment"("branchId", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoDocumentSequence_departmentId_buddhistYear_key" ON "MemoDocumentSequence"("departmentId", "buddhistYear");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_actorId_action_createdAt_idx" ON "IdempotencyRecord"("actorId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_status_expiresAt_idx" ON "IdempotencyRecord"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Memo_documentNo_key" ON "Memo"("documentNo");

-- CreateIndex
CREATE INDEX "Memo_departmentId_idx" ON "Memo"("departmentId");

-- CreateIndex
CREATE INDEX "Memo_status_idx" ON "Memo"("status");

-- CreateIndex
CREATE INDEX "Memo_documentDate_idx" ON "Memo"("documentDate");

-- CreateIndex
CREATE INDEX "Memo_documentNo_idx" ON "Memo"("documentNo");

-- CreateIndex
CREATE INDEX "Memo_logoAssetId_idx" ON "Memo"("logoAssetId");

-- CreateIndex
CREATE INDEX "Memo_deletedAt_idx" ON "Memo"("deletedAt");

-- CreateIndex
CREATE INDEX "Memo_deletedById_idx" ON "Memo"("deletedById");

-- CreateIndex
CREATE INDEX "Memo_approvalStatus_idx" ON "Memo"("approvalStatus");

-- CreateIndex
CREATE INDEX "Memo_pdfStatus_idx" ON "Memo"("pdfStatus");

-- CreateIndex
CREATE INDEX "Memo_branchId_idx" ON "Memo"("branchId");

-- CreateIndex
CREATE INDEX "Memo_memoTypeId_idx" ON "Memo"("memoTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Memo_departmentId_buddhistYear_sequence_key" ON "Memo"("departmentId", "buddhistYear", "sequence");

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

-- CreateIndex
CREATE INDEX "MemoSignature_memoId_idx" ON "MemoSignature"("memoId");

-- CreateIndex
CREATE INDEX "MemoAttachment_memoId_createdAt_idx" ON "MemoAttachment"("memoId", "createdAt");

-- CreateIndex
CREATE INDEX "SignatureTemplate_userId_idx" ON "SignatureTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureTemplate_userId_name_key" ON "SignatureTemplate"("userId", "name");

-- CreateIndex
CREATE INDEX "SignatureTemplateItem_templateId_idx" ON "SignatureTemplateItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureTemplateItem_templateId_sortOrder_key" ON "SignatureTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "ApprovalSignature_userId_isDefault_idx" ON "ApprovalSignature"("userId", "isDefault");

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowLog" ADD CONSTRAINT "BorrowLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BorrowLog" ADD CONSTRAINT "BorrowLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseAssignment" ADD CONSTRAINT "LicenseAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_generalManagerId_fkey" FOREIGN KEY ("generalManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalAttachment" ADD CONSTRAINT "RenewalAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "RenewalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalAttachment" ADD CONSTRAINT "RenewalAttachment_renewalHistoryId_fkey" FOREIGN KEY ("renewalHistoryId") REFERENCES "RenewalHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalHistory" ADD CONSTRAINT "RenewalHistory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "RenewalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchDepartment" ADD CONSTRAINT "BranchDepartment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchDepartment" ADD CONSTRAINT "BranchDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchDepartment" ADD CONSTRAINT "BranchDepartment_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoDocumentSequence" ADD CONSTRAINT "MemoDocumentSequence_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "LogoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_memoTypeId_fkey" FOREIGN KEY ("memoTypeId") REFERENCES "MemoType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoType" ADD CONSTRAINT "MemoType_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoTypeRequiredApprover" ADD CONSTRAINT "MemoTypeRequiredApprover_memoTypeId_fkey" FOREIGN KEY ("memoTypeId") REFERENCES "MemoType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoTypeRequiredApprover" ADD CONSTRAINT "MemoTypeRequiredApprover_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTemplate" ADD CONSTRAINT "ApprovalTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTemplateItem" ADD CONSTRAINT "ApprovalTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ApprovalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalTemplateVersion" ADD CONSTRAINT "ApprovalTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ApprovalTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoVersion" ADD CONSTRAINT "MemoVersion_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoApprovalRound" ADD CONSTRAINT "MemoApprovalRound_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoApprovalRound" ADD CONSTRAINT "MemoApprovalRound_memoVersionId_fkey" FOREIGN KEY ("memoVersionId") REFERENCES "MemoVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoApprovalStep" ADD CONSTRAINT "MemoApprovalStep_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "MemoApprovalRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoApprovalStep" ADD CONSTRAINT "MemoApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDelegation" ADD CONSTRAINT "ApprovalDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoPdfArtifact" ADD CONSTRAINT "MemoPdfArtifact_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoPdfArtifact" ADD CONSTRAINT "MemoPdfArtifact_memoVersionId_fkey" FOREIGN KEY ("memoVersionId") REFERENCES "MemoVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoSignature" ADD CONSTRAINT "MemoSignature_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoAttachment" ADD CONSTRAINT "MemoAttachment_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureTemplate" ADD CONSTRAINT "SignatureTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureTemplateItem" ADD CONSTRAINT "SignatureTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SignatureTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalSignature" ADD CONSTRAINT "ApprovalSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
