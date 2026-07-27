"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const signedOut = error.message.includes("UNAUTHENTICATED");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {signedOut ? "Your session expired" : "Something went wrong"}
      </h1>
      <p className="max-w-md text-sm text-muted">
        {signedOut
          ? "Sign in with your Jira credentials again to keep going."
          : "The page could not be loaded. If this keeps happening, check that DATABASE_URL and SESSION_SECRET are set."}
      </p>

      <div className="flex gap-3">
        {signedOut ? (
          <Link
            href="/login"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0e0f11]"
          >
            Sign in
          </Link>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0e0f11]"
          >
            Try again
          </button>
        )}
        <Link
          href="/projects"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        >
          Projects
        </Link>
      </div>
    </main>
  );
}
