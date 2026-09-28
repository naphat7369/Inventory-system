const sensitiveKey = /^(password|passwordhash|productkey|secret|token|accesstoken|refreshtoken|apikey|signaturedata|filepath|storagekey)$/i;

export function redactAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    sensitiveKey.test(key) ? '[REDACTED]' : redactAuditValue(item),
  ]));
}

export function serializeAuditValue(value: unknown) {
  return value == null ? null : JSON.stringify(redactAuditValue(value));
}

export function displayAuditValue(value: string | null) {
  if (!value) return null;
  try { return JSON.stringify(redactAuditValue(JSON.parse(value)), null, 2); }
  catch { return value.length > 4_000 ? `${value.slice(0, 4_000)}…` : value; }
}
