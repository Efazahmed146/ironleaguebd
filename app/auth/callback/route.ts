import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Email-confirmation and Google sign-in land here, then we send the user to the Welcome screen. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // password-reset and account links go straight to their page; sign-ins land on Welcome
      const direct = safeNext === "/reset-password" || safeNext?.startsWith("/account");
      const to = direct ? safeNext! : safeNext ? `/welcome?next=${encodeURIComponent(safeNext)}` : "/welcome";
      return NextResponse.redirect(`${origin}${to}`);
    }
    // The confirmation itself already happened on Supabase's side. The code can't be turned into
    // a session when the link is opened in a different browser or app than the one that signed
    // up (e.g. the phone's mail app). The account IS confirmed, so just ask them to log in.
    const m = (error.message ?? "").toLowerCase();
    if (m.includes("verifier") || m.includes("flow state") || m.includes("pkce")) {
      return NextResponse.redirect(`${origin}/login?confirmed=1`);
    }
  }
  if (searchParams.get("error_code") === "otp_expired") {
    return NextResponse.redirect(`${origin}/login?error=expired`);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
