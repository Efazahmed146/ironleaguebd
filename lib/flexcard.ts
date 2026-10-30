import type { Metric } from "./types";
import { formatKg } from "./format";

/** Instagram Story format. Keep key content between y=250 and y=1670 (safe zones). */
export const CARD_W = 1080;
export const CARD_H = 1920;

export type CardTheme = "volt" | "blood";

export interface FlexCardData {
  name: string;
  homeGym: string;
  area: string;
  metric: Metric;
  kg: number;
  bodyweightKg: number;
  dots: number;
  ratio: number;
  rank: number | null;
  rankOf: number | null;
  badgeLabel: string | null;
  verified: boolean;
  avatarUrl?: string;
  theme: CardTheme;
}

const THEME = {
  volt: { accent: "#a3e635", ink: "#0b0b0e" },
  blood: { accent: "#ff3355", ink: "#ffffff" },
} as const;

const METRIC_TITLE: Record<Metric, string> = {
  squat: "SQUAT",
  bench: "BENCH PRESS",
  deadlift: "DEADLIFT",
  total: "POWERLIFTING TOTAL",
};

export type Ctx = CanvasRenderingContext2D;

/* ---------- helpers ---------- */

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setSpacing(ctx: Ctx, px: number) {
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

interface TextOpts {
  size: number;
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
  spacing?: number;
}

export function drawText(ctx: Ctx, family: string, s: string, x: number, y: number, o: TextOpts) {
  ctx.font = `${o.weight ?? 800} ${o.size}px ${family}`;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align ?? "left";
  ctx.textBaseline = "alphabetic";
  setSpacing(ctx, o.spacing ?? 0);
  ctx.fillText(s, x, y);
  setSpacing(ctx, 0);
}

export function measure(ctx: Ctx, family: string, s: string, size: number, weight = 800, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`;
  setSpacing(ctx, spacing);
  const w = ctx.measureText(s).width;
  setSpacing(ctx, 0);
  return w;
}

/** Largest font size <= maxSize that fits maxWidth. */
export function fit(
  ctx: Ctx,
  family: string,
  s: string,
  maxSize: number,
  maxWidth: number,
  weight = 800,
  spacing = 0,
) {
  let size = maxSize;
  while (size > 20 && measure(ctx, family, s, size, weight, spacing) > maxWidth) size -= 2;
  return size;
}

function drawCover(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) * 0.2; // bias toward the top so faces stay in frame
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed"));
    img.src = src;
  });
}

/** Resolves the CSS font stack that next/font assigned to --font-display. */
export async function loadDisplayFamily(): Promise<string> {
  let stack = "";
  try {
    stack = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim();
  } catch {
    /* ignore */
  }
  const family = `${stack ? `${stack}, ` : ""}Impact, "Arial Narrow", sans-serif`;
  try {
    await Promise.all([
      document.fonts.load(`900 100px ${family}`),
      document.fonts.load(`700 100px ${family}`),
    ]);
  } catch {
    /* fall back to the stack as-is */
  }
  return family;
}

/* ---------- main draw ---------- */

export async function drawFlexCard(
  canvas: HTMLCanvasElement,
  d: FlexCardData,
  isStale: () => boolean = () => false,
): Promise<void> {
  const family = await loadDisplayFamily();
  const img = d.avatarUrl ? await loadImage(d.avatarUrl).catch(() => null) : null;
  if (isStale()) return;

  // Everything below is synchronous so concurrent draws can't interleave.
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = CARD_W;
  const H = CARD_H;
  const t = THEME[d.theme];
  const PHOTO_H = 1260;
  const PAD = 64;
  const CONTENT_W = W - PAD * 2;

  // Base
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, W, H);

  // Photo (or placeholder)
  if (img) {
    drawCover(ctx, img, 0, 0, W, PHOTO_H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, PHOTO_H);
    g.addColorStop(0, "#1f1f23");
    g.addColorStop(1, "#0b0b0e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, PHOTO_H);
    const ini = d.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("");
    drawText(ctx, family, ini, W / 2, 760, {
      size: 560,
      weight: 900,
      color: rgba(t.accent, 0.1),
      align: "center",
    });
  }

  // Fade photo into the dark lower half
  const fade = ctx.createLinearGradient(0, 520, 0, PHOTO_H);
  fade.addColorStop(0, "rgba(9,9,11,0)");
  fade.addColorStop(0.7, "rgba(9,9,11,0.93)");
  fade.addColorStop(1, "#09090b");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 520, W, PHOTO_H - 520);

  // Top vignette for the logo row
  const top = ctx.createLinearGradient(0, 0, 0, 480);
  top.addColorStop(0, "rgba(9,9,11,0.9)");
  top.addColorStop(1, "rgba(9,9,11,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 480);

  // Accent glow
  const glow = ctx.createRadialGradient(W * 0.1, H * 0.8, 0, W * 0.1, H * 0.8, 760);
  glow.addColorStop(0, rgba(t.accent, 0.24));
  glow.addColorStop(1, rgba(t.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Grid texture on the lower half
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 900);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 900; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Accent edge bar
  ctx.fillStyle = t.accent;
  ctx.fillRect(0, 740, 16, 930);

  /* ---- Logo row ---- */
  roundRect(ctx, PAD, 246, 84, 84, 18);
  ctx.fillStyle = t.accent;
  ctx.fill();
  ctx.fillStyle = t.ink; // dumbbell glyph
  ctx.fillRect(PAD + 14, 284, 56, 8);
  ctx.fillRect(PAD + 16, 266, 10, 44);
  ctx.fillRect(PAD + 58, 266, 10, 44);
  ctx.fillRect(PAD + 8, 276, 8, 24);
  ctx.fillRect(PAD + 68, 276, 8, 24);

  const logoX = PAD + 108;
  const ironW = measure(ctx, family, "IRON", 72, 900, 2);
  drawText(ctx, family, "IRON", logoX, 312, { size: 72, weight: 900, color: "#fff", spacing: 2 });
  drawText(ctx, family, "LEAGUE", logoX + ironW, 312, {
    size: 72,
    weight: 900,
    color: t.accent,
    spacing: 2,
  });
  const leagueW = measure(ctx, family, "LEAGUE", 72, 900, 2);
  const tagX = logoX + ironW + leagueW + 14;
  roundRect(ctx, tagX, 266, 72, 48, 8);
  ctx.fillStyle = "#dc143c";
  ctx.fill();
  drawText(ctx, family, "BD", tagX + 36, 303, { size: 34, weight: 900, color: "#fff", align: "center", spacing: 3 });

  drawText(ctx, family, "SEASON 01", W - PAD, 306, {
    size: 30,
    weight: 700,
    color: "rgba(255,255,255,0.6)",
    align: "right",
    spacing: 6,
  });

  /* ---- Pill + metric title ---- */
  const pillText = "PERSONAL RECORD";
  const pillW = measure(ctx, family, pillText, 32, 800, 6) + 60;
  roundRect(ctx, PAD, 736, pillW, 60, 30);
  ctx.fillStyle = t.accent;
  ctx.fill();
  drawText(ctx, family, pillText, PAD + 30, 778, { size: 32, weight: 800, color: t.ink, spacing: 6 });

  const title = METRIC_TITLE[d.metric];
  const titleSize = fit(ctx, family, title, 118, CONTENT_W, 900);
  drawText(ctx, family, title, PAD, 910, { size: titleSize, weight: 900, color: "#fff" });

  /* ---- Giant number ---- */
  const numStr = formatKg(d.kg);
  const kgW = measure(ctx, family, "KG", 110, 900, 2);
  const numSize = fit(ctx, family, numStr, 380, CONTENT_W - kgW - 28, 900);
  const numW = measure(ctx, family, numStr, numSize, 900);
  ctx.save();
  ctx.shadowColor = rgba(t.accent, 0.55);
  ctx.shadowBlur = 70;
  drawText(ctx, family, numStr, PAD, 1215, { size: numSize, weight: 900, color: "#fff" });
  ctx.restore();
  drawText(ctx, family, "KG", PAD + numW + 28, 1215, {
    size: 110,
    weight: 900,
    color: t.accent,
    spacing: 2,
  });

  /* ---- Badge ---- */
  const badgeText = (d.badgeLabel ?? `${d.ratio.toFixed(2)}× BODYWEIGHT`).toUpperCase();
  const badgeSize = fit(ctx, family, badgeText, 38, CONTENT_W - 64, 800, 5);
  const badgeW = measure(ctx, family, badgeText, badgeSize, 800, 5) + 64;
  roundRect(ctx, PAD, 1262, badgeW, 72, 14);
  ctx.fillStyle = rgba(t.accent, 0.14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = t.accent;
  ctx.stroke();
  drawText(ctx, family, badgeText, PAD + 32, 1262 + 48, {
    size: badgeSize,
    weight: 800,
    color: t.accent,
    spacing: 5,
  });

  /* ---- Name + gym ---- */
  const nameStr = d.name.toUpperCase();
  const nameMax = CONTENT_W - (d.verified ? 84 : 0);
  const nameSize = fit(ctx, family, nameStr, 96, nameMax, 900);
  const nameW = measure(ctx, family, nameStr, nameSize, 900);
  drawText(ctx, family, nameStr, PAD, 1440, { size: nameSize, weight: 900, color: "#fff" });

  if (d.verified) {
    const cx = PAD + nameW + 24 + 28;
    const cy = 1440 - nameSize * 0.36;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = t.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 1);
    ctx.lineTo(cx - 3, cy + 11);
    ctx.lineTo(cx + 14, cy - 9);
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = t.ink;
    ctx.stroke();
  }

  const gymStr = `${d.homeGym} · ${d.area}`.toUpperCase();
  const gymSize = fit(ctx, family, gymStr, 36, CONTENT_W, 600, 3);
  drawText(ctx, family, gymStr, PAD, 1496, {
    size: gymSize,
    weight: 600,
    color: "rgba(255,255,255,0.62)",
    spacing: 3,
  });

  /* ---- Stat boxes ---- */
  const gap = 24;
  const boxW = (CONTENT_W - gap * 2) / 3;
  const boxY = 1530;
  const boxH = 140;
  const stats: { label: string; value: string; unit: string; accent?: boolean }[] = [
    { label: "BODYWEIGHT", value: formatKg(d.bodyweightKg), unit: "KG" },
    { label: "DOTS SCORE", value: d.dots.toFixed(1), unit: "" },
    {
      label: "BD RANK",
      value: d.rank ? `#${d.rank}` : "—",
      unit: d.rankOf ? `OF ${d.rankOf}` : "",
      accent: true,
    },
  ];
  stats.forEach((s, i) => {
    const x = PAD + i * (boxW + gap);
    roundRect(ctx, x, boxY, boxW, boxH, 20);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.accent ? rgba(t.accent, 0.6) : "rgba(255,255,255,0.12)";
    ctx.stroke();

    drawText(ctx, family, s.label, x + 26, boxY + 42, {
      size: 24,
      weight: 700,
      color: "rgba(255,255,255,0.5)",
      spacing: 4,
    });
    const valColor = s.accent ? t.accent : "#fff";
    drawText(ctx, family, s.value, x + 26, boxY + 112, { size: 72, weight: 900, color: valColor });
    if (s.unit) {
      const vw = measure(ctx, family, s.value, 72, 900);
      drawText(ctx, family, s.unit, x + 26 + vw + 12, boxY + 112, {
        size: 28,
        weight: 800,
        color: "rgba(255,255,255,0.5)",
        spacing: 2,
      });
    }
  });

  /* ---- Footer ---- */
  drawText(ctx, family, "LIFT HEAVY · RANK FAIR · FLEX HARD", W / 2, 1796, {
    size: 30,
    weight: 700,
    color: "rgba(255,255,255,0.42)",
    align: "center",
    spacing: 7,
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create image"))), "image/png"),
  );
}
