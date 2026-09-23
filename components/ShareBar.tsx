"use client";

import { useState } from "react";
import { Camera, Check, Link2, Send } from "lucide-react";

export function ShareBar({ id, title }: { id: string; title: string }) {
  const [note, setNote] = useState<string | null>(null);
  const url = () => `${window.location.origin}/p/${id}`;

  function telegram() {
    const text = `Подпишите петицию: ${title}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener",
    );
  }

  // У Instagram нет веб-ссылки для шеринга: отдаём картинку для сторис
  // через системное меню, а если оно недоступно — скачиваем файл.
  async function instagram() {
    setNote(null);
    try {
      const blob = await (await fetch(`/api/og/${id}?format=story`)).blob();
      const file = new File([blob], "petition-story.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title, text: url() });
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      await navigator.clipboard?.writeText(url()).catch(() => {});
      setNote("Картинка сохранена, ссылка скопирована. Добавьте её в сторис как стикер-ссылку.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("Не удалось подготовить картинку. Попробуйте ещё раз.");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(url());
    setNote("Ссылка скопирована.");
  }

  const btn =
    "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-panel text-[13px] font-medium hover:border-mute/40";

  return (
    <section aria-label="Поделиться" className="space-y-2">
      <div className="flex gap-2">
        <button onClick={telegram} className={btn}>
          <Send size={15} aria-hidden /> Telegram
        </button>
        <button onClick={instagram} className={btn}>
          <Camera size={15} aria-hidden /> Сторис
        </button>
        <button onClick={copy} className={btn}>
          {note === "Ссылка скопирована." ? <Check size={15} aria-hidden /> : <Link2 size={15} aria-hidden />} Ссылка
        </button>
      </div>
      {note && <p className="text-[12px] text-mute" role="status">{note}</p>}
    </section>
  );
}
