"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepFareChart from "./StepFareChart";

type FareKind = "ic" | "ticket";

type FarePoint = {
  km: number;
  ic: number;
  ticket: number;
};

type FareTable = {
  name: string;
  note?: string;
  fares: FarePoint[];
};

type Company = {
  name: string;
  note?: string;
  fareTables: FareTable[];
};

type FareData = {
  companies: Company[];
};

type Series = {
  id: string;
  companyKey: string;
  companyIndex: number;
  companyName: string;
  tableIndex: number;
  tableName: string;
  note?: string;
  fares: FarePoint[];
  color: string;
};

const COLOR_PALETTE = [
  "#0EA5E9", // sky-500
  "#F97316", // orange-500
  "#22C55E", // green-500
  "#A855F7", // purple-500
  "#EF4444", // red-500
  "#14B8A6", // teal-500
  "#EAB308", // yellow-500
  "#6366F1", // indigo-500
  "#F43F5E", // rose-500
  "#84CC16", // lime-500
  "#06B6D4", // cyan-500
];

function normalizeFareData(raw: unknown): FareData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("fare_data.json: root must be an object");
  }
  const root = raw as Record<string, unknown>;
  const companies = root.companies;
  if (!Array.isArray(companies)) {
    throw new Error("fare_data.json: companies must be an array");
  }
  return raw as FareData;
}

function defaultSelectedIds(series: Series[]) {
  // Show a few by default to avoid an empty chart.
  return new Set(series.slice(0, Math.min(4, series.length)).map((s) => s.id));
}

