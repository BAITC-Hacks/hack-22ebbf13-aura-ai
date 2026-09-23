"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, PenLine } from "lucide-react";
import { currentSession, ensureSession, supabaseBrowser } from "@/lib/supabase/browser";
import { formatCount, signaturesWord } from "@/lib/labels";
import type { Petition } from "@/lib/types";

type State = "checking" | "idle" | "signing" | "signed";

export function SignPanel({ petitionId, initialCount }: { petitionId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);

  // Уже подписано? Проверяем, только если сессия существует
  useEffect(() => {
    (async () => {
      const session = await currentSession();
      if (!session) return setState("idle");
      const { data } = await supabaseBrowser()
        .from("signatures")
        .select("id")
        .eq("petition_id", petitionId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      setState(data ? "signed" : "idle");
    })();
  }, [petitionId]);

  // Счётчик в реальном времени
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`petition-${petitionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "petitions", filter: `id=eq.${petitionId}` },
        (payload) => setCount((payload.new as Petition).votes_count),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [petitionId]);

  async function sign() {
    setError(null);
    setState("signing");
    try {
      const session = await ensureSession();
      const res = await fetch("/api/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ petitionId }),
      });
      const json = await res.json();
      if (res.ok) {
        if (typeof json.votes_count === "number") setCount(json.votes_count);
        setState("signed");
      } else if (json.signed) {
        setState("signed");
      } else {
        setError(json.error ?? "Не удалось подписать.");
        setState("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Нет соединения. Проверьте интернет.");
      setState("idle");
    }
  }

  const signed = state === "signed";

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 backdrop-blur pb-safe">
      <div className="mx-auto max-w-2xl px-3 py-2.5">
        {error && <p className="mb-2 text-[13px] text-ignored" role="alert">{error}</p>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1" aria-live="polite">
            <span key={count} className="inline-block animate-tick font-display text-[22px] font-bold leading-none tabular">
              {formatCount(count)}
            </span>
            <span className="ml-1.5 text-[13px] text-mute">{signaturesWord(count)}</span>
          </div>
          <button
            onClick={sign}
            disabled={state !== "idle"}
            className={`inline-flex h-11 min-w-[176px] items-center justify-center gap-2 rounded-md px-4 text-[15px] font-semibold transition-colors ${
              signed
                ? "border border-tape/40 bg-tape/10 text-tape"
                : "bg-tape text-ink hover:bg-tape/90 disabled:opacity-60"
            }`}
          >
            {state === "signing" || state === "checking" ? (
              <Loader2 size={18} className="animate-spin" aria-hidden />
            ) : signed ? (
              <Check size={18} aria-hidden />
            ) : (
              <PenLine size={18} aria-hidden />
            )}
            {signed ? "Вы подписали" : state === "signing" ? "Подписываем" : "Подписать петицию"}
          </button>
        </div>
      </div>
    </div>
  );
}
