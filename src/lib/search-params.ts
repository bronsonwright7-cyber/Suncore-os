export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type RawSearchParams = Record<string, string | string[] | undefined>;

export function getParam(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getPage(searchParams: RawSearchParams): number {
  const n = Number(getParam(searchParams, "page"));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export function getPageSize(searchParams: RawSearchParams): number {
  const n = Number(getParam(searchParams, "pageSize"));
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** Inclusive [from, to] row range for Supabase's `.range()`. */
export function getRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export type SortDirection = "asc" | "desc";

export function getSort(
  searchParams: RawSearchParams,
  allowedColumns: readonly string[],
  fallback: { column: string; direction: SortDirection },
): { column: string; direction: SortDirection } {
  const column = getParam(searchParams, "sort");
  const direction = getParam(searchParams, "dir");
  if (column && allowedColumns.includes(column)) {
    return { column, direction: direction === "asc" ? "asc" : "desc" };
  }
  return fallback;
}

/**
 * Rebuilds the current query string with the given keys overridden, and
 * `page` removed unless explicitly included in `overrides` -- any filter/
 * sort change should reset pagination back to page 1.
 */
export function buildSearchParams(
  current: RawSearchParams,
  overrides: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    if (key in overrides) continue;
    if (key === "page" && !("page" in overrides)) continue;
    params.set(key, Array.isArray(value) ? (value[0] ?? "") : value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}
