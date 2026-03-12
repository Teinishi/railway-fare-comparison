"use client";

import { useEffect, useRef } from "react";

export default function CompanyHeader({
  companyKey,
  companyName,
  items,
  selectedIds,
  onChange,
}: {
  companyKey: string;
  companyName: string;
  items: { id: string }[];
  selectedIds: Set<string>;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const selectedInGroup = items.filter((it) => selectedIds.has(it.id)).length;
  const all = items.length;
  const checked = all > 0 && selectedInGroup === all;
  const indeterminate = selectedInGroup > 0 && selectedInGroup < all;

  useEffect(() => {
    if (!ref.current) return;
    ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 hover:bg-zinc-50">
      <div className="flex min-w-0 items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-zinc-900"
          aria-label={`${companyKey} をまとめて切り替え`}
        />
        <div className="truncate text-xs font-semibold text-zinc-900">
          {companyName}
        </div>
      </div>
      <div className="text-[11px] tabular-nums text-zinc-600">
        {selectedInGroup}/{all}
      </div>
    </label>
  );
}
