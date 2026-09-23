import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="font-display text-[20px] font-bold">Петиция не найдена</h1>
      <p className="mt-2 text-[14px] text-mute">Возможно, ссылка устарела или петицию удалил модератор.</p>
      <Link href="/" className="mt-5 inline-flex h-9 items-center rounded-md bg-tape px-4 text-[13px] font-semibold text-ink">
        К списку петиций
      </Link>
    </div>
  );
}