function useLocalStorageString(key: string, initialValue: string) {
  const [value, setValue] = useState<string>(initialValue);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(key);
      if (existing !== null) setValue(existing);
    } catch {
      // ignore (private mode, etc.)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export default function FareComparison() {
  const [fareKind, setFareKind] = useState<FareKind>("ic");
  const [data, setData] = useState<FareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [notes, setNotes] = useLocalStorageString(
    "railway-fare-comparison:notes",
    ""
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const res = await fetch("/data/fare_data.json", { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as unknown;
        const normalized = normalizeFareData(json);
        if (!cancelled) setData(normalized);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allSeries = useMemo<Series[]>(() => {
    if (!data) return [];
    const series: Series[] = [];
    let i = 0;

    for (let companyIndex = 0; companyIndex < data.companies.length; companyIndex++) {
      const company = data.companies[companyIndex];
      if (!company?.fareTables?.length) continue;
      const companyKey = `c${companyIndex}`;
      for (let tableIndex = 0; tableIndex < company.fareTables.length; tableIndex++) {
        const table = company.fareTables[tableIndex];
        if (!table?.fares?.length) continue;
        series.push({
          id: `${companyIndex}:${tableIndex}`,
          companyKey,
          companyIndex,
          companyName: company.name ?? companyKey,
          tableIndex,
          tableName: table.name ?? `table${tableIndex}`,
          note: table.note,
          fares: table.fares,
          color: COLOR_PALETTE[i % COLOR_PALETTE.length],
        });
        i++;
      }
    }

    return series;
  }, [data]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    defaultSelectedIds(allSeries)
  );

  // Reset selection once data is loaded (only if the user hasn't interacted).
  useEffect(() => {
    if (allSeries.length === 0) return;
    setSelectedIds((prev) => {
      if (prev.size > 0) return prev;
      return defaultSelectedIds(allSeries);
    });
  }, [allSeries]);

  const filteredSeries = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return allSeries;
    return allSeries.filter((s) => {
      const hay = `${s.companyName} ${s.tableName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allSeries, filterText]);

  const selectedSeries = useMemo(() => {
    const selected = allSeries.filter((s) => selectedIds.has(s.id));
    // Keep selection order consistent with allSeries
    return selected;
  }, [allSeries, selectedIds]);

  const selectedNotes = useMemo(() => {
    if (!data) return [];

    const selectedCompanyIndexes = new Set<number>(
      selectedSeries.map((s) => s.companyIndex)
    );

    const blocks: { id: string; title: string; note: string }[] = [];

    // Company notes (data order)
    for (let i = 0; i < data.companies.length; i++) {
      if (!selectedCompanyIndexes.has(i)) continue;
      const c = data.companies[i];
      const note = (c.note ?? "").trim();
      if (!note) continue;
      blocks.push({
        id: `company:${i}`,
        title: c.name ?? `company${i}`,
        note,
      });
    }

    // Table notes (selection order)
    for (const s of selectedSeries) {
      const note = (s.note ?? "").trim();
      if (!note) continue;
      blocks.push({
        id: `table:${s.id}`,
        title: `${s.companyName} / ${s.tableName}`,
        note,
      });
    }

    return blocks;
  }, [data, selectedSeries]);

  const grouped = useMemo(() => {
    const map = new Map<string, { companyName: string; items: Series[] }>();
    for (const s of filteredSeries) {
      const existing = map.get(s.companyKey);
      if (existing) existing.items.push(s);
      else map.set(s.companyKey, { companyName: s.companyName, items: [s] });
    }
    return Array.from(map.entries()).map(([companyKey, v]) => ({
      companyKey,
      companyName: v.companyName,
      items: v.items,
    }));
  }, [filteredSeries]);

  function setCompanyVisible(companyKey: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredSeries) {
        if (s.companyKey !== companyKey) continue;
        if (checked) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });
  }

  const selectedCount = selectedIds.size;

  function toggleSeries(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredSeries) {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-zinc-900">運賃種別</div>
          <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setFareKind("ic")}
              className={
                "rounded-full px-3 py-1.5 text-sm transition " +
                (fareKind === "ic"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950")
              }
            >
              IC運賃
            </button>
            <button
              type="button"
              onClick={() => setFareKind("ticket")}
              className={
                "rounded-full px-3 py-1.5 text-sm transition " +
                (fareKind === "ticket"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950")
              }
            >
              きっぷ運賃
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-zinc-900">検索</div>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="会社名 / 路線名 / 説明"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 sm:w-80"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <StepFareChart fareKind={fareKind} series={selectedSeries} />
            </div>

            {selectedNotes.length > 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-zinc-900">
                  注記
                </div>
                <div className="flex flex-col gap-2">
                  {selectedNotes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <div className="text-sm font-medium text-zinc-900">
                        {n.title}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                        {n.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-zinc-900">
                注意事項
              </div>
            <ul className="mb-3 list-disc pl-5 text-sm leading-6 text-zinc-700">
              <li>
                表示は比較・学習用途です。実際の運賃は各社の最新の運賃表や経路に従って確認してください。
              </li>
              <li>
                ここでの距離はデータ上の `km`（上限距離）に基づきます。加算・特例・乗継割引などは別途考慮が必要です。
              </li>
            </ul>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="メモ（ローカルに保存されます）"
              className="min-h-24 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-900">
                表示する会社・路線
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllVisible(true)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  全てON
                </button>
                <button
                  type="button"
                  onClick={() => setAllVisible(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  全てOFF
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <code>fare_data.json</code> の読み込みに失敗しました: {error}
              </div>
            ) : null}

            {!data && !error ? (
              <div className="text-sm text-zinc-600">データ読み込み中…</div>
            ) : null}

            {data ? (
              <div className="flex flex-col gap-4">
                <div className="text-xs leading-5 text-zinc-600">
                  データ例: <code>{"{ km: 3, ic: 146, ticket: 150 }"}</code>{" "}
                  は「0〜3km まで IC 146円 / きっぷ 150円」を意味します。
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-zinc-600">
                  <div>選択中: {selectedCount} 件</div>
                  <div className="hidden sm:block">
                    ホバーで距離時点の運賃を確認できます
                  </div>
                </div>

                <div className="flex max-h-130 flex-col gap-4 overflow-auto pr-1">
                  {grouped.map((g) => (
                    <div key={g.companyKey} className="flex flex-col gap-2">
                      <CompanyHeader
                        companyKey={g.companyKey}
                        companyName={g.companyName}
                        items={g.items}
                        selectedIds={selectedIds}
                        onChange={(checked) =>
                          setCompanyVisible(g.companyKey, checked)
                        }
                      />
                      {g.items.map((s) => (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 hover:bg-zinc-100/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSeries(s.id)}
                            className="mt-1 h-4 w-4 accent-zinc-900"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: s.color }}
                              />
                              <div className="truncate text-sm font-medium text-zinc-900">
                                {s.tableName}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanyHeader({
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
