"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Clock, XCircle } from "lucide-react";
import { saveEntry, useAccount, useIsClient, type Profile } from "@/lib/account";
import { classLabel, classRange, weightClassFor } from "@/lib/categories";
import { MEET, demoApproveWeighIn, type MeetEntry } from "@/lib/meet";
import { Field } from "@/components/ui/Field";
import { DecimalInput } from "@/components/ui/DecimalInput";
import { PhotoCapture, type CapturedPhoto } from "@/components/camera/PhotoCapture";

function LiveClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-display text-2xl font-extrabold tabular-nums text-volt-300">{now || "…"}</span>;
}

export function WeighInForm() {
  const ready = useIsClient();
  const { profile, entry } = useAccount();
  if (!ready || !profile) return null;
  if (!entry) {
    return (
      <div className="panel flex flex-col items-center gap-4 px-6 py-12 text-center">
        <p className="font-display text-3xl font-black uppercase">Pick your category first</p>
        <Link href="/compete/register" className="btn-volt">
          Choose category
        </Link>
      </div>
    );
  }
  return <WeighInInner profile={profile} entry={entry} />;
}

function WeighInInner({ profile, entry }: { profile: Profile; entry: MeetEntry }) {
  const router = useRouter();
  const w = entry.weighIn;
  const [measured, setMeasured] = useState(w ? String(w.measuredKg) : "");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [camera, setCamera] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function onSubmit() {
    const errs: Record<string, string> = {};
    const kg = parseFloat(measured);

    if (!(kg >= 30 && kg <= 250)) {
      errs.measured = "Enter the number shown on the scale.";
    } else {
      const { min, max } = classRange(entry.weightClass, profile.sex);
      if (kg <= min || (max !== null && kg > max)) {
        const right = weightClassFor(kg, profile.sex);
        errs.measured = `${kg} kg doesn't fit ${classLabel(entry.weightClass)}. You belong in ${
          right ? classLabel(right) : "another class"
        }. Change your category first.`;
      }
    }
    if (!photo && !w?.photoDataUrl) errs.photo = "Take a photo of yourself on the scale with the in-app camera.";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const ok = saveEntry({
      ...entry,
      weighIn: {
        measuredKg: Math.round(kg * 10) / 10,
        code: entry.weighInCode,
        photoDataUrl: photo?.dataUrl ?? w?.photoDataUrl,
        photoTakenAt: photo?.takenAt ?? w?.photoTakenAt,
        source: photo ? (photo.demo ? "demo_skip" : "in_app_camera") : (w?.source ?? "in_app_camera"),
        submittedAt: new Date().toISOString(),
        status: "pending",
      },
    });
    setBusy(false);
    if (!ok) return setErrors({ photo: "Couldn't save (browser storage full?). Retake the photo." });
    router.push("/compete");
  }

  if (w?.status === "approved") {
    return (
      <div className="panel space-y-3 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-volt-400" />
        <p className="font-display text-3xl font-black uppercase">Weigh-in approved</p>
        <p className="text-sm text-iron-400">
          Official weight: <b className="text-iron-100">{w.measuredKg} kg</b> · class{" "}
          {classLabel(entry.weightClass)}
        </p>
        <Link href="/compete" className="btn-volt">
          Back to hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {w && (
        <div
          className={`flex items-start gap-3 rounded-xl p-4 ring-1 ${
            w.status === "rejected"
              ? "bg-blood-500/10 ring-blood-500/40"
              : "bg-iron-900 ring-iron-700"
          }`}
        >
          {w.status === "rejected" ? (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-blood-400" />
          ) : (
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-volt-400" />
          )}
          <p className="text-sm text-iron-200">
            {w.status === "rejected" ? (
              <>
                <b>Weigh-in rejected.</b> {w.note ? `Reason: ${w.note}. ` : ""}Submit it again below.
              </>
            ) : (
              <>
                <b>Weigh-in submitted</b> and waiting for a moderator. You can replace it below if
                something was wrong.
                {MEET.demoSkips && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="font-semibold text-amber-200 underline"
                      onClick={() => {
                        saveEntry(demoApproveWeighIn(entry));
                        router.push("/compete");
                      }}
                    >
                      Approve it myself (demo only)
                    </button>
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <div className="panel space-y-6 p-5 sm:p-8">
        {/* Instructions */}
        <div className="rounded-xl bg-iron-950 p-4 ring-1 ring-iron-800">
          <p className="font-display text-xl font-extrabold uppercase tracking-wide">How to weigh in</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-iron-300">
            <li>Use a digital scale. Weigh in light clothing, no shoes, empty pockets.</li>
            <li>
              Write today&apos;s code <b className="text-volt-300">{entry.weighInCode}</b> on a piece
              of paper and hold it next to the scale display.
            </li>
            <li>Tap the button below and take a live photo showing you standing on the scale, the full display, and the paper. Gallery photos aren&apos;t accepted.</li>
            <li>The time must be visible: show this screen&apos;s clock or a wall clock in the shot.</li>
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Your code</p>
              <p className="font-display text-4xl font-black tabular-nums text-volt-400">{entry.weighInCode}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Time reference</p>
              <LiveClock />
            </div>
          </div>
        </div>

        <Field
          label={`Scale reading (kg) · class ${classLabel(entry.weightClass)}`}
          htmlFor="measured"
          error={errors.measured}
        >
          <div className="sm:max-w-[14rem]">
            <DecimalInput id="measured" suffix="kg" value={measured} onChange={setMeasured} placeholder="e.g. 82.4" />
          </div>
        </Field>

        <Field label="Photo on the scale (required)" htmlFor="photo" error={errors.photo}>
          <button
            id="photo"
            type="button"
            onClick={() => setCamera(true)}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-iron-700 px-4 py-7 text-center transition hover:border-volt-400/70 hover:bg-iron-900"
          >
            <Camera className="h-7 w-7 text-volt-400" />
            <span className="font-semibold">
              {photo || w?.photoDataUrl ? "Retake photo" : "Open camera"}
            </span>
            <span className="text-xs text-iron-500">Live camera only. Date, time and your code are stamped on the photo.</span>
          </button>
          {(photo || w?.photoDataUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo?.dataUrl ?? w?.photoDataUrl}
              alt="Your weigh-in photo"
              className="mt-3 max-h-72 rounded-lg ring-1 ring-iron-700"
            />
          )}
        </Field>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onSubmit} disabled={busy} className="btn-volt">
            {busy ? "Saving…" : w ? "Resubmit weigh-in" : "Submit weigh-in"}
          </button>
          <Link href="/compete" className="btn-ghost">
            Back
          </Link>
        </div>
      </div>

      {camera && (
        <PhotoCapture
          code={entry.weighInCode}
          onClose={() => setCamera(false)}
          onCapture={(p) => {
            setPhoto(p);
            setCamera(false);
          }}
        />
      )}
    </div>
  );
}
