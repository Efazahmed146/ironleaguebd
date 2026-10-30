"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Award, Download, Medal } from "lucide-react";
import type { Lifter } from "@/lib/types";
import { accountToLifter, useAccount, useIsClient } from "@/lib/account";
import { ageGroupFor, ageGroupLabel, classLabel, experienceLabel } from "@/lib/categories";
import { MEET } from "@/lib/meet";
import { DEFAULT_FILTERS, buildLeaderboard, type LeaderboardFilters } from "@/lib/leaderboard";
import { canvasToBlob } from "@/lib/flexcard";
import { CERT_H, CERT_W, drawCertificate, makeCertId, type CertificateData } from "@/lib/certificate";

function rankIn(everyone: Lifter[], patch: Partial<LeaderboardFilters>) {
  const board = buildLeaderboard(everyone, {
    ...DEFAULT_FILTERS,
    metric: "total",
    mode: "pound-for-pound",
    ...patch,
  });
  const mine = board.find((r) => r.lifter.isYou);
  return { rank: mine?.rank ?? null, of: board.length };
}

export function CertificateStudio({ lifters }: { lifters: Lifter[] }) {
  const ready = useIsClient();
  const account = useAccount();
  const me = useMemo(() => accountToLifter(account), [account]);

  if (!ready) return <div className="panel h-96 animate-pulse-glow" aria-hidden />;

  const complete = me && me.squatKg > 0 && me.benchKg > 0 && me.deadliftKg > 0;
  if (!me || !account.entry || !complete) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
        <Medal className="h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Your certificate isn&apos;t ready yet</p>
        <p className="max-w-sm text-sm text-iron-400">
          You need a judged <b>Good Lift</b> on all three: squat, bench and deadlift.
        </p>
        <Link href="/compete" className="btn-volt">
          Go to my meet
        </Link>
      </div>
    );
  }

  return <Studio me={me} lifters={lifters} registeredAt={account.entry.registeredAt} />;
}

function Studio({ me, lifters, registeredAt }: { me: Lifter; lifters: Lifter[]; registeredAt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const data = useMemo<CertificateData>(() => {
    const everyone = [...lifters, me];
    const overall = rankIn(everyone, {});
    const category = rankIn(everyone, {
      weightClass: me.weightClass ?? "all",
      experience: me.experience ?? "all",
    });
    const district = rankIn(everyone, { district: me.district });
    const total = me.squatKg + me.benchKg + me.deadliftKg;
    const dots = buildLeaderboard(everyone, { ...DEFAULT_FILTERS, metric: "total" }).find((r) => r.lifter.isYou)?.dots ?? 0;
    const ag = ageGroupFor(me.age);

    return {
      name: me.name,
      district: me.district,
      gym: me.homeGym,
      meetName: MEET.name,
      category: [
        `${me.sex === "M" ? "Men" : "Women"} ${me.weightClass ? classLabel(me.weightClass) : ""}`.trim(),
        me.experience ? experienceLabel(me.experience) : "",
        ag ? ageGroupLabel(ag) : "",
      ]
        .filter(Boolean)
        .join(" · "),
      squatKg: me.squatKg,
      benchKg: me.benchKg,
      deadliftKg: me.deadliftKg,
      totalKg: total,
      dots,
      overallRank: overall.rank,
      overallOf: overall.of,
      categoryRank: category.rank,
      categoryOf: category.of,
      districtRank: district.rank,
      districtOf: district.of,
      dateLabel: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      certId: makeCertId(me.name, registeredAt),
      final: MEET.closed,
    };
  }, [me, lifters, registeredAt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stale = false;
    drawCertificate(canvas, data, () => stale).catch(() => {});
    return () => {
      stale = true;
    };
  }, [data]);

  async function onDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ironleague-certificate-${data.certId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <canvas
        ref={canvasRef}
        width={CERT_W}
        height={CERT_H}
        aria-label="Your certificate preview"
        className="h-auto w-full rounded-2xl bg-iron-900 shadow-glow-volt ring-1 ring-iron-700"
        style={{ aspectRatio: `${CERT_W} / ${CERT_H}` }}
      />
      {!MEET.closed && (
        <p className="text-sm text-iron-400">
          This certificate is marked <b className="text-iron-200">Provisional</b> until the meet closes and
          results are final. Ranks update as other lifters compete.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onDownload} disabled={busy} className="btn-volt">
          <Download className="h-5 w-5" /> Download certificate (PNG)
        </button>
        <Link href="/flex" className="btn-ghost">
          <Award className="h-5 w-5" /> Make a Flex Card
        </Link>
      </div>
    </div>
  );
}
