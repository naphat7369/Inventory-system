export function normalizeAssetIdSegment(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
  return normalized || fallback;
}

export function normalizeDepartmentCode(value: string | null | undefined) {
  const raw = (value ?? '').trim().toUpperCase();
  if (!raw) return 'GEN';

  const words = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  if (words.length > 1) {
    return words.map((word) => word[0]).join('').slice(0, 6) || 'GEN';
  }

  const compact = words[0] ?? '';
  if (!compact) return 'GEN';
  return compact.length > 5 ? compact.slice(0, 3) : compact;
}

export function buildAssetIdPrefix(input: {
  propertyPrefix?: string | null;
  propertyName?: string | null;
  categoryPrefix?: string | null;
  categoryName?: string | null;
  department?: string | null;
}) {
  const property = normalizeAssetIdSegment(input.propertyPrefix || input.propertyName, 'PROP');
  const category = normalizeAssetIdSegment(input.categoryPrefix || input.categoryName, 'ASSET');
  const department = normalizeDepartmentCode(input.department);
  return `${property}-${category}-${department}`;
}

export function nextAssetSequence(assetIds: string[], prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}-(\\d+)$`);
  let maximum = 0;

  for (const assetId of assetIds) {
    const match = pattern.exec(assetId);
    if (!match) continue;
    const sequence = Number(match[1]);
    if (Number.isSafeInteger(sequence) && sequence > maximum) maximum = sequence;
  }

  return maximum + 1;
}

export function formatAssetId(prefix: string, sequence: number) {
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}
