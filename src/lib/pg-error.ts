/**
 * Drizzle wraps driver errors in a generic "Failed query" Error and hangs the
 * real one off `cause`, so the SQLSTATE is never on the error you catch. Neon's
 * HTTP driver puts it at the top level. Walk the chain to cover both.
 */
export function pgErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const candidate = current as { code?: string; cause?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

/** The constraint a unique violation tripped, when the driver reports one. */
export function pgConstraint(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const candidate = current as { constraint?: string; cause?: unknown };
    if (typeof candidate.constraint === "string") return candidate.constraint;
    current = candidate.cause;
  }
  return undefined;
}
