"use client";

import CompanyListItem from "./CompanyListItem";
import { TAGS } from "./tagLabels";

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

type Props = {
  className?: string;
  grouped: Group[];
  selectedIds: Set<string>;
  selectedCount: number;
  isLoading: boolean;
  error: string | null;
  availableTags: Set<string>;
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  onSetAllVisible: (checked: boolean) => void;
  onSetCompanyVisible: (companyKey: string, checked: boolean) => void;
  onChangeSeries: (checked: boolean, id: string) => void;
};

export default function CompanyRouteList({
  className,
  grouped,
  selectedIds,
  selectedCount,
  isLoading,
  error,
  availableTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  onSetAllVisible,
  onSetCompanyVisible,
  onChangeSeries,
}: Props) {
  return (
    <aside className={"flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 " + (className ?? "")}>
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
        <div className="grow min-h-0 flex flex-col gap-2">
          {availableTags.size > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="h-7.5 flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-zinc-900">
                  タグで絞り込み
                </div>
                {selectedTags.size > 0 ? (
                  <button
                    type="button"
                    onClick={onClearTags}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    クリア
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 overflow-auto pr-1">
                {TAGS.filter(t => availableTags.has(t[0])).map(([t, label]) => {
                  const on = selectedTags.has(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onToggleTag(t)}
                      className={
                        "rounded-full border px-3 py-1.5 text-xs wrap-break-word " +
                        (on
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100")
                      }
                      aria-pressed={on}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="text-xs text-zinc-600 text-right">選択中: {selectedCount} 件</div>

          <div className="grow min-h-0 overflow-auto pr-1">
            {grouped.map((g) => (
              <CompanyListItem
                className="mt-2 first:mt-0"
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
    </aside>
  );
}
