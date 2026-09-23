// Без иконок и React — используется и в edge-роутах (OG-картинки), и в API.
import type { Category, Status } from "./types";

export const CATEGORY_LABELS: Record<Category, { label: string; short: string }> = {
  logistics: { label: "Логистика и очереди", short: "Очереди" },
  seating: { label: "Нехватка мест", short: "Места" },
  security: { label: "Кибербезопасность и хаос", short: "Хаос" },
  negligence: { label: "Халатность организаторов", short: "Халатность" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as Category[];
export const isCategory = (v: unknown): v is Category =>
  typeof v === "string" && (CATEGORY_KEYS as string[]).includes(v);

export const STATUS_LABELS: Record<Status, { label: string; hex: string }> = {
  collecting: { label: "Сбор подписей", hex: "#F2B63D" },
  sent: { label: "Отправлено организаторам", hex: "#7FB0FF" },
  ignored: { label: "Игнорируется", hex: "#F07470" },
};

export function plural(n: number, [one, few, many]: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const signaturesWord = (n: number) => plural(n, ["подпись", "подписи", "подписей"]);

export const formatCount = (n: number) => n.toLocaleString("ru-RU");

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
