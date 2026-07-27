import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/lib/actions";
import type { Session } from "@/lib/session";

export function AppHeader({ session }: { session: Session }) {
  const site = session.site.replace(/^https?:\/\//, "");

  return (
    <header className="border-b border-border bg-surface/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <Link href="/projects" className="text-lg font-semibold tracking-tight">
          Project Organizer
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{session.displayName}</div>
            <div className="text-xs text-muted">{site}</div>
          </div>

          <ThemeToggle />

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
