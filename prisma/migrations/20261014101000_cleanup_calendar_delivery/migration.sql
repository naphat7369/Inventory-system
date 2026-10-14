-- Prevent legacy calendar-only deliveries from being picked up by the email-only worker.
UPDATE "EmailDelivery"
SET
  "status" = 'CANCELLED',
  "completedAt" = CURRENT_TIMESTAMP,
  "lockedAt" = NULL,
  "lastErrorCode" = 'CALENDAR_FEATURE_REMOVED'
WHERE "template" IN (
  'APPROVAL_CALENDAR_REQUEST',
  'APPROVAL_CALENDAR_CANCEL',
  'APPROVAL_DIGEST_REQUEST',
  'APPROVAL_DIGEST_CANCEL'
)
AND "status" IN ('PENDING', 'RETRY_WAIT', 'PAUSED', 'SENDING');

DELETE FROM "SystemSetting"
WHERE "key" IN ('eapproveCalendarEnabled', 'eapproveCalendarDefaultTime');
