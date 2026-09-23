"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { Category } from "@/lib/types";
import { CATEGORY_KEYS, CATEGORY_LABELS } from "@/lib/labels";
import { ensureSession, supabaseBrowser } from "@/lib/supabase/browser";
import { CategoryIcon } from "./CategoryIcon";

const input =
  "w-full rounded-md border border-line bg-raised px-3 py-2.5 text-base placeholder:text-mute/60 focus:border-tape focus:outline-none";
const labelCls = "mb-1 block text-[13px] font-medium text-mute";

const ERRORS: Record<string, string> = {
  rate_limited: "Можно опубликовать не больше трёх петиций в час. Попробуйте позже.",
  auth_required: "Сессия не создана. Обновите страницу.",
};

export function CreateForm() {
  const router = useRouter();
  const [f, setF] = useState({
    title: "",
    event_name: "",
    organizer: "",
    category: "logistics" as Category,
    body: "",
    evidence_url: "",
    attended: true,
  });
  const [refined, setRefined] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const bodyLen = f.body.trim().length;
  const canRefine = bodyLen >= 50 && !aiLoading;

  async function refine() {
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: f.event_name,
          organizer: f.organizer,
          category: f.category,
          body: f.body,
          evidenceUrl: f.evidence_url,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRefined(json.text);
      if (!f.title.trim() && json.title) set("title", json.title);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Нейросеть недоступна.");
    } finally {
      setAiLoading(false);
    }
  }

  function validate() {
    if (f.title.trim().length < 5) return "Заголовок — минимум 5 символов.";
    if (f.event_name.trim().length < 2) return "Укажите название мероприятия.";
    if (f.organizer.trim().length < 2) return "Укажите организацию-организатора.";
    if (bodyLen < 50) return "Опишите ситуацию подробнее: минимум 50 символов.";
    if (f.evidence_url && !/^https?:\/\//i.test(f.evidence_url)) return "Ссылка на доказательства должна начинаться с https://";
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setSaving(true);
    setError(null);
    try {
      await ensureSession();
      const { data, error } = await supabaseBrowser().rpc("create_petition", {
        p_title: f.title,
        p_event_name: f.event_name,
        p_organizer: f.organizer,
        p_category: f.category,
        p_body: f.body,
        p_body_ai_refined: refined || null,
        p_evidence_url: f.evidence_url || null,
        p_author_attended: f.attended,
      });
      if (error) throw new Error(ERRORS[error.message] ?? "Не удалось опубликовать. Проверьте поля и попробуйте снова.");
      router.push(`/p/${data}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="event" className={labelCls}>Мероприятие</label>
          <input id="event" className={input} placeholder="HackCity 2026" value={f.event_name}
            onChange={(e) => set("event_name", e.target.value)} maxLength={120} />
        </div>
        <div>
          <label htmlFor="org" className={labelCls}>Организатор</label>
          <input id="org" className={input} placeholder="Название компании или сообщества" value={f.organizer}
            onChange={(e) => set("organizer", e.target.value)} maxLength={120} />
        </div>
      </div>

      <fieldset>
        <legend className={labelCls}>Что пошло не так</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_KEYS.map((c) => {
            const active = f.category === c;
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[13px] leading-tight ${
                  active ? "border-tape bg-tape/10 text-fg" : "border-line bg-panel text-mute hover:text-fg"
                }`}
              >
                <input type="radio" name="category" value={c} checked={active}
                  onChange={() => set("category", c)} className="sr-only" />
                <CategoryIcon category={c} size={16} className={active ? "text-tape" : ""} />
                {CATEGORY_LABELS[c].label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="body" className={labelCls}>Что вы видели своими глазами</label>
          <span className={`text-[12px] tabular ${bodyLen < 50 ? "text-mute" : "text-fg/60"}`}>{bodyLen}/10000</span>
        </div>
        <textarea id="body" rows={7} className={`${input} resize-y leading-relaxed`}
          placeholder="Когда пришли, сколько стояли в очереди, кто занял места, что ответили организаторы. Пишите как есть — официальный текст соберём ниже."
          value={f.body} onChange={(e) => set("body", e.target.value)} maxLength={10000} />
      </div>

      <div>
        <label htmlFor="evidence" className={labelCls}>Фото или видео (ссылка)</label>
        <input id="evidence" type="url" inputMode="url" className={input}
          placeholder="https://disk.yandex.ru/… или t.me/…" value={f.evidence_url}
          onChange={(e) => set("evidence_url", e.target.value)} />
      </div>

      <label className="flex items-start gap-2.5 rounded-md border border-line bg-panel p-2.5 text-[14px]">
        <input type="checkbox" checked={f.attended} onChange={(e) => set("attended", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#F2B63D]" />
        <span>
          Я лично присутствовал на мероприятии
          <span className="block text-[12px] text-mute">Модератор может запросить билет или бейдж, чтобы подтвердить это.</span>
        </span>
      </label>

      {/* AI-модуль */}
      <section className="rounded-lg border border-dashed border-tape/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] leading-snug text-mute">
            Нейросеть уберёт эмоции, выстроит хронологию и сформулирует требования. Факты не добавляет.
          </p>
          <button type="button" onClick={refine} disabled={!canRefine}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-tape/50 px-3 text-[13px] font-semibold text-tape hover:bg-tape/10 disabled:opacity-40">
            {aiLoading ? <Loader2 size={15} className="animate-spin" aria-hidden />
              : refined ? <RotateCcw size={15} aria-hidden /> : <Sparkles size={15} aria-hidden />}
            {refined ? "Переписать" : "Превратить в официальную претензию"}
          </button>
        </div>
        {refined && (
          <div className="mt-3">
            <label htmlFor="refined" className={labelCls}>Официальная претензия (можно править)</label>
            <textarea id="refined" rows={12} className={`${input} resize-y text-[15px] leading-relaxed`}
              value={refined} onChange={(e) => setRefined(e.target.value)} />
            <p className="mt-1 text-[12px] text-mute">Проверьте пометки [уточнить] — замените их фактами или удалите.</p>
          </div>
        )}
      </section>

      <div>
        <label htmlFor="title" className={labelCls}>Заголовок петиции</label>
        <input id="title" className={input} placeholder="Час в очереди на вход без проверки регистрации"
          value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={140} />
      </div>

      {error && <p className="text-[13px] text-ignored" role="alert">{error}</p>}

      <button type="submit" disabled={saving}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-tape text-[15px] font-semibold text-ink hover:bg-tape/90 disabled:opacity-60">
        {saving && <Loader2 size={18} className="animate-spin" aria-hidden />}
        Опубликовать петицию
      </button>
    </form>
  );
}
