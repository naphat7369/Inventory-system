export function normalizeUsername(value: unknown) {
  return typeof value === 'string' ? value.trim().toLocaleUpperCase('en-US') : '';
}
