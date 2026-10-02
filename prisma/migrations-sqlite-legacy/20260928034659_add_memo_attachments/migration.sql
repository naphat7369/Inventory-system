-- CreateTable
CREATE TABLE "MemoAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memoId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoAttachment_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "Memo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MemoAttachment_memoId_createdAt_idx" ON "MemoAttachment"("memoId", "createdAt");
