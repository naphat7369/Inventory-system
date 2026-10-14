-- Per-approver Calendar Digest preferences and active recurring series.
ALTER TABLE "User"
  ADD COLUMN "approvalCalendarTime" TEXT;

CREATE TABLE "ApprovalCalendarDigest" (
  "id" TEXT NOT NULL,
  "approverId" TEXT NOT NULL,
  "activeKey" TEXT,
  "uid" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "notificationTime" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'REQUEST_QUEUED',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ApprovalCalendarDigest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalCalendarDigest_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ApprovalCalendarDigest_activeKey_key"
  ON "ApprovalCalendarDigest"("activeKey");
CREATE UNIQUE INDEX "ApprovalCalendarDigest_uid_key"
  ON "ApprovalCalendarDigest"("uid");
CREATE INDEX "ApprovalCalendarDigest_approverId_status_idx"
  ON "ApprovalCalendarDigest"("approverId", "status");
