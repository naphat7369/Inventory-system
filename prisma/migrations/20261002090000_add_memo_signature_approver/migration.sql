ALTER TABLE "MemoSignature"
ADD COLUMN "approverId" TEXT;

CREATE INDEX "MemoSignature_approverId_idx"
ON "MemoSignature"("approverId");

ALTER TABLE "MemoSignature"
ADD CONSTRAINT "MemoSignature_approverId_fkey"
FOREIGN KEY ("approverId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
