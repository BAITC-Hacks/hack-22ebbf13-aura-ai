"use client";

import { useState } from "react";

export function PetitionText({ refined, original }: { refined: string | null; original: string }) {
  const [tab, setTab] = useState<"refined" | "original">(refined ? "refined" : "original");
  const tabs = [
    ...(refined ? [{ key: "refined" as const, label: "Официальная претензия" }] : []),
    { key: "original" as const, label: "Рассказ автора" },
  ];

  return (
    <section className="rounded-lg border border-line bg-panel">
      <div role="tablist" className="flex border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium ${
              tab === t.key ? "border-tape text-fg" : "border-transparent text-mute hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="whitespace-pre-line p-3 text-[15px] leading-relaxed text-fg/90">
        {tab === "refined" && refined ? refined : original}
      </div>
    </section>
  );
}
