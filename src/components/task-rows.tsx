"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { CompletionCell } from "@/components/completion-cell";
import { DeleteTaskButton } from "@/components/delete-task-button";
import { reorderTasks } from "@/lib/actions";
import { MAX_DEPTH, normalizeDepths } from "@/lib/task-order";

export type TaskRow = {
  id: string;
  issueKey: string;
  url: string;
  title: string | null;
  status: string | null;
  statusCategory: string | null;
  assignee: string | null;
  completion: number;
  depth: number;
  updatedLabel: string;
  updatedTitle: string;
};

const SAVE_DELAY_MS = 400;
const INDENT_PX = 22;

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

function move<T>(rows: T[], from: number, to: number): T[] {
  const next = [...rows];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TaskRows({
  projectId,
  projectName,
  progress,
  exportedOn,
  rows,
}: {
  projectId: string;
  projectName: string;
  progress: number;
  exportedOn: string;
  rows: TaskRow[];
}) {
  const [items, setItems] = useState(rows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt the server's list whenever it genuinely changes — a task added,
  // removed, or reordered in another tab. Compared during render rather than
  // in an effect so a local drag in progress is never clobbered mid-gesture.
  const signature = rows.map((row) => `${row.id}:${row.depth}`).join("|");
  const [serverSignature, setServerSignature] = useState(signature);
  if (signature !== serverSignature) {
    setServerSignature(signature);
    setItems(rows);
  }

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function apply(next: TaskRow[]) {
    const normalized = normalizeDepths(next);
    setItems(normalized);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => {
        void reorderTasks(
          projectId,
          normalized.map((row) => ({ id: row.id, depth: row.depth })),
        );
      });
    }, SAVE_DELAY_MS);
  }

  function shift(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    apply(move(items, index, target));
  }

  function indent(index: number, delta: number) {
    apply(
      items.map((row, i) => (i === index ? { ...row, depth: row.depth + delta } : row)),
    );
  }

  function onHandleKeyDown(event: React.KeyboardEvent, index: number) {
    const actions: Record<string, () => void> = {
      ArrowUp: () => shift(index, -1),
      ArrowDown: () => shift(index, 1),
      ArrowLeft: () => indent(index, -1),
      ArrowRight: () => indent(index, 1),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  return (
    <div
      id="export-area"
      className="overflow-x-auto rounded-2xl border border-border bg-surface"
    >
      <div className="flex-col gap-1 border-b border-border px-5 py-4" data-export-only>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-lg font-semibold tracking-tight">{projectName}</span>
          <span className="text-sm tabular-nums text-muted">
            {rows.length} {rows.length === 1 ? "ticket" : "tickets"} · {progress}% done
          </span>
        </div>
        <span className="text-xs text-muted">Exported {exportedOn}</span>
      </div>

      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <th scope="col" className="w-10 px-2 py-3" data-export-hide>
              <span className="sr-only">Reorder</span>
            </th>
            <th scope="col" className="w-12 px-4 py-3">
              Link
            </th>
            <th scope="col" className="w-32 px-4 py-3">
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
            <th scope="col" className="w-24 px-4 py-3" data-export-hide>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((task, index) => (
            <tr
              key={task.id}
              draggable
              onDragStart={(event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = "move";
                // Firefox refuses to start a drag without payload.
                event.dataTransfer.setData("text/plain", task.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragIndex === null || dragIndex === index) return;
                setItems((current) => normalizeDepths(move(current, dragIndex, index)));
                setDragIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragIndex(null);
                apply(items);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                apply(items);
              }}
              className={`border-b border-border/60 transition-colors last:border-0 hover:bg-surface-muted/60 ${
                dragIndex === index ? "opacity-40" : ""
              }`}
            >
              <td className="px-2 py-3" data-export-hide>
                <button
                  type="button"
                  aria-label={`Reorder ${task.issueKey}. Arrow up and down to move, left and right to indent.`}
                  title="Drag to reorder — or focus and use the arrow keys"
                  onKeyDown={(event) => onHandleKeyDown(event, index)}
                  className="cursor-grab rounded-md px-1.5 py-1 text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
                >
                  ⠿
                </button>
              </td>

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
                <span
                  className="flex items-center gap-1.5"
                  style={{ paddingLeft: task.depth * INDENT_PX }}
                >
                  {task.depth > 0 ? (
                    <span aria-hidden className="text-xs text-muted">
                      ↳
                    </span>
                  ) : null}
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {task.issueKey}
                  </a>
                </span>
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

              <td className="px-4 py-3 text-muted" title={task.updatedTitle}>
                {task.updatedLabel}
              </td>

              <td className="px-4 py-3">
                <CompletionCell taskId={task.id} value={task.completion} />
              </td>

              <td className="px-4 py-3" data-export-hide>
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    aria-label={`Outdent ${task.issueKey}`}
                    title="Outdent"
                    disabled={task.depth === 0}
                    onClick={() => indent(index, -1)}
                    className="rounded-md px-1.5 py-1 text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-30"
                  >
                    ⇤
                  </button>
                  <button
                    type="button"
                    aria-label={`Indent ${task.issueKey} as a sub-task`}
                    title="Indent as sub-task"
                    disabled={index === 0 || task.depth >= Math.min(items[index - 1].depth + 1, MAX_DEPTH)}
                    onClick={() => indent(index, 1)}
                    className="rounded-md px-1.5 py-1 text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-30"
                  >
                    ⇥
                  </button>
                  <DeleteTaskButton taskId={task.id} issueKey={task.issueKey} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
