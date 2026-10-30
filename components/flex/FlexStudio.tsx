"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Copy, Download, Dumbbell, Send, Share2, UserPlus, X } from "lucide-react";
import type { Lifter, Metric } from "@/lib/types";
import { accountToLifter, useAccount, useIsClient } from "@/lib/account";
import { metricDots, metricKg, relativeStrength } from "@/lib/scoring";
import { getClubBadge } from "@/lib/badges";
import { DEFAULT_FILTERS, buildLeaderboard } from "@/lib/leaderboard";
import { canvasToBlob, CARD_H, CARD_W, drawFlexCard, type CardTheme } from "@/lib/flexcard";
import { formatKg } from "@/lib/format";
import { Segmented } from "@/components/ui/Segmented";

const METRICS: Metric[] = ["total", "squat", "bench", "deadlift"];
const METRIC_LABEL: Record<Metric, string> = {
  total: "Total",
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
};

export function FlexStudio({ lifters }: { lifters: Lifter[] }) {
  const ready = useIsClient();
  const account = useAccount();
  const me = useMemo(() => accountToLifter(account), [account]);

  if (!ready) return <div className="panel h-96 animate-pulse-glow" aria-hidden />;

  if (!me) {
    return (
      <Gate
        icon={<UserPlus className="h-10 w-10 text-volt-400" />}
        title="Join the league first"
        text="Create your profile and add a photo — it goes on your card."
        href="/join"
        cta="Create your profile"
      />
    );
  }

  const hasAny = METRICS.some((m) => metricKg(me, m) > 0);
  if (!hasAny) {
    return (
      <Gate
        icon={<Dumbbell className="h-10 w-10 text-volt-400" />}
        title="Land a Good Lift to unlock your card"
        text="Your Flex Card uses lifts a moderator has judged a Good Lift."
        href="/compete/attempts"
        cta="Go to my attempts"
      />
    );
  }

  return <Studio me={me} lifters={lifters} />;
}

function Gate({
  icon,
  title,
  text,
  href,
  cta,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
      {icon}
      <p className="font-display text-3xl font-black uppercase">{title}</p>
      <p className="max-w-sm text-sm text-iron-400">{text}</p>
      <Link href={href} className="btn-volt">
        {cta}
      </Link>
    </div>
  );
}

