ALTER TABLE "MemoTypeRequiredApprover"
ADD COLUMN "stepType" TEXT NOT NULL DEFAULT 'APPROVER';

ALTER TABLE "MemoApprovalStep"
ADD COLUMN "stepType" TEXT NOT NULL DEFAULT 'APPROVER';

CREATE TABLE "MemoTypeFilterPermission" (
    "id" TEXT NOT NULL,
    "memoTypeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoTypeFilterPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemoTypeFilterPermission_memoTypeId_userId_key"
ON "MemoTypeFilterPermission"("memoTypeId", "userId");

CREATE INDEX "MemoTypeFilterPermission_userId_idx"
ON "MemoTypeFilterPermission"("userId");

ALTER TABLE "MemoTypeFilterPermission"
ADD CONSTRAINT "MemoTypeFilterPermission_memoTypeId_fkey"
FOREIGN KEY ("memoTypeId") REFERENCES "MemoType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MemoTypeFilterPermission"
ADD CONSTRAINT "MemoTypeFilterPermission_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
