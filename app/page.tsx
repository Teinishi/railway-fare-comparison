import FareComparison from "./ui/FareComparison";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            鉄道運賃比較
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600">
            運賃表を階段状のグラフとして比較します。
          </p>
        </div>

        {/* Client-side interactive UI */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          {/* Lazy-loaded client component to keep server render simple */}
          {/**
           * next/dynamic is optional; plain import is fine too.
           * Keeping it simple here: the component itself is marked "use client".
           */}
          <FareComparison />
        </div>
      </main>
    </div>
  );
}
