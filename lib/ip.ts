import { createHash } from "node:crypto";

export function clientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function hashIp(ip: string) {
  return createHash("sha256")
    .update(`${ip}:${process.env.IP_HASH_SALT ?? "dev-salt"}`)
    .digest("hex");
}

// Простой лимитер в памяти процесса. На serverless он сбрасывается между
// инстансами — для продакшена замените на Upstash Redis или таблицу в Supabase.
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
