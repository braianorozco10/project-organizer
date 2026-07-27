import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AddTask } from "@/components/add-task";
import { AppHeader } from "@/components/app-header";
import { ProgressBar } from "@/components/progress-bar";
import { ProjectSettings } from "@/components/project-settings";
import { RefreshButton } from "@/components/refresh-button";
import { TaskTable } from "@/components/task-table";
import { getProject } from "@/lib/data";
import { averageCompletion } from "@/lib/format";
import { getSession } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await getSession();
  if (!session) return { title: "Project Organizer" };

  const { id } = await params;
  if (!UUID.test(id)) return { title: "Project Organizer" };

  const project = await getProject(session, id);
  return { title: project ? `${project.name} · Project Organizer` : "Project Organizer" };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  // Guard before the query so a malformed id is a 404, not a Postgres error.
  if (!UUID.test(id)) notFound();

  const project = await getProject(session, id);
  if (!project) notFound();

  const progress = averageCompletion(project.tasks);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader session={session} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Link
          href="/projects"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          ← All projects
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <ProjectSettings
            projectId={project.id}
            name={project.name}
            taskCount={project.tasks.length}
          />

          <div className="w-56">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {project.tasks.length} {project.tasks.length === 1 ? "ticket" : "tickets"}
              </span>
              <span className="font-medium tabular-nums text-foreground">{progress}% done</span>
            </div>
            <ProgressBar value={progress} className="mt-2" />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <AddTask projectId={project.id} />
          <RefreshButton projectId={project.id} />
        </div>

        <div className="mt-6">
          <TaskTable tasks={project.tasks} />
        </div>
      </main>
    </div>
  );
}
