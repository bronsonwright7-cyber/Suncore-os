/**
 * Formats a DATE-only string (e.g. "2026-08-20", no time component) as a
 * local calendar date, without going through `new Date(str)` -- that parses
 * date-only strings as UTC midnight, which `.toLocaleDateString()` then
 * renders in the viewer's timezone and can silently shift the displayed day
 * by one (e.g. "2026-08-20" showing as "Aug 19" for US timezones).
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString();
}
