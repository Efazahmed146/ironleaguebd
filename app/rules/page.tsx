import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CheckCircle2, Ban, Dumbbell } from "lucide-react";
import { Accordion, type AccordionItem } from "@/components/rules/Accordion";
import { AGE_GROUPS, EXPERIENCE, WEIGHT_CLASSES, classLabel } from "@/lib/categories";
import { LIFT_STANDARDS, LIFTS, MAX_ATTEMPTS, MEET, MIN_CLIP_SEC, MIN_JUMP_KG, VIDEO_RULES, feeRequired } from "@/lib/meet";
import { CAMERA_GUIDE } from "@/lib/camera-guide";
import { AI_CHECKS } from "@/lib/ai-review";
import { DOTS_COEFFICIENTS, calculateDots, dotsDenominator } from "@/lib/scoring";

export const metadata: Metadata = { title: "Official Rules & Guidelines" };

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[11px] font-bold uppercase tracking-stencil text-iron-500">{children}</p>
);

const List = ({ items, tone = "ok" }: { items: string[]; tone?: "ok" | "no" }) => (
  <ul className="space-y-2 text-sm text-iron-300">
    {items.map((r) => (
      <li key={r} className="flex gap-2">
        {tone === "ok" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" />
        ) : (
          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
        )}
        <span>{r}</span>
      </li>
    ))}
  </ul>
);

function GeneralRules() {
  return (
    <>
      <div>
        <Label>Live recording only</Label>
        <List
          items={[
            "Every lift must be recorded LIVE with the app's built-in camera. The recorder opens when you tap Record PR / Attempt.",
            "The app has no upload button. Pre-recorded, downloaded or gallery videos are strictly prohibited and can't be submitted.",
            `One continuous take per attempt, at least ${MIN_CLIP_SEC} seconds. You can retake before submitting, but you can't trim, cut or edit.`,
            "Your weigh-in photo is also taken live in the app, with the date, time and your code stamped on it.",
          ]}
        />
      </div>
      <div>
        <Label>Weight and equipment</Label>
        <List
          items={[
            "The weight on the bar must match the weight you declared. Every plate must be clearly visible on camera.",
            "Use a standard 20 kg bar with collars on. Show the loaded bar before you lift.",
            "Your whole body and the bar stay in frame from start to finish, from the angle shown on the camera guide.",
          ]}
        />
      </div>
      <div>
        <Label>Attire and conduct</Label>
        <List
          items={[
            "Proper gym attire is required: shirt or singlet, shorts or tights, and closed lifting shoes or flat shoes. No street clothes.",
            "Lift in a real gym or a safe, well-lit space. Use safeties or a spotter for squat and bench.",
            "Compete honestly. Fake weights, edited video, or a different person lifting or on the scale means disqualification and a ban from future meets.",
          ]}
        />
      </div>
      <div>
        <Label>Attempts and judging</Label>
        <List
          items={[
            `${MAX_ATTEMPTS} attempts per lift. Declare the weight first; weights only go up (at least ${MIN_JUMP_KG} kg after a Good Lift, same or more after a No Lift).`,
            "Once you submit a recording, its weight is locked and the next attempt unlocks after judging.",
            "An AI form pre-check flags depth, pause and lockout. It is advisory only: a human moderator makes the final Good Lift / No Lift call.",
            feeRequired()
              ? `Entry fee ৳${MEET.entryFeeBdt} via bKash or Nagad. Results are official once your weigh-in and fee are approved.`
              : "Free entry. Results are official once your weigh-in is approved.",
          ]}
        />
      </div>
      <p className="flex items-start gap-2 rounded-lg bg-blood-500/10 p-3 text-sm text-iron-200 ring-1 ring-blood-500/40">
        <Camera className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
        Camera needs permission for camera and microphone, and a secure (https) page.
      </p>
    </>
  );
}

