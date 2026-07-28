export const MAX_DEPTH = 3;

/**
 * Clamps indent levels so a row is at most one level deeper than the row above
 * it, and the first row is always flush left. Without this you can produce an
 * indent that sits under nothing, which just reads as a rendering bug.
 *
 * Shared by the client (optimistic reorder) and the server action, so both
 * agree on the result and the UI never jumps after saving.
 */
export function normalizeDepths<T extends { depth: number }>(rows: T[]): T[] {
  let previous = 0;

  return rows.map((row, index) => {
    const ceiling = index === 0 ? 0 : Math.min(previous + 1, MAX_DEPTH);
    const depth = Math.max(0, Math.min(row.depth, ceiling));
    previous = depth;
    return depth === row.depth ? row : { ...row, depth };
  });
}
