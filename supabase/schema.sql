-- ============================================================
-- Протокол: схема БД. Выполните целиком в Supabase → SQL Editor.
-- Также включите Authentication → Providers → Anonymous sign-ins.
-- ============================================================

create extension if not exists pgcrypto;

do $$ begin
  create type petition_category as enum ('logistics', 'seating', 'security', 'negligence');
exception when duplicate_object then null; end $$;

do $$ begin
  create type petition_status as enum ('collecting', 'sent', 'ignored');
exception when duplicate_object then null; end $$;

-- ---------- organizers ----------
create table if not exists public.organizers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 2 and 120),
  rating     numeric(2,1) not null default 5.0 check (rating between 0 and 5),
  created_at timestamptz not null default now()
);
create unique index if not exists organizers_name_lower_uniq on public.organizers (lower(trim(name)));

-- ---------- petitions ----------
create table if not exists public.petitions (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null check (char_length(title) between 5 and 140),
  event_name          text not null check (char_length(event_name) between 2 and 120),
  organizer_id        uuid not null references public.organizers(id) on delete restrict,
  body                text not null check (char_length(body) between 50 and 10000),
  body_ai_refined     text check (body_ai_refined is null or char_length(body_ai_refined) <= 20000),
  votes_count         integer not null default 0 check (votes_count >= 0),
  category            petition_category not null,
  status              petition_status not null default 'collecting',
  created_at          timestamptz not null default now(),
  -- расширения к базовой схеме
  evidence_url        text check (evidence_url is null or evidence_url ~* '^https?://'),
  author_id           uuid references auth.users(id) on delete set null,
  author_attended     boolean not null default false, -- автор заявил, что был на месте
  attendance_verified boolean not null default false  -- модератор проверил (бейдж, билет, фото)
);
create index if not exists petitions_feed_idx on public.petitions (votes_count desc, created_at desc);
create index if not exists petitions_category_idx on public.petitions (category);
create index if not exists petitions_organizer_idx on public.petitions (organizer_id);
create index if not exists petitions_author_idx on public.petitions (author_id, created_at desc);

-- ---------- signatures ----------
create table if not exists public.signatures (
  id          uuid primary key default gen_random_uuid(),
  petition_id uuid not null references public.petitions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ip_hash     text not null,                 -- sha256(ip + соль), сам IP не храним
  created_at  timestamptz not null default now(),
  unique (petition_id, user_id)              -- один голос на пользователя
);
create index if not exists signatures_ip_idx on public.signatures (petition_id, ip_hash);

-- ============================================================
-- Триггеры
-- ============================================================

-- Счётчик голосов: меняется только триггером, клиент его не трогает
create or replace function public.sync_votes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update petitions set votes_count = votes_count + 1 where id = new.petition_id;
  elsif tg_op = 'DELETE' then
    update petitions set votes_count = greatest(votes_count - 1, 0) where id = old.petition_id;
  end if;
  return null;
end $$;

drop trigger if exists signatures_votes_count on public.signatures;
create trigger signatures_votes_count
after insert or delete on public.signatures
for each row execute function public.sync_votes_count();

-- Рейтинг организатора: 5 баллов минус штрафы за жалобы и игнор
create or replace function public.recalc_organizer_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid := coalesce(new.organizer_id, old.organizer_id);
begin
  update organizers o set rating = greatest(0, round(5
      - 0.3 * (select count(*) from petitions p where p.organizer_id = v_org)
      - 0.7 * (select count(*) from petitions p where p.organizer_id = v_org and p.status = 'ignored')
    , 1))
  where o.id = v_org;
  return null;
end $$;

drop trigger if exists petitions_rating on public.petitions;
create trigger petitions_rating
after insert or delete or update of status, organizer_id on public.petitions
for each row execute function public.recalc_organizer_rating();

-- ============================================================
-- RPC: создание петиции (находит или создаёт организатора)
-- ============================================================
create or replace function public.create_petition(
  p_title text,
  p_event_name text,
  p_organizer text,
  p_category petition_category,
  p_body text,
  p_body_ai_refined text default null,
  p_evidence_url text default null,
  p_author_attended boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  if (select count(*) from petitions
      where author_id = v_uid and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited';
  end if;

  select id into v_org from organizers where lower(trim(name)) = lower(trim(p_organizer));
  if v_org is null then
    insert into organizers (name) values (trim(p_organizer))
    on conflict do nothing
    returning id into v_org;
    if v_org is null then -- параллельная вставка
      select id into v_org from organizers where lower(trim(name)) = lower(trim(p_organizer));
    end if;
  end if;

  insert into petitions (title, event_name, organizer_id, body, body_ai_refined,
                         category, evidence_url, author_id, author_attended)
  values (trim(p_title), trim(p_event_name), v_org, trim(p_body), nullif(trim(p_body_ai_refined), ''),
          p_category, nullif(trim(p_evidence_url), ''), v_uid, coalesce(p_author_attended, false))
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.create_petition from public, anon;
grant execute on function public.create_petition to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.organizers enable row level security;
alter table public.petitions  enable row level security;
alter table public.signatures enable row level security;

drop policy if exists "organizers readable" on public.organizers;
create policy "organizers readable" on public.organizers for select using (true);

drop policy if exists "petitions readable" on public.petitions;
create policy "petitions readable" on public.petitions for select using (true);
-- insert только через create_petition, update статуса — только модератор (service role)

drop policy if exists "own signature readable" on public.signatures;
create policy "own signature readable" on public.signatures
  for select using (user_id = auth.uid());
-- insert только через /api/sign (service role + проверка IP)

-- Скрываем хэш IP даже от владельца строки
revoke select on public.signatures from anon, authenticated;
grant select (id, petition_id, user_id, created_at) on public.signatures to authenticated;

-- ============================================================
-- Realtime для счётчиков
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table public.petitions;
exception when duplicate_object then null; end $$;
