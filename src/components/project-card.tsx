import Link from "next/link";

import { ProgressBar } from "@/components/progress-bar";
import type { ProjectWithTasks } from "@/lib/data";
import { averageCompletion } from "@/lib/format";

const PREVIEW_LIMIT = 4;

export function ProjectCard({ project }: { project: ProjectWithTasks }) {
  const progress = averageCompletion(project.tasks);
  const preview = project.tasks.slice(0, PREVIEW_LIMIT);
  const overflow = project.tasks.length - preview.length;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex min-h-52 flex-col rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight group-hover:text-accent">
          {project.name}
        </h2>
        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">
          {project.tasks.length} {project.tasks.length === 1 ? "ticket" : "tickets"}
        </span>
      </div>

      <ul className="mt-4 flex-1 space-y-2.5">
        {preview.map((task) => (
          <li key={task.id} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 font-mono text-xs text-muted">{task.issueKey}</span>
            <ProgressBar value={task.completion} className="flex-1" />
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">
              {task.completion}%
            </span>
          </li>
        ))}

        {preview.length === 0 ? (
          <li className="text-sm text-muted">No tickets yet — open to add the first link.</li>
        ) : null}

        {overflow > 0 ? (
          <li className="text-xs text-muted">+{overflow} more</li>
        ) : null}
      </ul>

      <div className="mt-5 border-t border-border pt-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Overall</span>
          <span className="font-medium tabular-nums text-foreground">{progress}%</span>
        </div>
        <ProgressBar value={progress} className="mt-2" />
      </div>
    </Link>
  );
}
