-- Calendar integration is held until the application has a public HTTPS origin.
-- Email digest replaces calendar digest without changing existing email opt-in.
ALTER TABLE "User"
  ADD COLUMN "approvalEmailMode" TEXT NOT NULL DEFAULT 'IMMEDIATE',
  ADD COLUMN "approvalEmailDigestTime" TEXT NOT NULL DEFAULT '16:00';

DROP TABLE "ApprovalCalendarDigest";

ALTER TABLE "User"
  DROP COLUMN "approvalCalendarEnabled",
  DROP COLUMN "approvalCalendarTime";

ALTER TABLE "MemoApprovalStep"
  DROP COLUMN "calendarStatus",
  DROP COLUMN "calendarUid",
  DROP COLUMN "calendarRecipient",
  DROP COLUMN "calendarStartAt",
  DROP COLUMN "calendarEndAt",
  DROP COLUMN "calendarSequence";
