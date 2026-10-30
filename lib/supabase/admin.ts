import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the SERVICE ROLE (secret) key. It bypasses Row Level Security, so it
 * may only be used inside Route Handlers / server code, e.g. to mark an entry fee as paid.
 * Never import this from a "use client" file. The key must NOT start with NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
