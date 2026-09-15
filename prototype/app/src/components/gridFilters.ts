export function matchDateFilter(headerValue: string, rowValue: unknown): boolean {
  const tokens = headerValue
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return true;
  const rowDate = String(rowValue ?? '').trim().split(/[T\s]/)[0];
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(rowDate)) return false;
  return tokens.some((token) => rowDate.startsWith(token) || token === rowDate);
}