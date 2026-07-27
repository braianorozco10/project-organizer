"use client";

import { useActionState, useRef } from "react";

import { addTask, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function AddTask({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await addTask(projectId, previous, formData);
      // Clear the field on success so the next link can be pasted straight in.
      if (!result.error) formRef.current?.reset();
      return result;
    },
    initialState,
  );

  return (
    <div className="space-y-2">
      <form ref={formRef} action={formAction} className="flex flex-wrap gap-2">
        <input
          name="link"
          required
          placeholder="Paste a Jira link or ticket code — https://acme.atlassian.net/browse/DEV-246"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:text-[#0e0f11]"
        >
          {pending ? "Fetching from Jira…" : "Add task"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-accent">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
