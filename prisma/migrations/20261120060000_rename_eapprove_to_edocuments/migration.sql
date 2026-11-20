-- Rename E-Approve runtime settings without losing their current values.
INSERT INTO "SystemSetting" ("key", "value", "updatedById", "createdAt", "updatedAt")
SELECT 'edocumentsEmailEnabled', "value", "updatedById", "createdAt", "updatedAt"
FROM "SystemSetting"
WHERE "key" = 'eapproveEmailEnabled'
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "updatedById" = EXCLUDED."updatedById",
    "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "SystemSetting" ("key", "value", "updatedById", "createdAt", "updatedAt")
SELECT 'edocumentsOfficialPdfAutoSendEnabled', "value", "updatedById", "createdAt", "updatedAt"
FROM "SystemSetting"
WHERE "key" = 'eapproveOfficialPdfAutoSendEnabled'
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value",
    "updatedById" = EXCLUDED."updatedById",
    "updatedAt" = EXCLUDED."updatedAt";

DELETE FROM "SystemSetting"
WHERE "key" IN ('eapproveEmailEnabled', 'eapproveOfficialPdfAutoSendEnabled');

UPDATE "AuditLog"
SET "module" = 'E_DOCUMENTS'
WHERE "module" = 'E_APPROVE';
