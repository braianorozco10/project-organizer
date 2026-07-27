import { CompletionCell } from "@/components/completion-cell";
import { DeleteTaskButton } from "@/components/delete-task-button";
import type { Task } from "@/lib/db/schema";
import { formatDate, timeAgo } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  done: "bg-accent-soft text-accent ring-1 ring-accent/30",
  indeterminate: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-400",
  new: "bg-surface-muted text-muted ring-1 ring-border",
};

function StatusPill({ status, category }: { status: string | null; category: string | null }) {
  if (!status) return <span className="text-muted">—</span>;
  const style = STATUS_STYLES[category ?? "new"] ?? STATUS_STYLES.new;

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

export function TaskTable({ tasks }: { tasks: Task[] }) {
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

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <th scope="col" className="w-14 px-4 py-3">
              Link
            </th>
            <th scope="col" className="w-28 px-4 py-3">
              Ticket
            </th>
            <th scope="col" className="px-4 py-3">
              Title
            </th>
            <th scope="col" className="w-36 px-4 py-3">
              Status
            </th>
            <th scope="col" className="w-32 px-4 py-3">
              Last update
            </th>
            <th scope="col" className="w-64 px-4 py-3">
              Completion
            </th>
            <th scope="col" className="w-12 px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-muted/60"
            >
              <td className="px-4 py-3">
                <a
                  href={task.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${task.issueKey} in Jira`}
                  title={task.url}
                  className="inline-block rounded-md px-2 py-1 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  ↗
                </a>
              </td>

              <td className="px-4 py-3">
                <a
                  href={task.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs font-medium text-accent underline-offset-2 hover:underline"
                >
                  {task.issueKey}
                </a>
              </td>

              <td className="max-w-md px-4 py-3">
                <span className="line-clamp-2" title={task.title ?? undefined}>
                  {task.title ?? <span className="text-muted">Not synced yet</span>}
                </span>
                {task.assignee ? (
                  <span className="mt-0.5 block text-xs text-muted">{task.assignee}</span>
                ) : null}
              </td>

              <td className="px-4 py-3">
                <StatusPill status={task.status} category={task.statusCategory} />
              </td>

              <td className="px-4 py-3 text-muted" title={formatDate(task.jiraUpdatedAt)}>
                {timeAgo(task.jiraUpdatedAt)}
              </td>

              <td className="px-4 py-3">
                <CompletionCell taskId={task.id} value={task.completion} />
              </td>

              <td className="px-4 py-3 text-right">
                <DeleteTaskButton taskId={task.id} issueKey={task.issueKey} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
