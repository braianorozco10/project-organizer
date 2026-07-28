import { TaskRows, type TaskRow } from "@/components/task-rows";
import type { Task } from "@/lib/db/schema";
import { formatDate, timeAgo } from "@/lib/format";

/**
 * Dates are formatted here, on the server, and handed down as strings. The rows
 * themselves are interactive (drag to reorder), but relative times computed on
 * both sides of hydration would disagree by a second and warn.
 */
export function TaskTable({
  projectId,
  projectName,
  progress,
  tasks,
}: {
  projectId: string;
  projectName: string;
  progress: number;
  tasks: Task[];
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
        <h3 className="text-base font-medium">No tickets tracked yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Paste a Jira link above. The ticket code, title and last-updated date are pulled from Jira
          automatically — you only fill in completion.
        </p>
      </div>
    );
  }

  const rows: TaskRow[] = tasks.map((task) => ({
    id: task.id,
    issueKey: task.issueKey,
    url: task.url,
    title: task.title,
    status: task.status,
    statusCategory: task.statusCategory,
    assignee: task.assignee,
    completion: task.completion,
    depth: task.depth,
    updatedLabel: timeAgo(task.jiraUpdatedAt),
    updatedTitle: formatDate(task.jiraUpdatedAt),
  }));

  return (
    <TaskRows
      projectId={projectId}
      projectName={projectName}
      progress={progress}
      exportedOn={formatDate(new Date())}
      rows={rows}
    />
  );
}
