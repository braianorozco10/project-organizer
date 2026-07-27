"use client";

import { useActionState, useState } from "react";

import { createProject, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

export function AddProject() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await createProject(previous, formData);
      // Collapse only once the server confirms the insert.
      if (!result.error) setOpen(false);
      return result;
    },
    initialState,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
      >
        <span aria-hidden className="text-base leading-none">
          +
        </span>
        Add Project
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        name="name"
        required
        maxLength={80}
        placeholder="Project name, e.g. Stripe Fees"
        className="w-64 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#0e0f11]"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-full px-3 py-2 text-sm text-muted hover:text-foreground"
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
