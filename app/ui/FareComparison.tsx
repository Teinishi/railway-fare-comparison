"use client";

import { useEffect, useMemo, useState } from "react";
import StepFareChart from "./StepFareChart";
import SelectedNotesPanel, { type NoteBlock } from "./SelectedNotesPanel";
import FareKindSelect from "./FareKindSelect";
import CompanyRouteList from "./CompanyRouteList";

type FareKind = "ic" | "ticket";

type FarePoint = {
  km: number;
  ic: number;
  ticket: number;
};

type FareTable = {
  name?: string;
  note?: string;
  color: string;
  fares: FarePoint[];
};

type Company = {
  name: string;
  tags?: string[];
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
  tags?: string[];
  tableIndex: number;
  tableName?: string;
  note?: string;
  fares: FarePoint[];
  color: string;
};

/*const COLOR_PALETTE = [
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
];*/

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
  return new Set(series
    .filter(s => s.companyName === "JR東日本" && ["山手線内", "電車特定区間", "幹線"].some(v => s.tableName?.includes(v)))
    .map(s => s.id)
  );
}

export default function FareComparison() {
  const [fareKind, setFareKind] = useState<FareKind>("ic");
  const [data, setData] = useState<FareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        // GitHub Pages is typically served under a subpath (e.g. /repo-name/),
        // so avoid absolute paths like "/data/..." which point to the domain root.
        const basePath = window.location.pathname.endsWith("/")
          ? window.location.pathname
          : window.location.pathname + "/";
        const res = await fetch(`${basePath}data/fare_data.json`, { cache: "force-cache" });
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
          companyName: company.name,
          tags: company.tags,
          tableIndex,
          tableName: table.name,
          note: table.note,
          fares: table.fares,
          color: table.color,
        });
      }
    }

    return series;
  }, [data]);

  const availableTags = useMemo(() => {
    if (!data) return new Set<string>();
    const tags = new Set<string>();
    const seen = new Set<string>();
    for (const c of data.companies) {
      const ts = c.tags ?? [];
      for (const t of ts) {
        if (seen.has(t)) continue;
        seen.add(t);
        tags.add(t);
      }
    }
    return tags;
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
    let out = allSeries;
    if (q) {
      out = out.filter((s) => {
        const hay = `${s.companyName} ${s.tableName ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (selectedTags.size > 0) {
      out = out.filter((s) => (s.tags ?? []).some((t) => selectedTags.has(t)));
    }
    return out;
  }, [allSeries, filterText, selectedTags]);

  const selectedSeries = useMemo(() => {
    const selected = allSeries.filter((s) => selectedIds.has(s.id));
    // Keep selection order consistent with allSeries
    return selected;
  }, [allSeries, selectedIds]);

  const selectedNotes = useMemo(() => {
    if (!data) return [];

    const blocks: NoteBlock[] = [];
    const addedCompanyIndices = new Set<number>();

    for (const s of selectedSeries) {
      const { companyIndex } = s;
      const company = data.companies[companyIndex];

      if (!addedCompanyIndices.has(companyIndex)) {
        const note = (company.note ?? "").trim();
        if (note) {
          blocks.push({
            id: `company:${companyIndex}`,
            color: company.fareTables.length === 1 ? s.color : undefined,
            title: company.name,
            note,
          });
        }
        addedCompanyIndices.add(companyIndex);
      }

      const note = (s.note ?? "").trim();
      if (note) {
        blocks.push({
          id: `table:${s.id}`,
          color: s.color,
          title: s.tableName !== undefined ? `${company.name} ${s.tableName}` : company.name,
          note,
        });
      }
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

  function changeSeries(checked: boolean, id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function setAllVisible(checked: boolean) {
    // UX: when filtered, "All ON" should turn on only visible items and turn off hidden ones.
    // "All OFF" should turn off everything (including hidden items).
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(filteredSeries.map((s) => s.id));
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function clearTags() {
    setSelectedTags(new Set());
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:grid-rows-[max-content_720px_max-content_max-content]">
        <div className="lg:row-start-1 lg:col-start-1">
          <FareKindSelect fareKind={fareKind} onChangeFareKind={setFareKind} />
        </div>

        <div className="lg:row-start-2 lg:col-start-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <StepFareChart fareKind={fareKind} series={selectedSeries} />
        </div>

        <SelectedNotesPanel blocks={selectedNotes} className="min-w-0" />

        <div className="lg:row-start-1 lg:col-start-2 flex flex-col gap-1">
          <div className="text-sm font-medium text-zinc-900">検索</div>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="会社・路線名"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 sm:w-80"
          />
        </div>

        <CompanyRouteList
          className="lg:row-start-2 lg:col-start-2 lg:w-85 lg:flex-none"
          grouped={grouped}
          selectedIds={selectedIds}
          selectedCount={selectedCount}
          isLoading={!data && !error}
          error={error}
          availableTags={availableTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClearTags={clearTags}
          onSetAllVisible={setAllVisible}
          onSetCompanyVisible={setCompanyVisible}
          onChangeSeries={changeSeries}
        />

        <div className="lg:col-start-1 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-zinc-900">
            注意事項
          </div>
          <ul className="list-disc pl-5 text-sm leading-6 text-zinc-700 wrap-break-word">
            <li>
              運賃表データは各社の旅客営業規則、ICカード乗車券取扱規則等を基に作成したものです。手作業で収集しているため、情報が正確でない場合があります。
            </li>
            <li>
              営業キロに基づく大人片道普通旅客運賃を表示しています。加算運賃・特例・乗継割引などは別途考慮が必要です。
            </li>
            <li>
              2026年3月時点の情報です。運賃改定などにより最新の情報でない場合があります。
            </li>
            <li>
              実際の運賃は各社の最新の運賃表や経路に従って確認してください。
            </li>
            <li>
              本ツールの利用により生じたいかなる損害についても、開発者は一切の責任を負いません。
            </li>
            <li>
              本ツールは個人による非公式のプロジェクトであり、記載されている鉄道各社とは一切関係ありません。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
