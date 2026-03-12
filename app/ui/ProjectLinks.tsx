import { FaGithub } from "react-icons/fa6";
import { FaXTwitter } from "react-icons/fa6";

export default function ProjectLinks() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="text-sm font-semibold text-zinc-900">開発者リンク</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="https://github.com/Teinishi/railway-fare-comparison"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          title="GitHub"
          className="inline-flex px-2.5 h-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          <FaGithub size={18} />
        </a>
        <a
          href="https://x.com/Te___24"
          target="_blank"
          rel="noreferrer"
          aria-label="X"
          title="X"
          className="inline-flex px-2.5 h-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          <FaXTwitter size={18} />
          <span className="ml-1">@Te___24</span>
        </a>
        <a
          href="https://stormskey.works/@teinishi"
          target="_blank"
          rel="noreferrer"
          aria-label="すとーむすきー"
          title="すとーむすきー"
          className="inline-flex px-2.5 h-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          すとーむすきー
        </a>
      </div>
    </div>
  );
}
