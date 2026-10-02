UPDATE "AuditLog"
SET "oldValue" = json_remove("oldValue", '$.passwordHash', '$.password', '$.productKey', '$.signatureData', '$.filePath', '$.storageKey')
WHERE "oldValue" IS NOT NULL AND json_valid("oldValue");

UPDATE "AuditLog"
SET "newValue" = json_remove("newValue", '$.passwordHash', '$.password', '$.productKey', '$.signatureData', '$.filePath', '$.storageKey')
WHERE "newValue" IS NOT NULL AND json_valid("newValue");
