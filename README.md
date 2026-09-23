# Протокол

PWA для коллективных петиций участников против организаторов мероприятий и хакатонов.
Next.js 15 (App Router), Tailwind CSS, Supabase, OpenAI.

## Запуск

1. Создайте проект в Supabase.
2. SQL Editor → выполните `supabase/schema.sql`, затем по желанию `supabase/seed.sql`.
3. Authentication → Providers → включите **Anonymous sign-ins** (так каждый голос привязан к `user_id` без регистрации).
4. `cp .env.example .env.local` и заполните ключи.
5. `npm install && npm run dev`

Деплой: Vercel, те же переменные окружения. Service worker регистрируется только в production-сборке.

## Структура

```
app/
  page.tsx               лента: поиск, категории, счётчики в реальном времени
  new/page.tsx           форма создания + AI-переработка
  p/[id]/page.tsx        петиция: текст, подтверждённый опыт, шеринг, подпись
  api/refine             OpenAI → официальная претензия (JSON: title, text)
  api/sign               подпись: проверка JWT, лимит по IP, unique(user)
  api/og/[id]            превью 1200×630 для Telegram, ?format=story — 1080×1920 для сторис
  manifest.ts            PWA-манифест
components/              UI
lib/                     клиенты Supabase, подписи категорий, утилиты
supabase/schema.sql      таблицы, RLS, триггеры, RPC create_petition, realtime
public/sw.js             офлайн-оболочка и кэш статики
```

## Как устроена защита от накруток

- `signatures` имеет `unique (petition_id, user_id)` — повторный голос отсекает база.
- Вставка в `signatures` закрыта RLS; писать может только `/api/sign` через service role.
- `votes_count` меняется только триггером, клиент не может его обновить.
- С одного IP допускается `SIGN_MAX_PER_IP` подписей под петицией (по умолчанию 5). Жёстко «один IP — один голос» ставить не стоит: на площадке все сидят в одной Wi-Fi сети. IP хранится только как солёный sha256.
- Слабое место: анонимную сессию можно сбросить, очистив браузер. Для серьёзных кампаний включите CAPTCHA (Supabase Auth → Bot and Abuse Protection, Cloudflare Turnstile) или вход через Telegram/почту.

## Модерация

Статус петиции (`collecting` → `sent` / `ignored`) и флаг `attendance_verified` меняются в Table Editor или через service role — у пользователей прав на это нет. Рейтинг организатора пересчитывается триггером автоматически.

AI-модуль проинструктирован не добавлять фактов и помечать пробелы как `[уточнить]`: публичные обвинения против конкретной организации должны опираться только на то, что автор видел сам.
