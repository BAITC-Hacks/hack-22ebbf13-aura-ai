"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { Petition, PetitionListItem } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { plural } from "@/lib/labels";
import { PetitionCard } from "./PetitionCard";

export function LiveFeed({ initial }: { initial: PetitionListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState(0);

  useEffect(() => {
    setItems(initial);
    setFresh(0);
  }, [initial]);

  useEffect(() => {
    const sb = supabaseBrowser();
    const channel = sb
      .channel("petitions-feed")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "petitions" }, (payload) => {
        const row = payload.new as Petition;
        setItems((prev) =>
          prev.map((i) => (i.id === row.id ? { ...i, votes_count: row.votes_count, status: row.status } : i)),
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "petitions" }, () => setFresh((n) => n + 1))
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-2">
      {fresh > 0 && (
        <button
          onClick={() => router.refresh()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-tape/40 bg-tape/10 py-2 text-[13px] font-medium text-tape"
        >
          <RefreshCw size={14} aria-hidden />
          {fresh} {plural(fresh, ["новая петиция", "новые петиции", "новых петиций"])}, показать
        </button>
      )}
      {items.map((p) => (
        <PetitionCard key={p.id} p={p} />
      ))}
    </div>
  );
}
