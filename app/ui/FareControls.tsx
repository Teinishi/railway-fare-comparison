"use client";

type FareKind = "ic" | "ticket";

export default function FareControls({
  fareKind,
  onChangeFareKind,
  filterText,
  onChangeFilterText,
}: {
  fareKind: FareKind;
  onChangeFareKind: (next: FareKind) => void;
  filterText: string;
  onChangeFilterText: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium text-zinc-900">運賃種別</div>
        <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => onChangeFareKind("ic")}
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
            onClick={() => onChangeFareKind("ticket")}
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
          onChange={(e) => onChangeFilterText(e.target.value)}
          placeholder="会社名 / 路線名"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 sm:w-80"
        />
      </div>
    </div>
  );
}
