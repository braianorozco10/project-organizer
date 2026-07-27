import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AddProject } from "@/components/add-project";
import { AppHeader } from "@/components/app-header";
import { ProjectCard } from "@/components/project-card";
import { listProjects } from "@/lib/data";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Projects · Project Organizer" };

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.cloudId) redirect("/select-site");

  const projects = await listProjects(session);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader session={session} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
            <p className="mt-1 text-sm text-muted">
              Group Jira tickets however you actually work, then track completion per ticket.
            </p>
          </div>
          <AddProject />
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
            <h2 className="text-lg font-medium">Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Create your first project — something like &ldquo;Stripe Fees&rdquo; or
              &ldquo;Schedules&rdquo; — then drop Jira links into it.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
