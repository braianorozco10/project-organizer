"use client";

import { useActionState } from "react";

import { chooseSite, type ActionState } from "@/lib/actions";
import type { AtlassianSite } from "@/lib/db/schema";

const initialState: ActionState = {};

export function SitePicker({ sites }: { sites: AtlassianSite[] }) {
  const [state, formAction, pending] = useActionState(chooseSite, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {sites.map((site, index) => (
        <label
          key={site.cloudId}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent has-checked:border-accent has-checked:bg-accent-soft"
        >
          <input
            type="radio"
            name="cloudId"
            value={site.cloudId}
            defaultChecked={index === 0}
            className="accent-[var(--accent)]"
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">{site.name}</span>
            <span className="block truncate text-xs text-muted">
              {site.url.replace(/^https?:\/\//, "")}
            </span>
          </span>
        </label>
      ))}

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:text-[#0e0f11]"
      >
        {pending ? "Setting up…" : "Continue"}
      </button>
    </form>
  );
}
