import { supabase, supabaseConfigured } from "./supabase/client";

/**
 * Best-effort upload of a recorded lift to the private "lifts" bucket
 * (path: <user id>/<video id>). Storage rules allow only the owner, and only while Pro.
 * Returns false when not signed in / offline / not Pro; the clip stays on the device either way.
 */
export async function uploadLiftVideo(videoId: string, blob: Blob): Promise<boolean> {
  if (!supabaseConfigured) return false;
  try {
    const sb = supabase();
    const { data } = await sb.auth.getUser();
    if (!data.user) return false;
    const { error } = await sb.storage.from("lifts").upload(`${data.user.id}/${videoId}`, blob, {
      contentType: blob.type || "video/webm",
      upsert: true,
    });
    return !error;
  } catch {
    return false;
  }
}
