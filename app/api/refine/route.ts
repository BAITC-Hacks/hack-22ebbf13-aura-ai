import OpenAI from "openai";
import { NextResponse } from "next/server";
import { CATEGORY_LABELS, isCategory } from "@/lib/labels";
import { clientIp, rateLimit } from "@/lib/ip";

export const runtime = "nodejs";

const SYSTEM = `Ты — редактор с юридической подготовкой. Ты помогаешь участникам мероприятий и хакатонов превращать личный эмоциональный рассказ в официальную коллективную претензию для организаторов, спонсоров и СМИ.

Правила:
- Используй только факты из рассказа. Не выдумывай цифры, даты, имена, число пострадавших и цитаты. Если данных не хватает, вставь пометку [уточнить: что именно].
- Убери оскорбления, сарказм и эмоциональные оценки. Действия организаторов описывай как наблюдаемые факты («участники ожидали на входе около часа»), без обвинений в умысле.
- Не утверждай, что нарушен конкретный закон, если это прямо не следует из фактов. Допустимо: «обстоятельства могут свидетельствовать о несоблюдении заявленных условий участия / требований безопасности / обязательств перед спонсорами».
- Официально-деловой русский язык, короткие абзацы, без канцелярского перегруза.

Структура текста:
1. Суть претензии — 2–3 предложения.
2. Обстоятельства — хронология событий.
3. Выявленные нарушения — перечень конкретных проблем, каждая с новой строки через «— ».
4. Последствия для участников.
5. Требования — конкретные и проверяемые шаги (публичный ответ, компенсация, изменения регламента входа и т. п.).

Ответь строго JSON-объектом: {"title": "заголовок петиции до 120 символов, нейтральный", "text": "полный текст претензии с заголовками разделов"}`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI-модуль не настроен: добавьте OPENAI_API_KEY." }, { status: 503 });
  }
  if (!rateLimit(`refine:${clientIp(req.headers)}`, 6, 10 * 60_000)) {
    return NextResponse.json({ error: "Слишком много запросов. Подождите 10 минут." }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const body = String(payload.body ?? "").trim();
  const eventName = String(payload.eventName ?? "").trim().slice(0, 120);
  const organizer = String(payload.organizer ?? "").trim().slice(0, 120);
  const evidence = String(payload.evidenceUrl ?? "").trim().slice(0, 500);
  const category = isCategory(payload.category) ? CATEGORY_LABELS[payload.category].label : "не указана";

  if (body.length < 50 || body.length > 10000) {
    return NextResponse.json({ error: "Рассказ должен быть от 50 до 10 000 символов." }, { status: 400 });
  }

  const openai = new OpenAI();
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Мероприятие: ${eventName || "[не указано]"}
Организатор: ${organizer || "[не указан]"}
Категория нарушения: ${category}
Доказательства: ${evidence || "не приложены"}

Рассказ участника:
"""
${body}
"""`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { title?: string; text?: string };
    if (!parsed.text) throw new Error("empty");

    return NextResponse.json({
      title: (parsed.title ?? "").slice(0, 140),
      text: parsed.text.slice(0, 20000),
    });
  } catch (e) {
    console.error("refine failed", e);
    return NextResponse.json({ error: "Нейросеть не ответила. Попробуйте ещё раз." }, { status: 502 });
  }
}
