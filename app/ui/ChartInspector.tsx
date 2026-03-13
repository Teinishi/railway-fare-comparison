"use client";

import { LuPin } from "react-icons/lu";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  message: string;
  noValuesMessage: string;
  hoverValues: {
    id: string;
    label: string;
    color: string;
    value: number | null;
    unit?: string;
  }[];
  activeId?: string | null;
  pinnedId?: string | null;
  onHoverId?: (id: string | null) => void;
  onTogglePin?: (id: string) => void;
};

export default function ChartInspector({
  message,
  noValuesMessage,
  hoverValues,
  activeId = null,
  pinnedId = null,
  onHoverId,
  onTogglePin,
}: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const { sortedValues, isSorting } = useMemo(() => {
    const hasAnyValue = hoverValues.some((v) => v.value !== null);
    if (!hasAnyValue) return { sortedValues: hoverValues, isSorting: false };

    const sortedValues = hoverValues.slice().sort((a, b) => {
      const av = a.value;
      const bv = b.value;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return bv - av;
    });

    return { sortedValues, isSorting: true };
  }, [hoverValues]);

  useEffect(() => {
    if (!activeId) return;
    const list = listRef.current;
    if (!list) return;
    const el = itemRefs.current.get(activeId);
    if (!el) return;

    // Keep scrolling inside the inspector list (avoid scrolling the page).
    const pad = 8;
    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Position of the element within the scroll content (not offsetParent-dependent).
    const top = elRect.top - listRect.top + list.scrollTop;
    const bottom = top + elRect.height;
    const viewTop = list.scrollTop;
    const viewBottom = viewTop + list.clientHeight;

    if (top < viewTop + pad) {
      list.scrollTop = Math.max(0, top - pad);
    } else if (bottom > viewBottom - pad) {
      list.scrollTop = Math.max(0, bottom - list.clientHeight + pad);
    }
  }, [activeId]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="text-xs font-semibold text-zinc-900">
          インスペクタ
          {isSorting ? (
            <span className="ml-2 text-[10px] text-zinc-500">
              降順でソートしています
            </span>
          ) : null}
        </div>
        <div className="wrap-break-word text-[11px] text-zinc-600">
          {message}
        </div>
      </div>
      <div
        ref={listRef}
        className="relative flex max-h-40 flex-col gap-1 overflow-auto pr-1"
      >
        {sortedValues.map((v) => (
          <button
            type="button"
            key={v.id}
            ref={(node) => {
              itemRefs.current.set(v.id, node);
            }}
            onMouseEnter={() => onHoverId?.(v.id)}
            onMouseLeave={() => onHoverId?.(null)}
            onFocus={() => onHoverId?.(v.id)}
            onBlur={() => onHoverId?.(null)}
            onClick={() => onTogglePin?.(v.id)}
            className={
              "w-full grid grid-cols-[10px_1fr_max-content] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs " +
              (v.id === activeId
                ? "bg-blue-100 text-zinc-950"
                : "bg-zinc-50 text-zinc-700")
            }
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: v.color }}
            />
            <div className="min-w-0 flex-1 truncate text-zinc-700">
              {v.label}
            </div>
            {pinnedId === v.id ? (
              <div className="rounded-full border border-zinc-200 bg-white -my-1 px-1 py-1 text-[12px] text-zinc-700">
                <LuPin />
              </div>
            ) : null}
            <div className="tabular-nums text-zinc-950 text-right">
              {v.value === null ? "—" : `${v.value}${v.unit ?? ""}`}
            </div>
          </button>
        ))}
        {hoverValues.length === 0 ? (
          <div className="text-xs text-zinc-600">
            {noValuesMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
