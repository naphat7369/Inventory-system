ALTER TABLE "User"
ADD COLUMN "isReviewer" BOOLEAN NOT NULL DEFAULT false;

-- Preserve reviewer workflows configured before the dedicated permission existed.
UPDATE "User"
SET "isReviewer" = true
WHERE "id" IN (
  SELECT "approverId"
  FROM "MemoTypeRequiredApprover"
  WHERE "stepType" = 'REVIEWER'
  UNION
  SELECT "approverId"
  FROM "MemoApprovalStep"
  WHERE "stepType" = 'REVIEWER'
);

CREATE INDEX "User_branchId_isActive_isReviewer_idx"
ON "User"("branchId", "isActive", "isReviewer");
