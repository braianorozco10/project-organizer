"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const noop = () => () => {};

/**
 * The "L / D" pill from the sketch. Renders a neutral placeholder until mounted
 * so the server and client markup agree.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // false while server-rendering and on the hydration pass, true afterwards.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-8 w-16 items-center rounded-full border border-border bg-surface text-[11px] font-semibold tracking-wide text-muted transition-colors hover:border-accent"
    >
      <span className="z-10 flex-1 text-center">L</span>
      <span className="z-10 flex-1 text-center">D</span>
      <span
        aria-hidden
        className="absolute top-1 h-6 w-7 rounded-full bg-accent-soft ring-1 ring-accent transition-transform duration-200"
        style={{ transform: `translateX(${isDark ? "2.05rem" : "0.2rem"})` }}
      />
    </button>
  );
}
