"use client";

export type NoteBlock = { id: string; title: string; note: string };

export default function SelectedNotesPanel({ blocks }: { blocks: NoteBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-zinc-900">
        注記
      </div>
      <div className="flex flex-col gap-2">
        {blocks.map((n) => (
          <div
            key={n.id}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
          >
            <div className="text-sm font-medium text-zinc-900">{n.title}</div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {n.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
