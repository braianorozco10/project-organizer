"use client";

import { useActionState } from "react";

import { login, type ActionState } from "@/lib/actions";

const initialState: ActionState = {};

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="site" className="block text-sm font-medium">
          Jira site URL
        </label>
        <input
          id="site"
          name="site"
          type="text"
          required
          autoComplete="url"
          placeholder="your-team.atlassian.net"
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          Atlassian email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="you@company.com"
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="apiToken" className="block text-sm font-medium">
          API token
        </label>
        <input
          id="apiToken"
          name="apiToken"
          type="password"
          required
          autoComplete="current-password"
          placeholder="ATATT3xFfGF0..."
          className={`${fieldClass} font-mono`}
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:text-[#0e0f11]"
      >
        {pending ? "Verifying with Jira…" : "Sign in"}
      </button>
    </form>
  );
}
