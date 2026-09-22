-- CreateTable
CREATE TABLE "SignatureTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SignatureTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignatureTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "SignatureTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SignatureTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SignatureTemplate_userId_idx" ON "SignatureTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureTemplate_userId_name_key" ON "SignatureTemplate"("userId", "name");

-- CreateIndex
CREATE INDEX "SignatureTemplateItem_templateId_idx" ON "SignatureTemplateItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureTemplateItem_templateId_sortOrder_key" ON "SignatureTemplateItem"("templateId", "sortOrder");
