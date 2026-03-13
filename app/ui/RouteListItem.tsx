"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
  name: string;
};

export default function RouteListItem({ checked, onChange, color, name }: Props) {
  return (
    <label className="flex flex-1 cursor-pointer rounded-xl border border-zinc-200 bg-white p-2.5 hover:bg-zinc-50">
      <div className="grid w-full grid-cols-[16px_10px_1fr] items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-zinc-900"
        />
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="whitespace-normal wrap-break-word text-sm font-medium leading-snug text-zinc-900">
          {name}
        </div>
      </div>
    </label>
  );
}
