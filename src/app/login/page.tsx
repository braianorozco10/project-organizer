import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · Project Organizer" };

export default async function LoginPage() {
  if (await getSession()) redirect("/projects");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Project Organizer</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in with your Jira credentials to pull ticket details automatically.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm />
        </div>

        <details className="mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          <summary className="cursor-pointer font-medium text-foreground">
            Where do I get an API token?
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li>
              Open{" "}
              <a
                className="text-accent underline underline-offset-2"
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noreferrer"
              >
                id.atlassian.com → Security → API tokens
              </a>
              .
            </li>
            <li>Choose &ldquo;Create API token&rdquo; and give it a label.</li>
            <li>Copy the token and paste it above.</li>
          </ol>
          <p className="mt-3">
            Your token is encrypted into a session cookie on this device. It is never written to the
            database.
          </p>
        </details>
      </div>
    </main>
  );
}
