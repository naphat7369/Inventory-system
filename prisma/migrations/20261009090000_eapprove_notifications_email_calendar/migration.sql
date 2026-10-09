-- Approval notification preferences
ALTER TABLE "User"
  ADD COLUMN "approvalEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "approvalCalendarEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Calendar delivery state is stored on the immutable approval step so that
-- REQUEST/CANCEL messages use the same UID and recipient snapshot.
ALTER TABLE "MemoApprovalStep"
  ADD COLUMN "calendarStatus" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN "calendarUid" TEXT,
  ADD COLUMN "calendarRecipient" TEXT,
  ADD COLUMN "calendarStartAt" TIMESTAMP(3),
  ADD COLUMN "calendarEndAt" TIMESTAMP(3),
  ADD COLUMN "calendarSequence" INTEGER NOT NULL DEFAULT 0;

-- Reading a notification and resolving its underlying work are separate.
ALTER TABLE "Notification"
  ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE INDEX "Notification_userId_resolvedAt_readAt_createdAt_idx"
  ON "Notification"("userId", "resolvedAt", "readAt", "createdAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Durable retry/lease metadata and searchable delivery ownership.
ALTER TABLE "EmailDelivery"
  ADD COLUMN "recipientUserId" TEXT,
  ADD COLUMN "memoVersionId" TEXT,
  ADD COLUMN "stepId" TEXT,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "EmailDelivery_status_createdAt_idx";
CREATE INDEX "EmailDelivery_status_availableAt_createdAt_idx"
  ON "EmailDelivery"("status", "availableAt", "createdAt");
CREATE INDEX "EmailDelivery_memoId_template_status_idx"
  ON "EmailDelivery"("memoId", "template", "status");
CREATE INDEX "EmailDelivery_stepId_template_status_idx"
  ON "EmailDelivery"("stepId", "template", "status");
CREATE INDEX "EmailDelivery_recipientUserId_idx"
  ON "EmailDelivery"("recipientUserId");
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
