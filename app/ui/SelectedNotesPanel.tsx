"use client";

import { useId, useState } from "react";

export type NoteBlock = { id: string; color?: string; title: string; note: string };

export default function SelectedNotesPanel({
  blocks,
  className,
}: {
  blocks: NoteBlock[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  if (blocks.length === 0) return null;

  return (
    <div
      className={
        "w-full min-w-0 max-w-full rounded-2xl border border-zinc-200 bg-white p-3 " +
        (className ?? "")
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="grid h-6 w-6 place-items-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700"
          >
            <svg viewBox="0 0 20 20" className={"h-5 w-5 transition-transform " + (open ? "rotate-90" : "rotate-0")} fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24c.3.3.3.77 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <div className="truncate text-sm font-semibold text-zinc-900">注記</div>
        </div>
        <div className="flex flex-none items-center gap-2 text-xs text-zinc-600">
          <span className="tabular-nums">{blocks.length}件</span>
        </div>
      </button>

      <div id={contentId} className={open ? "mt-3" : "mt-3 hidden"}>
        <div className="flex min-w-0 flex-col gap-2">
          {blocks.map((n) => (
            <div
              key={n.id}
              className="min-w-0 rounded-md border border-zinc-200 bg-zinc-50 p-3"
            >
              <div className="flex items-center gap-2">
                {n.color && <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: n.color }}
                />}
                <span className="text-sm font-medium text-zinc-900 wrap-break-word">
                  {n.title}
                </span>
              </div>
              <div className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-zinc-700">
                {n.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
