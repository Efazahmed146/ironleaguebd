import { formatKg } from "./format";
import {
  drawText,
  fit,
  loadDisplayFamily,
  measure,
  rgba,
  roundRect,
} from "./flexcard";

export const CERT_W = 1754;
export const CERT_H = 1240;

export interface CertificateData {
  name: string;
  district: string;
  gym: string;
  meetName: string;
  /** e.g. "Men −83 kg · Intermediate · Open (24–39)" */
  category: string;
  squatKg: number;
  benchKg: number;
  deadliftKg: number;
  totalKg: number;
  dots: number;
  overallRank: number | null;
  overallOf: number | null;
  categoryRank: number | null;
  categoryOf: number | null;
  districtRank: number | null;
  districtOf: number | null;
  dateLabel: string;
  certId: string;
  /** False while the meet is still open. */
  final: boolean;
}

const ACCENT = "#a3e635";

export async function drawCertificate(
  canvas: HTMLCanvasElement,
  d: CertificateData,
  isStale: () => boolean = () => false,
): Promise<void> {
  const family = await loadDisplayFamily();
  if (isStale()) return;

  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = CERT_W;
  const H = CERT_H;
  const cx = W / 2;

  // Background
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(cx, 0, 0, cx, 0, 900);
  glow.addColorStop(0, rgba(ACCENT, 0.2));
  glow.addColorStop(1, rgba(ACCENT, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const red = ctx.createRadialGradient(W, H, 0, W, H, 700);
  red.addColorStop(0, "rgba(220,20,60,0.18)");
  red.addColorStop(1, "rgba(220,20,60,0)");
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, W, H);

  // Grid texture
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Frame
  ctx.lineWidth = 5;
  ctx.strokeStyle = ACCENT;
  roundRect(ctx, 36, 36, W - 72, H - 72, 18);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, 56, 56, W - 112, H - 112, 10);
  ctx.stroke();

  // Provisional watermark
  if (!d.final) {
    ctx.save();
    ctx.translate(cx, H / 2 + 40);
    ctx.rotate(-0.22);
    drawText(ctx, family, "PROVISIONAL", 0, 0, {
      size: 260,
      weight: 900,
      color: "rgba(255,255,255,0.045)",
      align: "center",
      spacing: 10,
    });
    ctx.restore();
  }

  // Logo
  const logoW =
    measure(ctx, family, "IRON", 54, 900, 3) + measure(ctx, family, "LEAGUE", 54, 900, 3) + 84;
  let lx = cx - logoW / 2;
  roundRect(ctx, lx, 96, 58, 58, 12);
  ctx.fillStyle = ACCENT;
  ctx.fill();
  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(lx + 10, 122, 38, 6);
  ctx.fillRect(lx + 11, 109, 7, 32);
  ctx.fillRect(lx + 40, 109, 7, 32);
  lx += 78;
  drawText(ctx, family, "IRON", lx, 142, { size: 54, weight: 900, color: "#fff", spacing: 3 });
  const ironW = measure(ctx, family, "IRON", 54, 900, 3);
  drawText(ctx, family, "LEAGUE", lx + ironW, 142, { size: 54, weight: 900, color: ACCENT, spacing: 3 });
  const lgW = measure(ctx, family, "LEAGUE", 54, 900, 3);
  roundRect(ctx, lx + ironW + lgW + 10, 104, 56, 38, 7);
  ctx.fillStyle = "#dc143c";
  ctx.fill();
  drawText(ctx, family, "BD", lx + ironW + lgW + 38, 133, { size: 28, weight: 900, color: "#fff", align: "center", spacing: 2 });

  // Title
  const titleSize = fit(ctx, family, "CERTIFICATE OF ACHIEVEMENT", 96, W - 260, 900, 8);
  drawText(ctx, family, "CERTIFICATE OF ACHIEVEMENT", cx, 270, {
    size: titleSize,
    weight: 900,
    color: "#fff",
    align: "center",
    spacing: 8,
  });
  drawText(ctx, family, "THIS CERTIFIES THAT", cx, 330, {
    size: 28,
    weight: 700,
    color: "rgba(255,255,255,0.55)",
    align: "center",
    spacing: 8,
  });

  // Name
  const nameStr = d.name.toUpperCase();
  const nameSize = fit(ctx, family, nameStr, 150, 1300, 900);
  drawText(ctx, family, nameStr, cx, 330 + 40 + nameSize * 0.82, {
    size: nameSize,
    weight: 900,
    color: ACCENT,
    align: "center",
  });
  const nameBase = 330 + 40 + nameSize * 0.82;
  ctx.fillStyle = rgba(ACCENT, 0.6);
  ctx.fillRect(cx - 320, nameBase + 20, 640, 3);

  // Description
  const catSize = fit(ctx, family, d.category.toUpperCase(), 32, 1400, 700, 4);
  drawText(ctx, family, `COMPETED IN ${d.meetName.toUpperCase()}`, cx, nameBase + 74, {
    size: 30,
    weight: 700,
    color: "rgba(255,255,255,0.7)",
    align: "center",
    spacing: 4,
  });
  drawText(ctx, family, d.category.toUpperCase(), cx, nameBase + 118, {
    size: catSize,
    weight: 700,
    color: "rgba(255,255,255,0.5)",
    align: "center",
    spacing: 4,
  });

  // Lift boxes
  const boxes: [string, string, boolean][] = [
    ["SQUAT", formatKg(d.squatKg), false],
    ["BENCH PRESS", formatKg(d.benchKg), false],
    ["DEADLIFT", formatKg(d.deadliftKg), false],
    ["TOTAL", formatKg(d.totalKg), true],
  ];
  const bw = 370;
  const gap = 28;
  const startX = (W - (bw * 4 + gap * 3)) / 2;
  const by = nameBase + 160;
  const bh = 200;
  boxes.forEach(([label, val, hi], i) => {
    const x = startX + i * (bw + gap);
    roundRect(ctx, x, by, bw, bh, 20);
    ctx.fillStyle = hi ? rgba(ACCENT, 0.12) : "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.lineWidth = hi ? 3 : 2;
    ctx.strokeStyle = hi ? ACCENT : "rgba(255,255,255,0.14)";
    ctx.stroke();
    drawText(ctx, family, label, x + bw / 2, by + 52, {
      size: 26,
      weight: 700,
      color: "rgba(255,255,255,0.55)",
      align: "center",
      spacing: 6,
    });
    const vs = fit(ctx, family, val, 112, bw - 150, 900);
    const vw = measure(ctx, family, val, vs, 900);
    const total = vw + 14 + measure(ctx, family, "KG", 38, 800, 2);
    drawText(ctx, family, val, x + bw / 2 - total / 2, by + 158, {
      size: vs,
      weight: 900,
      color: hi ? ACCENT : "#fff",
    });
    drawText(ctx, family, "KG", x + bw / 2 - total / 2 + vw + 14, by + 158, {
      size: 38,
      weight: 800,
      color: "rgba(255,255,255,0.55)",
      spacing: 2,
    });
  });

  // Score + ranks
  const ry = by + bh + 70;
  const ranks: [string, string, string][] = [
    ["DOTS SCORE", d.dots.toFixed(1), ""],
    ["OVERALL RANK", d.overallRank ? `#${d.overallRank}` : "—", d.overallOf ? `OF ${d.overallOf}` : ""],
    ["CATEGORY RANK", d.categoryRank ? `#${d.categoryRank}` : "—", d.categoryOf ? `OF ${d.categoryOf}` : ""],
    [`${d.district.toUpperCase()} RANK`, d.districtRank ? `#${d.districtRank}` : "—", d.districtOf ? `OF ${d.districtOf}` : ""],
  ];
  ranks.forEach(([label, val, sub], i) => {
    const x = startX + i * (bw + gap) + bw / 2;
    const ls = fit(ctx, family, label, 24, bw - 20, 700, 4);
    drawText(ctx, family, label, x, ry, {
      size: ls,
      weight: 700,
      color: "rgba(255,255,255,0.5)",
      align: "center",
      spacing: 4,
    });
    drawText(ctx, family, sub ? `${val}  ${sub}` : val, x, ry + 62, {
      size: 60,
      weight: 900,
      color: i === 0 ? ACCENT : "#fff",
      align: "center",
    });
  });

  // Footer: date, signature, ID
  const fy = H - 120;
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(130, fy - 8, 340, 2);
  ctx.fillRect(W - 470, fy - 8, 340, 2);
  drawText(ctx, family, d.dateLabel.toUpperCase(), 300, fy + 30, {
    size: 24,
    weight: 700,
    color: "rgba(255,255,255,0.55)",
    align: "center",
    spacing: 4,
  });
  drawText(ctx, family, "COMPETITION COMMITTEE", W - 300, fy + 30, {
    size: 24,
    weight: 700,
    color: "rgba(255,255,255,0.55)",
    align: "center",
    spacing: 4,
  });
  drawText(ctx, family, `CERTIFICATE ID ${d.certId}${d.final ? "" : " · PROVISIONAL"}`, cx, fy + 30, {
    size: 20,
    weight: 700,
    color: "rgba(255,255,255,0.4)",
    align: "center",
    spacing: 4,
  });
}

/** Short deterministic ID from name + registration time. */
export function makeCertId(name: string, registeredAt: string): string {
  let h = 2166136261;
  const s = `${name}|${registeredAt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ILBD-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}
