/** 100 → "100", 62.5 → "62.5" */
export const formatKg = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

export const formatScore = (n: number) => n.toFixed(1);

export const formatRatio = (n: number) => `${n.toFixed(2)}×`;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
