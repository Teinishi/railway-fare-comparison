"use client";

import { useEffect, useRef } from "react";

type Props = {
  companyKey: string;
  companyName: string;
  selectedItemCount: number;
  allItemCount: number;
  onChange: (checked: boolean) => void;
};

export default function CompanyHeader({
  companyKey,
  companyName,
  selectedItemCount,
  allItemCount,
  onChange,
}: Props) {
  const ref = useRef<HTMLInputElement | null>(null);
  const checked = allItemCount > 0 && selectedItemCount === allItemCount;
  const indeterminate = selectedItemCount > 0 && selectedItemCount < allItemCount;

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
        {selectedItemCount}/{allItemCount}
      </div>
    </label>
  );
}
