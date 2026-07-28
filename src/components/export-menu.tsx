"use client";

import { useEffect, useRef, useState } from "react";

/** Matches the surface colours in globals.css so the PNG is not transparent. */
const BACKDROP = { light: "#ffffff", dark: "#17191c" };

export function ExportMenu({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "image">(null);
  const [error, setError] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function exportImage() {
    const target = document.getElementById("export-area");
    if (!target) {
      setError("Nothing to export yet.");
      return;
    }

    setBusy("image");
    setError(null);
    setOpen(false);

    // Loaded on demand: it is only needed the moment someone exports.
    const { toPng } = await import("html-to-image");
    const dark = document.documentElement.classList.contains("dark");

    // The class swaps controls out for static equivalents for the capture only.
    target.classList.add("exporting");
    try {
      const dataUrl = await toPng(target, {
        pixelRatio: 2,
        backgroundColor: dark ? BACKDROP.dark : BACKDROP.light,
        // Scrollable containers clip; capture the full rendered width.
        width: target.scrollWidth,
        height: target.scrollHeight,
        style: { overflow: "visible" },
      });

      const link = document.createElement("a");
      link.download = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date()
        .toISOString()
        .slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Could not render the image. Try the Excel export instead.");
    } finally {
      target.classList.remove("exporting");
      setBusy(null);
    }
  }

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {busy === "image" ? "Rendering…" : "Export"}
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <a
            role="menuitem"
            href={`/api/projects/${projectId}/export`}
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm transition-colors hover:bg-surface-muted"
          >
            <span className="block font-medium">Excel spreadsheet</span>
            <span className="block text-xs text-muted">.xlsx with links and percentages</span>
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={exportImage}
            className="block w-full border-t border-border px-4 py-3 text-left text-sm transition-colors hover:bg-surface-muted"
          >
            <span className="block font-medium">Image</span>
            <span className="block text-xs text-muted">.png of the table as it looks now</span>
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="absolute right-0 mt-2 w-56 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
