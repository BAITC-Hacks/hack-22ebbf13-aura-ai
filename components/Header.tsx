import Link from "next/link";
import { Plus } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-3">
        <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-tape text-[13px] text-ink">П</span>
          Протокол
        </Link>
        <Link
          href="/new"
          className="inline-flex h-8 items-center gap-1 rounded-md bg-tape px-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-tape/90"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          Новая петиция
        </Link>
      </div>
    </header>
  );
}
