import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SitePicker } from "@/components/site-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Choose a site · Project Organizer" };

export default async function SelectSitePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.cloudId) redirect("/projects");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a Jira site</h1>
          <p className="mt-2 text-sm text-muted">
            Your Atlassian account can reach more than one. Projects are tracked per site.
          </p>
        </header>

        <SitePicker sites={session.sites} />
      </div>
    </main>
  );
}