function Studio({ me, lifters }: { me: Lifter; lifters: Lifter[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const available = METRICS.filter((m) => metricKg(me, m) > 0);
  const [metric, setMetric] = useState<Metric>(available[0]!);
  const [theme, setTheme] = useState<CardTheme>("volt");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  // Phones: a downloaded file lands in Downloads, not the gallery. So we show the card here and
  // let the person save it to Photos (Share sheet, or long-press the image).
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);

  const kg = metricKg(me, metric) > 0 ? metricKg(me, metric) : metricKg(me, available[0]!);
  const activeMetric = metricKg(me, metric) > 0 ? metric : available[0]!;

  const { rank, rankOf } = useMemo(() => {
    const board = buildLeaderboard([...lifters, me], {
      ...DEFAULT_FILTERS,
      metric: activeMetric,
      mode: "pound-for-pound",
    });
    const mine = board.find((r) => r.lifter.isYou);
    return { rank: mine?.rank ?? null, rankOf: board.length };
  }, [lifters, me, activeMetric]);

  const badge = getClubBadge(activeMetric, kg);
  const dots = metricDots(me, activeMetric);

  const cardData = useMemo(
    () => ({
      name: me.name,
      homeGym: me.homeGym,
      area: me.district || me.area || "",
      metric: activeMetric,
      kg,
      bodyweightKg: me.bodyweightKg,
      dots,
      ratio: relativeStrength(kg, me.bodyweightKg),
      rank,
      rankOf,
      badgeLabel: badge?.label ?? null,
      verified: me.verified,
      avatarUrl: me.avatarUrl,
      theme,
    }),
    [me, activeMetric, kg, dots, rank, rankOf, badge?.label, theme],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stale = false;
    drawFlexCard(canvas, cardData, () => stale).catch(() => {});
    return () => {
      stale = true;
    };
  }, [cardData]);

  const label = METRIC_LABEL[activeMetric].toLowerCase();
  const caption =
    `Just hit a ${formatKg(kg)}kg ${activeMetric === "total" ? "total" : label} at ${formatKg(me.bodyweightKg)}kg bodyweight 🔥` +
    (badge ? ` ${badge.label} unlocked.` : "") +
    (rank ? ` Ranked #${rank} on IronLeague BD.` : "") +
    ` #IronLeagueBD #Powerlifting #Bangladesh`;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  async function getBlob() {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Card not ready");
    return canvasToBlob(canvas);
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironleague-${activeMetric}-${formatKg(kg)}kg.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function closePreview() {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p.url);
      return null;
    });
  }

  /** Opens the phone's share sheet with the image (it has "Save image" / "Save to Photos"). */
  async function shareFile(blob: Blob): Promise<boolean> {
    const file = new File([blob], `ironleague-${activeMetric}-${formatKg(kg)}kg.png`, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "IronLeague BD" });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return true; // closed the sheet
      }
    }
    return false;
  }

  async function onDownload() {
    setBusy(true);
    setNotice("");
    try {
      const blob = await getBlob();
      const phone = window.matchMedia?.("(pointer: coarse)").matches;
      if (phone) {
        setPreview({ url: URL.createObjectURL(blob), blob });
        return;
      }
      download(blob);
      setNotice("Downloaded to your Downloads folder. Upload it to your Instagram / Facebook story.");
    } catch {
      setNotice("Couldn't create the image. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    setNotice("");
    try {
      const blob = await getBlob();
      const file = new File([blob], "ironleague-pr.png", { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "IronLeague BD", text: caption });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return; // user closed the sheet
        }
      }
      if (window.matchMedia?.("(pointer: coarse)").matches) {
        setPreview({ url: URL.createObjectURL(blob), blob });
        return;
      }
      download(blob);
      setNotice("Direct sharing isn't supported here, so the card was downloaded. Add it to your Instagram or Facebook story from your Downloads.");
    } catch {
      setNotice("Couldn't create the image. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Couldn't copy automatically — select and copy the caption below.");
    }
  }

  const enc = encodeURIComponent;
  const socials = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${caption} ${siteUrl}`)}` },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(siteUrl)}&quote=${enc(caption)}`,
    },
    { name: "X", href: `https://twitter.com/intent/tweet?text=${enc(caption)}&url=${enc(siteUrl)}` },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(siteUrl)}&text=${enc(caption)}` },
  ];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
      {/* Card preview */}
      <div className="mx-auto w-full max-w-[22rem]">
        <canvas
          ref={canvasRef}
          width={CARD_W}
          height={CARD_H}
          aria-label="Your Flex Card preview"
          className={`h-auto w-full rounded-2xl bg-iron-900 ring-1 ring-iron-700 ${
            theme === "volt" ? "shadow-glow-volt" : "shadow-glow-blood"
          }`}
          style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
        />
      </div>

      {/* Controls */}
      <div className="panel space-y-6 p-5 sm:p-7">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">
            Feature this lift
          </p>
          <div className="grid grid-cols-4 gap-2">
            {METRICS.map((m) => {
              const has = metricKg(me, m) > 0;
              const active = activeMetric === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!has}
                  onClick={() => setMetric(m)}
                  className={`rounded-lg px-2 py-3 font-display text-base font-extrabold uppercase tracking-wide ring-1 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                    active
                      ? "bg-volt-400 text-iron-950 ring-volt-400"
                      : "text-iron-300 ring-iron-700 hover:text-iron-50 hover:ring-iron-500"
                  }`}
                >
                  {METRIC_LABEL[m]}
                  {has && (
                    <span className="block text-xs font-bold tabular-nums opacity-70">
                      {formatKg(metricKg(me, m))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Segmented<CardTheme>
          label="Card style"
          value={theme}
          onChange={setTheme}
          options={[
            { id: "volt", label: "Volt (lime)" },
            { id: "blood", label: "Blood (crimson)" },
          ]}
        />

        <div className="space-y-3">
          <button type="button" onClick={onShare} disabled={busy} className="btn-volt w-full">
            <Share2 className="h-5 w-5" /> Share to Instagram, WhatsApp &amp; more
          </button>
          <button type="button" onClick={onDownload} disabled={busy} className="btn-ghost w-full">
            <Download className="h-5 w-5" /> Save image (1080×1920)
          </button>
          {notice && (
            <p role="status" className="rounded-lg bg-iron-950 p-3 text-sm text-iron-300 ring-1 ring-iron-800">
              {notice}
            </p>
          )}
          {preview && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Save your Flex Card"
              data-theme="dark"
              className="fixed inset-0 z-[95] flex flex-col items-center gap-3 overflow-y-auto bg-black/90 p-4"
            >
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close"
                className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-iron-800 text-iron-100"
              >
                <X className="h-5 w-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="Your Flex Card" className="max-h-[62vh] w-auto max-w-full rounded-xl ring-1 ring-iron-700" />
              <p className="max-w-sm text-center text-sm text-iron-200">
                To save it to your <b>gallery</b>: tap <b>Save to Photos / Share</b> and choose <i>Save image</i>, or{" "}
                <b>press and hold the card</b> and choose <i>Save image</i> / <i>Add to Photos</i>.
              </p>
              <div className="flex w-full max-w-sm flex-col gap-2 pb-4">
                <button
                  type="button"
                  className="btn-volt w-full justify-center"
                  onClick={async () => {
                    const ok = await shareFile(preview.blob);
                    if (!ok) setNotice("Your browser can't open the share sheet. Press and hold the card to save it.");
                  }}
                >
                  <Share2 className="h-5 w-5" /> Save to Photos / Share
                </button>
                <button
                  type="button"
                  className="btn-ghost w-full justify-center"
                  onClick={() => {
                    download(preview.blob);
                    setNotice("Saved as a file in your Downloads folder (not the gallery).");
                  }}
                >
                  <Download className="h-5 w-5" /> Download file instead
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">
            Post a link + caption
          </p>
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost !px-4 !py-2 text-sm"
              >
                <Send className="h-4 w-4" /> {s.name}
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-iron-500">
            These share your caption and a link. To attach the card image, use the Share button
            above on your phone, or download it first.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Caption</p>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-volt-400 transition hover:text-volt-300"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="rounded-lg bg-iron-950 p-3 text-sm text-iron-300 ring-1 ring-iron-800">
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}
