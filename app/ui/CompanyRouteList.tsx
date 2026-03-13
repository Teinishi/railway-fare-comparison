"use client";

import CompanyListItem from "./CompanyListItem";

type Item = {
  id: string;
  companyKey: string;
  companyName: string;
  tableName?: string;
  color: string;
};

type Group = {
  companyKey: string;
  companyName: string;
  items: Item[];
};

export default function CompanyRouteList({
  className,
  grouped,
  selectedIds,
  selectedCount,
  isLoading,
  error,
  onSetAllVisible,
  onSetCompanyVisible,
  onChangeSeries,
}: {
  className?: string;
  grouped: Group[];
  selectedIds: Set<string>;
  selectedCount: number;
  isLoading: boolean;
  error: string | null;
  onSetAllVisible: (checked: boolean) => void;
  onSetCompanyVisible: (companyKey: string, checked: boolean) => void;
  onChangeSeries: (checked: boolean, id: string) => void;
}) {
  return (
    <aside className={"flex flex-col gap-4 " + (className ?? "")}>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-zinc-900">
            表示する会社・路線
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSetAllVisible(true)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              全てON
            </button>
            <button
              type="button"
              onClick={() => onSetAllVisible(false)}
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

        {isLoading ? (
          <div className="text-sm text-zinc-600">データ読み込み中…</div>
        ) : null}

        {!isLoading && !error ? (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-zinc-600">選択中: {selectedCount} 件</div>

            <div className="flex lg:max-h-150 flex-col gap-4 overflow-auto pr-1">
              {grouped.map((g) => (
                <CompanyListItem
                  key={g.companyKey}
                  companyKey={g.companyKey}
                  companyName={g.companyName}
                  items={g.items}
                  selectedIds={selectedIds}
                  onChangeCompany={(checked) => onSetCompanyVisible(g.companyKey, checked)}
                  onChangeRoute={(checked, id) => onChangeSeries(checked, id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
