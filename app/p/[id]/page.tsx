import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck, ShieldQuestion } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_LABELS, UUID_RE, formatDate } from "@/lib/labels";
import type { Petition } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PetitionText } from "@/components/PetitionText";
import { ShareBar } from "@/components/ShareBar";
import { SignPanel } from "@/components/SignPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function getPetition(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabaseServer()
    .from("petitions")
    .select("*, organizers(name, rating)")
    .eq("id", id)
    .maybeSingle();
  return data as Petition | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPetition(id);
  if (!p) return { title: "Петиция не найдена" };
  const description = `${p.event_name}, ${p.organizers?.name ?? ""}. ${p.body.slice(0, 140)}`;
  return {
    title: p.title,
    description,
    openGraph: {
      title: p.title,
      description,
      type: "article",
      images: [{ url: `/api/og/${p.id}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [`/api/og/${p.id}`] },
  };
}

function Attendance({ p }: { p: Petition }) {
  const verified = p.attendance_verified;
  const claimed = p.author_attended;
  const Icon = verified || claimed ? ShieldCheck : ShieldQuestion;
  const tone = verified ? "border-sent/40 bg-sent/5 text-sent" : claimed ? "border-line bg-panel text-fg" : "border-line bg-panel text-mute";

  return (
    <section className={`flex gap-3 rounded-lg border p-3 ${tone}`}>
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 text-[14px]">
        <p className="font-semibold">Подтверждённый опыт</p>
        <p className="mt-0.5 text-[13px] text-mute">
          {verified
            ? "Модератор проверил, что автор присутствовал на мероприятии."
            : claimed
              ? "Автор заявил, что лично присутствовал на месте событий. Проверка модератором ещё не проводилась."
              : "Автор не указал, что присутствовал лично."}
        </p>
        {p.evidence_url && (
          <a href={p.evidence_url} target="_blank" rel="noopener noreferrer nofollow"
            className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[13px] text-tape hover:underline">
            <ExternalLink size={13} aria-hidden />
            <span className="truncate">Доказательства: {new URL(p.evidence_url).hostname}</span>
          </a>
        )}
      </div>
    </section>
  );
}

export default async function PetitionPage({ params }: Props) {
  const { id } = await params;
  const p = await getPetition(id);
  if (!p) notFound();

  return (
    <article className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-mute hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> Все петиции
      </Link>

      <header className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="inline-flex items-center gap-1 text-[12px] text-mute">
            <CategoryIcon category={p.category} size={13} />
            {CATEGORY_LABELS[p.category].label}
          </span>
        </div>
        <h1 className="font-display text-[22px] font-bold leading-[1.15] tracking-tight sm:text-[28px]">{p.title}</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
          <dt className="text-mute">Мероприятие</dt>
          <dd>{p.event_name}</dd>
          <dt className="text-mute">Организатор</dt>
          <dd>
            {p.organizers?.name}
            {p.organizers && (
              <span className="ml-2 text-[12px] text-mute tabular">рейтинг {Number(p.organizers.rating).toFixed(1)} из 5</span>
            )}
          </dd>
          <dt className="text-mute">Опубликована</dt>
          <dd>{formatDate(p.created_at)}</dd>
        </dl>
      </header>

      <Attendance p={p} />
      <PetitionText refined={p.body_ai_refined} original={p.body} />
      <ShareBar id={p.id} title={p.title} />
      <SignPanel petitionId={p.id} initialCount={p.votes_count} />
    </article>
  );
}
