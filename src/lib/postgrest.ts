/**
 * Escapes a user-supplied value for safe interpolation into a PostgREST
 * `.or()` / `.ilike()` filter string. PostgREST parses that string itself
 * (commas separate conditions, parentheses group them, `%`/`_` are ilike
 * wildcards) -- unescaped user input can't bypass RLS, but it can produce
 * malformed filters or unintended wildcard matches. Backslash-escape the
 * characters that are syntactically meaningful to PostgREST's filter parser.
 */
export function escapeOrFilterValue(value: string): string {
  return value.replace(/[\\%,()]/g, (char) => `\\${char}`);
}
