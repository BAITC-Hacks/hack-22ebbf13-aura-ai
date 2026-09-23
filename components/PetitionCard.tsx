import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { PetitionListItem } from "@/lib/types";
import { CATEGORY_LABELS, formatCount, signaturesWord } from "@/lib/labels";
import { StatusBadge } from "./StatusBadge";
import { CategoryIcon } from "./CategoryIcon";

export function PetitionCard({ p }: { p: PetitionListItem }) {
  return (
    <Link
      href={`/p/${p.id}`}
      className="group flex overflow-hidden rounded-lg border border-line bg-panel transition-colors hover:border-mute/40"
    >
      <div className="min-w-0 flex-1 p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={p.status} />
          <span className="inline-flex items-center gap-1 text-[12px] text-mute">
            <CategoryIcon category={p.category} size={13} />
            {CATEGORY_LABELS[p.category].short}
          </span>
          {p.author_attended && (
            <span className="inline-flex items-center gap-1 text-[12px] text-mute" title="Автор был на мероприятии">
              <ShieldCheck size={13} aria-hidden />
              Очевидец
            </span>
          )}
        </div>
        <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug group-hover:text-white">{p.title}</h2>
        <p className="mt-0.5 truncate text-[13px] text-mute">
          {p.event_name}
          {p.organizers?.name ? `, ${p.organizers.name}` : ""}
        </p>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-fg/70">{p.body}</p>
      </div>

      {/* Отрывной талон со счётчиком */}
      <div className="stub flex w-[84px] shrink-0 flex-col items-center justify-center px-1 text-center">
        <span key={p.votes_count} className="animate-tick font-display text-[18px] font-bold leading-none tabular">
          {formatCount(p.votes_count)}
        </span>
        <span className="mt-1 text-[11px] text-mute">{signaturesWord(p.votes_count)}</span>
      </div>
    </Link>
  );
}
