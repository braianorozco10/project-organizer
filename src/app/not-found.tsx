import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="max-w-sm text-sm text-muted">
        That project does not exist, or it belongs to a different Jira account.
      </p>
      <Link
        href="/projects"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-[#0e0f11]"
      >
        Back to projects
      </Link>
    </main>
  );
}
