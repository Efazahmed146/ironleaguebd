import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that need a signed-in user. Everything else (home, leaderboard, rules) stays public. */
const PROTECTED = ["/athlete", "/messages", "/network", "/welcome", "/subscribe", "/join", "/compete", "/flex", "/admin/subscriptions", "/account"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response; // not configured: don't lock the app

  // Only pages that need a login (and /login itself) ask Supabase who you are. Checking on
  // every request, including the public pages, added a network round trip to every click.
  const path = request.nextUrl.pathname;
  const needsLogin = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (!needsLogin && path !== "/login") return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() re-validates the token with Supabase (don't trust getSession() on the server).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && needsLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  if (user && path === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/welcome";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}
