"use client";

import { useActionState, startTransition } from "react";

import { refreshProject, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function RefreshButton({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    () => refreshProject(projectId),
    initialState,
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => startTransition(action)}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
      >
        <span aria-hidden className={pending ? "animate-spin" : undefined}>
          ↻
        </span>
        {pending ? "Syncing…" : "Sync with Jira"}
      </button>

      {state.error ? (
        <span role="alert" className="text-sm text-danger">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span role="status" className="text-sm text-muted">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
