type Props = {
  message: string;
  hoverValues: {
    id: string;
    label: string;
    color: string;
    value: string | null;
  }[]
};

export default function ChartInspector({ message, hoverValues }: Props) {
  return (
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-zinc-900">インスペクタ</div>
        <div className="text-[11px] text-zinc-600">
          {message}
        </div>
      </div>
      <div className="flex max-h-55 flex-col gap-1 overflow-auto pr-1">
        {hoverValues.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-xs"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: v.color }}
            />
            <div className="min-w-0 flex-1 truncate text-zinc-700">
              {v.label}
            </div>
            <div className="tabular-nums text-zinc-950">
              {v.value === null ? "—" : v.value}
            </div>
          </div>
        ))}
        {hoverValues.length === 0 ? (
          <div className="text-xs text-zinc-600">
            表示する路線を選択してください
          </div>
        ) : null}
      </div>
    </div>
  )
}
