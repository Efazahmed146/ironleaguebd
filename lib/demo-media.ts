/**
 * DEMO ONLY placeholders, used when a tester skips the camera (MEET.demoSkips).
 * They are clearly labelled so a moderator can never mistake them for a real lift.
 */

export function makeDemoPhoto(code: string): string {
  const c = document.createElement("canvas");
  c.width = 960;
  c.height = 540;
  const g = c.getContext("2d")!;
  g.fillStyle = "#18181b";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#a3e635";
  g.textAlign = "center";
  g.font = "bold 56px sans-serif";
  g.fillText("DEMO PHOTO", c.width / 2, 220);
  g.fillStyle = "#e4e4e7";
  g.font = "28px sans-serif";
  g.fillText("Camera skipped (demo mode)", c.width / 2, 280);
  g.fillText(`Code ${code} · ${new Date().toLocaleString("en-GB")}`, c.width / 2, 330);
  return c.toDataURL("image/jpeg", 0.8);
}

/** Records a ~3 s labelled clip from a canvas (needs no camera and works on plain http). */
export async function makeDemoClip(label: string): Promise<{ blob: Blob; durationSec: number }> {
  const SECONDS = 3.2;
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 360;
  const g = c.getContext("2d")!;
  const draw = (t: number) => {
    g.fillStyle = "#18181b";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#a3e635";
    g.textAlign = "center";
    g.font = "bold 44px sans-serif";
    g.fillText("DEMO CLIP", c.width / 2, 150);
    g.fillStyle = "#e4e4e7";
    g.font = "24px sans-serif";
    g.fillText(label, c.width / 2, 195);
    g.fillText("Camera skipped (demo mode)", c.width / 2, 235);
    g.fillStyle = "#a3e635";
    g.fillRect(40, 300, ((t % 1000) / 1000) * (c.width - 80), 8);
  };
  draw(0);

  const stream = c.captureStream?.(15);
  if (!stream || typeof MediaRecorder === "undefined") {
    // Very old browser: a tiny placeholder is enough for the demo flow.
    return { blob: new Blob([`DEMO CLIP: ${label}`], { type: "video/webm" }), durationSec: SECONDS };
  }
  const mime = ["video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  const t0 = performance.now();
  rec.start(500);
  const tick = setInterval(() => draw(performance.now() - t0), 66);
  await new Promise((r) => setTimeout(r, SECONDS * 1000));
  clearInterval(tick);
  rec.stop();
  await done;
  return { blob: new Blob(chunks, { type: rec.mimeType || "video/webm" }), durationSec: SECONDS };
}
