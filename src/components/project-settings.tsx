"use client";

import { useActionState, useState, useTransition } from "react";

import { deleteProject, renameProject, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function ProjectSettings({
  projectId,
  name,
  taskCount,
}: {
  projectId: string;
  name: string;
  taskCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await renameProject(projectId, previous, formData);
      if (!result.error) setEditing(false);
      return result;
    },
    initialState,
  );
  const [deleting, startDelete] = useTransition();

  if (editing) {
    return (
      <form
        action={formAction}
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          name="name"
          defaultValue={name}
          required
          maxLength={80}
          autoFocus
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xl font-semibold outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#0e0f11]"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
        {state.error ? (
          <p role="alert" className="w-full text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-accent"
      >
        Rename
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={() => {
          const warning =
            taskCount > 0
              ? `Delete "${name}" and its ${taskCount} tracked ticket${taskCount === 1 ? "" : "s"}? Jira is not affected.`
              : `Delete "${name}"?`;
          if (!confirm(warning)) return;
          startDelete(() => void deleteProject(projectId));
        }}
        className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-danger disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
