/**
 * Public https address of this site, used to build the callback URLs sent to SSLCommerz.
 * Set NEXT_PUBLIC_SITE_URL in production. Otherwise it's read from the request headers.
 */
export function siteUrl(req: { url: string; headers: { get(name: string): string | null } }, env = process.env): string {
  const fixed = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fixed) return fixed.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
    return `${proto.split(",")[0]!.trim()}://${host.split(",")[0]!.trim()}`;
  }
  return new URL(req.url).origin;
}
