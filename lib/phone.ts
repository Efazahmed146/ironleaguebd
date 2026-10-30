/**
 * Bangladeshi mobile numbers. Accepts what people actually type:
 * 01712345678, 017-1234 5678, +8801712345678, 8801712345678.
 * Returns the international form "+8801712345678", or null when it isn't a valid BD mobile.
 * (Operators use 013–019 after the leading 0.)
 */
export function normalizeBdPhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("880")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^1[3-9]\d{8}$/.test(d) ? `+880${d}` : null;
}

/** "+8801712345678" -> "01712-345678" for display. */
export function formatBdPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const local = e164.replace(/^\+?880/, "0");
  return /^01\d{9}$/.test(local) ? `${local.slice(0, 5)}-${local.slice(5)}` : e164;
}
