import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseBrowser() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true } },
    );
  }
  return client;
}

/** Возвращает сессию; если её нет — создаёт анонимного пользователя Supabase. */
export async function ensureSession() {
  const sb = supabaseBrowser();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error || !anon.session) throw new Error("Не удалось начать сессию. Обновите страницу и попробуйте снова.");
  return anon.session;
}

/** Текущая сессия без создания новой. */
export async function currentSession() {
  const { data } = await supabaseBrowser().auth.getSession();
  return data.session;
}
