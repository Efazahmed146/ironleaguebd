import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase browser client. The URL and the publishable (anon) key are meant to be public:
 * what protects your data is Row Level Security in supabase/setup.sql, not hiding the key.
 * NEVER put the service_role / secret key in this app.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!URL || !KEY) throw new Error("Supabase is not configured (see .env.example).");
  client ??= createBrowserClient(URL, KEY);
  return client;
}
