"use client";

import { useTransition } from "react";

import { deleteTask } from "@/lib/actions";

export function DeleteTaskButton({ taskId, issueKey }: { taskId: string; issueKey: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove ${issueKey} from this project`}
      title={`Remove ${issueKey}`}
      onClick={() => {
        if (!confirm(`Remove ${issueKey} from this project? The Jira ticket is not affected.`)) {
          return;
        }
        startTransition(() => void deleteTask(taskId));
      }}
      className="rounded-md px-2 py-1 text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
