import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { clientIp, hashIp, rateLimit } from "@/lib/ip";
import { UUID_RE } from "@/lib/labels";

export const runtime = "nodejs";

const MAX_PER_IP = Number(process.env.SIGN_MAX_PER_IP ?? 5);

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Нужна сессия." }, { status: 401 });

  const { petitionId } = (await req.json().catch(() => ({}))) as { petitionId?: string };
  if (!petitionId || !UUID_RE.test(petitionId)) {
    return NextResponse.json({ error: "Петиция не найдена." }, { status: 400 });
  }

  const ip = clientIp(req.headers);
  if (!rateLimit(`sign:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Слишком много попыток. Подождите минуту." }, { status: 429 });
  }

  const admin = supabaseAdmin();

  // 1. Проверяем JWT пользователя (в т.ч. анонимного)
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth.user) return NextResponse.json({ error: "Сессия истекла. Обновите страницу." }, { status: 401 });

  // 2. Петиция существует
  const { data: petition } = await admin.from("petitions").select("id").eq("id", petitionId).maybeSingle();
  if (!petition) return NextResponse.json({ error: "Петиция не найдена." }, { status: 404 });

  // 3. Лимит подписей с одного IP (мягкий: общая Wi-Fi на площадке — норма)
  const ipHash = hashIp(ip);
  const { count } = await admin
    .from("signatures")
    .select("id", { count: "exact", head: true })
    .eq("petition_id", petitionId)
    .eq("ip_hash", ipHash);
  if ((count ?? 0) >= MAX_PER_IP) {
    return NextResponse.json(
      { error: "С этой сети уже подписали максимальное число раз. Попробуйте с мобильного интернета." },
      { status: 429 },
    );
  }

  // 4. Подпись; unique(petition_id, user_id) не даст проголосовать дважды
  const { error } = await admin
    .from("signatures")
    .insert({ petition_id: petitionId, user_id: auth.user.id, ip_hash: ipHash });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Вы уже подписали эту петицию.", signed: true }, { status: 409 });
    console.error("sign failed", error);
    return NextResponse.json({ error: "Не удалось сохранить подпись." }, { status: 500 });
  }

  const { data: fresh } = await admin.from("petitions").select("votes_count").eq("id", petitionId).single();
  return NextResponse.json({ ok: true, votes_count: fresh?.votes_count ?? null });
}
