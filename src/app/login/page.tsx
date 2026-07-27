import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { missingConfig } from "@/lib/atlassian";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Project Organizer" };

const ERRORS: Record<string, string> = {
  not_configured:
    "This deployment has no Atlassian OAuth credentials yet. Set ATLASSIAN_CLIENT_ID and ATLASSIAN_CLIENT_SECRET.",
  denied: "You declined the Jira authorization. Nothing was connected.",
  state: "That sign-in link expired or was tampered with. Try again.",
  no_sites: "That Atlassian account cannot reach any Jira sites.",
  atlassian: "Atlassian could not complete the sign-in. Try again in a moment.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(session.cloudId ? "/projects" : "/select-site");

  const { error } = await searchParams;
  const missing = missingConfig();
  const configured = missing.length === 0;
  // A misconfigured deployment explains itself; not_configured would be noise on top.
  const message = error && !(error === "not_configured" && !configured)
    ? (ERRORS[error] ?? ERRORS.atlassian)
    : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Project Organizer</h1>
          <p className="mt-2 text-sm text-muted">
            Group Jira tickets into projects and track completion at a glance.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {message ? (
            <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {message}
            </p>
          ) : null}

          {configured ? null : (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-3 text-sm">
              <p className="font-medium text-danger">This deployment is not configured yet.</p>
              <p className="mt-1.5 text-muted">
                Add {missing.length === 1 ? "this variable" : "these variables"} in Vercel under
                Settings → Environment Variables, then redeploy:
              </p>
              <ul className="mt-2 space-y-1">
                {missing.map((name) => (
                  <li key={name} className="font-mono text-xs text-foreground">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href="/api/auth/login"
            aria-disabled={!configured}
            className={`flex w-full items-center justify-center gap-2.5 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:text-[#0e0f11] ${
              configured ? "" : "pointer-events-none opacity-50"
            }`}
          >
            Continue with Atlassian
          </a>

          <p className="mt-4 text-center text-xs text-muted">
            You will be asked to grant read access to your Jira issues. No password or API token is
            ever entered here.
          </p>
        </div>

        <details className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-foreground">
            What does this get access to?
          </summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <code className="font-mono text-xs">read:jira-work</code> — issue titles, statuses and
              update times.
            </li>
            <li>
              <code className="font-mono text-xs">read:jira-user</code> — your display name, to show
              who is signed in.
            </li>
            <li>
              <code className="font-mono text-xs">offline_access</code> — keeps you signed in without
              re-approving hourly.
            </li>
          </ul>
          <p className="mt-3">
            Read-only: nothing is ever written back to Jira. Revoke any time from your Atlassian
            account settings.
          </p>
        </details>
      </div>
    </main>
  );
}
