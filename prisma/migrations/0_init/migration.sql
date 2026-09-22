-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomField_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "department" TEXT,
    "owner" TEXT,
    "os" TEXT,
    "location" TEXT,
    "purchaseDate" DATETIME,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepairLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "technician" TEXT,
    "sentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionDate" DATETIME,
    "costCents" INTEGER,
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepairLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BorrowLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "userId" TEXT,
    "borrowerName" TEXT NOT NULL,
    "borrowerDept" TEXT,
    "borrowerContact" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "borrowDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" DATETIME NOT NULL,
    "originalReturnDate" DATETIME NOT NULL,
    "actualReturnDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'BORROWED',
    "purpose" TEXT,
    "borrowNotes" TEXT,
    "returnNotes" TEXT,
    "returnCondition" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectReason" TEXT,
    "voidReason" TEXT,
    "voidedBy" TEXT,
    "voidedAt" DATETIME,
    "handledBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BorrowLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BorrowLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "accountEmail" TEXT,
    "productKey" TEXT,
    "totalSlots" INTEGER NOT NULL DEFAULT 1,
    "purchaseDate" DATETIME,
    "expirationDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "propertyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "License_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LicenseAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licenseId" TEXT NOT NULL,
    "userId" TEXT,
    "assignedTo" TEXT NOT NULL,
    "assignedEmail" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "assetId" TEXT,
    "deviceName" TEXT,
    "assignedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedDate" DATETIME,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LicenseAssignment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LicenseAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LicenseAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RenewalContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNo" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Service',
    "vendor" TEXT,
    "costCents" INTEGER,
    "startDate" DATETIME,
    "endDate" DATETIME NOT NULL,
    "alertAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RenewalAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "attachmentCategory" TEXT NOT NULL DEFAULT 'General',
    "renewalHistoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RenewalAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "RenewalContract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RenewalAttachment_renewalHistoryId_fkey" FOREIGN KEY ("renewalHistoryId") REFERENCES "RenewalHistory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RenewalHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "previousStartDate" DATETIME,
    "previousEndDate" DATETIME NOT NULL,
    "newStartDate" DATETIME,
    "newEndDate" DATETIME NOT NULL,
    "costCents" INTEGER,
    "renewedBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RenewalHistory_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "RenewalContract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Memo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "sequence" INTEGER,
    "buddhistYear" INTEGER,
    "documentNo" TEXT,
    "documentDate" DATETIME NOT NULL,
    "recipient" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "reference" TEXT,
    "carbonCopy" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    CONSTRAINT "Memo_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemoSignature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "position" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MemoSignature_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "LicenseAssignment_licenseId_idx" ON "LicenseAssignment"("licenseId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_userId_idx" ON "LicenseAssignment"("userId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_assetId_idx" ON "LicenseAssignment"("assetId");

-- CreateIndex
CREATE INDEX "LicenseAssignment_isActive_idx" ON "LicenseAssignment"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

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
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

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
CREATE UNIQUE INDEX "Memo_departmentId_buddhistYear_sequence_key" ON "Memo"("departmentId", "buddhistYear", "sequence");

-- CreateIndex
CREATE INDEX "MemoSignature_memoId_idx" ON "MemoSignature"("memoId");

