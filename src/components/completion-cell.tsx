"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateCompletion } from "@/lib/actions";
import { ProgressBar } from "@/components/progress-bar";

const SAVE_DELAY_MS = 600;

export function CompletionCell({ taskId, value }: { taskId: string; value: number }) {
  const [draft, setDraft] = useState(value);
  const [serverValue, setServerValue] = useState(value);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt the server value again whenever it changes from under us — another tab,
  // or a re-render after a sync. Reconciled during render rather than in an effect.
  if (value !== serverValue) {
    setServerValue(value);
    setDraft(value);
  }

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function commit(next: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(next)));
    setDraft(clamped);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => void updateCompletion(taskId, clamped));
    }, SAVE_DELAY_MS);
  }

  return (
    <div className="flex items-center gap-2.5">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={draft}
        aria-label="Completion percentage"
        onChange={(event) => commit(Number(event.target.value))}
        className="h-1.5 w-24 cursor-pointer accent-[var(--accent)]"
      />
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          min={0}
          max={100}
          value={draft}
          aria-label="Completion percentage, exact"
          onChange={(event) => commit(Number(event.target.value))}
          className="w-11 rounded-md border border-border bg-background px-1.5 py-1 text-right text-sm tabular-nums outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">%</span>
      </div>
      <span
        aria-live="polite"
        className={`text-xs text-muted transition-opacity ${pending ? "opacity-100" : "opacity-0"}`}
      >
        saving…
      </span>
      <ProgressBar value={draft} className="sr-only" />
    </div>
  );
}
