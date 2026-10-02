UPDATE "AuditLog"
SET "newValue" = (
  SELECT json_group_array(
    json(json_remove(value, '$.approver.passwordHash', '$.approver.password', '$.approver.productKey', '$.approver.signatureData'))
  )
  FROM json_each("AuditLog"."newValue")
)
WHERE "action" = 'UPDATED_REQUIRED_APPROVERS'
  AND "newValue" IS NOT NULL
  AND json_valid("newValue")
  AND json_type("newValue") = 'array';
