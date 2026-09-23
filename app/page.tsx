import Link from "next/link";
import { Search } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_KEYS, CATEGORY_LABELS, isCategory } from "@/lib/labels";
import type { Category, PetitionListItem } from "@/lib/types";
import { LiveFeed } from "@/components/LiveFeed";
import { CategoryIcon } from "@/components/CategoryIcon";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ c?: string; q?: string }> };

async function loadFeed(category: Category | null, q: string) {
  const sb = supabaseServer();
  let query = sb
    .from("petitions")
    .select("id,title,event_name,body,votes_count,category,status,author_attended,created_at,organizers(name)")
    .order("votes_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (category) query = query.eq("category", category);

  // Символы, ломающие синтаксис фильтров PostgREST, вырезаем
  const safe = q.replace(/[%,()*\\:"']/g, " ").trim().slice(0, 60);
  if (safe) {
    const { data: orgs } = await sb.from("organizers").select("id").ilike("name", `%${safe}%`).limit(20);
    const orgFilter = orgs?.length ? `,organizer_id.in.(${orgs.map((o) => o.id).join(",")})` : "";
    query = query.or(`title.ilike.%${safe}%,event_name.ilike.%${safe}%${orgFilter}`);
  }

  const { data, error } = await query;
  if (error) console.error(error);
  return (data ?? []) as unknown as PetitionListItem[];
}

export default async function Home({ searchParams }: Props) {
  const { c, q = "" } = await searchParams;
  const category = isCategory(c) ? c : null;
  const items = await loadFeed(category, q);

  const href = (cat: Category | null) => {
    const sp = new URLSearchParams();
    if (cat) sp.set("c", cat);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  const chip = (active: boolean) =>
    `inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] ${
      active ? "border-tape bg-tape text-ink font-semibold" : "border-line bg-panel text-mute hover:text-fg"
    }`;

  return (
    <div className="space-y-3">
      <h1 className="font-display text-[20px] font-bold leading-tight tracking-tight sm:text-2xl">
        Жалобы участников на организацию мероприятий
      </h1>
      <p className="-mt-1 text-[14px] text-mute">Подписывайте то, что видели сами. Каждая подпись — одна на человека.</p>

      <form action="/" className="relative">
        {category && <input type="hidden" name="c" value={category} />}
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Ивент, организатор или проблема"
          aria-label="Поиск петиций"
          className="h-10 w-full rounded-md border border-line bg-panel pl-9 pr-3 text-base placeholder:text-mute/60 focus:border-tape focus:outline-none"
        />
      </form>

      <nav aria-label="Категории" className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
        <Link href={href(null)} className={chip(!category)}>Все</Link>
        {CATEGORY_KEYS.map((k) => (
          <Link key={k} href={href(k)} className={chip(category === k)}>
            <CategoryIcon category={k} size={14} />
            {CATEGORY_LABELS[k].label}
          </Link>
        ))}
      </nav>

      {items.length ? (
        <LiveFeed initial={items} />
      ) : (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <p className="text-[15px]">{q ? `По запросу «${q}» петиций нет.` : "В этой категории пока нет петиций."}</p>
          <p className="mt-1 text-[13px] text-mute">Столкнулись с проблемой на мероприятии — опишите её первым.</p>
          <Link href="/new" className="mt-4 inline-flex h-9 items-center rounded-md bg-tape px-4 text-[13px] font-semibold text-ink">
            Создать петицию
          </Link>
        </div>
      )}
    </div>
  );
}
