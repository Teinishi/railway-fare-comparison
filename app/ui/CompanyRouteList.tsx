"use client";

import CompanyHeader from "./CompanyHeader";

type Item = {
  id: string;
  companyKey: string;
  companyName: string;
  tableName: string;
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
  onToggleSeries,
}: {
  className?: string;
  grouped: Group[];
  selectedIds: Set<string>;
  selectedCount: number;
  isLoading: boolean;
  error: string | null;
  onSetAllVisible: (checked: boolean) => void;
  onSetCompanyVisible: (companyKey: string, checked: boolean) => void;
  onToggleSeries: (id: string) => void;
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
                <div key={g.companyKey}>
                  <CompanyHeader
                    companyKey={g.companyKey}
                    companyName={g.companyName}
                    items={g.items}
                    selectedIds={selectedIds}
                    onChange={(checked) => onSetCompanyVisible(g.companyKey, checked)}
                  />

                  <div className="mt-2 ml-3 flex flex-col">
                    {g.items.map((s, idx) => {
                      const isLast = idx === g.items.length - 1;

                      const connectorTopClass = "top-1/2 bottom-1/2";

                      let vLineClass = "";
                      if (isLast) vLineClass = "-top-2 bottom-[calc(50%-1px)]";
                      else vLineClass = "-top-2 bottom-0";

                      return (
                        <div
                          key={s.id}
                          className={"relative flex" + (isLast ? "" : " pb-2")}
                        >
                          <div aria-hidden="true" className="relative w-4 flex-none">
                            <span
                              className={
                                "absolute left-1/2 w-px -translate-x-1/2 bg-zinc-200 " +
                                vLineClass
                              }
                            />
                            <span
                              className={
                                "absolute left-1/2 h-px w-2 bg-zinc-200 " +
                                connectorTopClass
                              }
                            />
                          </div>

                          <label className="flex flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-white p-2.5 hover:bg-zinc-50">
                            <div className="grid w-full grid-cols-[16px_10px_1fr] items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.id)}
                                onChange={() => onToggleSeries(s.id)}
                                className="mt-0.5 h-4 w-4 accent-zinc-900"
                              />
                              <span
                                className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: s.color }}
                              />
                              <div className="whitespace-normal wrap-break-word text-sm font-medium leading-snug text-zinc-900">
                                {s.tableName}
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
