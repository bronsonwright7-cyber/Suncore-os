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

/** Compact thousands-separated integer/decimal, e.g. 1284 -> "1,284". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

/** Whole-dollar currency, e.g. 42500 -> "$42,500". */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
