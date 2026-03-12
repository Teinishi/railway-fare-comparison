"use client";

type FareKind = "ic" | "ticket";

type Props = {
  fareKind: FareKind;
  onChangeFareKind: (next: FareKind) => void
};

export default function FareKindSelect({ fareKind, onChangeFareKind }: Props) {
  return (
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
  )
}
