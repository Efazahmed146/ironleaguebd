import { supabase } from "./supabase/client";

/**
 * DEMO ONLY: gives the signed-in user a 30-day Pro subscription without a payment.
 * The database function refuses unless app_settings.demo_mode = 'on' (see supabase/setup.sql),
 * so nobody can use this on a live project once you switch demo mode off.
 * Returns an error message, or null on success.
 */
export async function activateDemoPro(): Promise<string | null> {
  const { error } = await supabase().rpc("activate_demo_subscription");
  if (!error) return null;
  if (error.message.includes("Demo mode is off")) return "Demo mode is switched off on the server.";
  if (error.code === "PGRST202" || error.message.includes("Could not find")) {
    return "Run the latest supabase/setup.sql first (it adds the demo function).";
  }
  return error.message;
}