function LiftRules() {
  return (
    <>
      <p className="text-sm text-iron-300">
        Standards follow IPF (International Powerlifting Federation) technical rules, adapted for online
        judging from video.
      </p>
      {LIFTS.map((l) => (
        <div key={l} className="space-y-3 rounded-xl bg-iron-950 p-4 ring-1 ring-iron-800">
          <p className="flex items-center gap-2 font-display text-2xl font-extrabold uppercase">
            <Dumbbell className="h-5 w-5 text-volt-400" /> {LIFT_STANDARDS[l].title}
          </p>
          <List items={LIFT_STANDARDS[l].rules} />
          <p className="text-sm text-iron-300">
            <b className="text-iron-100">Camera angle:</b> {CAMERA_GUIDE[l].angle}
          </p>
          <div>
            <Label>What the AI pre-check looks for</Label>
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-iron-400">
              {AI_CHECKS[l].map((c) => (
                <li key={c.id}>{c.label}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </>
  );
}

function Categories() {
  return (
    <>
      <div>
        <Label>Experience levels</Label>
        <ul className="space-y-2 text-sm text-iron-300">
          {EXPERIENCE.map((x) => (
            <li key={x.id}>
              <b className="text-iron-50">{x.label}:</b> {x.blurb}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Label>Age groups</Label>
        <div className="flex flex-wrap gap-1.5">
          {AGE_GROUPS.map((g) => (
            <span key={g.id} className="chip bg-iron-950 text-iron-200 ring-iron-700">
              {g.label} · {g.range}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-iron-500">Minimum age to compete is 14.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {(["M", "F"] as const).map((s) => (
          <div key={s}>
            <Label>{s === "M" ? "Male" : "Female"} weight classes (IPF)</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEIGHT_CLASSES[s].map((c) => (
                <span key={c} className="chip bg-iron-950 text-iron-200 ring-iron-700">
                  {classLabel(c)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-iron-500">
        Your class is set by the scale reading at weigh-in, which must fit the class you entered.
      </p>
    </>
  );
}

function Scoring() {
  const light = { bw: 66, total: 400 };
  const heavy = { bw: 120, total: 600 };
  const dl = calculateDots(light.total, light.bw, "M");
  const dh = calculateDots(heavy.total, heavy.bw, "M");
  const k = DOTS_COEFFICIENTS.M;
  return (
    <>
      <p className="text-sm text-iron-300">
        A heavier lifter naturally lifts more. So the winner isn&apos;t the person with the biggest number
        on the bar: it&apos;s the one who is <b className="text-iron-50">strongest for their bodyweight</b>.
        We measure that with <b className="text-iron-50">DOTS</b>, the bodyweight-adjusted formula used in
        modern powerlifting.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-iron-950 p-3 text-xs text-volt-300 ring-1 ring-iron-800">
{`DOTS = lifted kg × 500 / (a + b·bw + c·bw² + d·bw³ + e·bw⁴)`}
      </pre>
      <p className="text-xs text-iron-400">
        <code>bw</code> is your bodyweight in kg. <code>a–e</code> are fixed coefficients, different for men
        and women. Your lifted weight is a single lift or your total of squat + bench + deadlift. On the
        leaderboard and in your attempts, your DOTS uses your declared weight and bodyweight.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { ...light, dots: dl },
          { ...heavy, dots: dh },
        ].map((x) => (
          <div key={x.bw} className="rounded-xl bg-iron-950 p-4 ring-1 ring-iron-800">
            <p className="text-[11px] font-bold uppercase tracking-stencil text-iron-500">Male, {x.bw} kg bodyweight</p>
            <p className="font-display text-2xl font-extrabold">{x.total} kg total</p>
            <p className="font-display text-4xl font-black text-volt-400">{x.dots.toFixed(2)} DOTS</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-iron-300">
        Example: the {heavy.bw} kg lifter lifted {heavy.total - light.total} kg more, but the {light.bw} kg
        lifter scores{" "}
        <b className="text-iron-50">{dl > dh ? "higher" : "lower"}</b> because {light.total} kg is a bigger
        feat at {light.bw} kg. Rankings are by DOTS, and ties go to the lighter lifter.
      </p>
      <p className="text-xs text-iron-500">
        Bodyweight is clamped to 40–{k.maxBw} kg (men) and 40–{DOTS_COEFFICIENTS.F.maxBw} kg (women). Denominator at 66 kg:{" "}
        {dotsDenominator(66, "M").toFixed(2)}.
      </p>
    </>
  );
}

const items: AccordionItem[] = [
  { id: "general", number: "01", title: "General rules & ethics", summary: "Live in-app recording, attire, honest weights", content: <GeneralRules /> },
  { id: "lifts", number: "02", title: "Lift standards (IPF)", summary: "Squat, bench press and deadlift", content: <LiftRules /> },
  { id: "categories", number: "03", title: "Weight classes & categories", summary: "Experience, age groups, male and female classes", content: <Categories /> },
  { id: "scoring", number: "04", title: "Scoring: DOTS", summary: "Relative strength decides the winner, not raw weight", content: <Scoring /> },
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <p className="eyebrow mb-2">{MEET.name}</p>
        <h1 className="break-words font-display text-4xl font-black uppercase leading-none min-[400px]:text-5xl sm:text-6xl">
          Official rules &amp; <span className="text-volt-400">guidelines</span>
        </h1>
        <p className="mt-3 text-iron-300">
          An online meet only works if it&apos;s fair. Read this before you lift. Every attempt is judged
          from a video recorded live in the app.
        </p>
      </header>

      <Accordion items={items} />

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-black uppercase">Video requirements, quick list</h2>
        <ul className="panel list-disc space-y-1.5 p-5 pl-9 text-sm text-iron-300">
          {VIDEO_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="text-sm text-iron-400">
          Unclear, cut or mismatched videos are marked <b className="text-blood-400">No Lift</b>.
        </p>
      </section>

      <Link href="/compete" className="btn-volt">
        Enter the competition
      </Link>
    </div>
  );
}
