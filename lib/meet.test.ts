import { test } from "node:test";
import assert from "node:assert/strict";
import { ageGroupFor, classRange, weightClassFor } from "./categories";
import {
  bestGood,
  canLift,
  declareAttempt,
  entryLifts,
  isOfficial,
  MEET,
  demoFillResults,
  newEntry,
  reviewAttempt,
  submitAttempt,
  type MeetEntry,
} from "./meet";

const ok = (r: ReturnType<typeof declareAttempt>): MeetEntry => {
  assert.ok("entry" in r, "error" in r ? r.error : "");
  return r.entry;
};

test("weight classes (IPF)", () => {
  assert.equal(weightClassFor(59, "M"), "-59");
  assert.equal(weightClassFor(59.1, "M"), "-66");
  assert.equal(weightClassFor(83, "M"), "-83");
  assert.equal(weightClassFor(120.5, "M"), "+120");
  assert.equal(weightClassFor(47, "F"), "-47");
  assert.equal(weightClassFor(90, "F"), "+84");
  assert.deepEqual(classRange("-74", "M"), { min: 66, max: 74 });
  assert.deepEqual(classRange("+120", "M"), { min: 120, max: null });
});

test("age groups", () => {
  assert.equal(ageGroupFor(13), null);
  assert.equal(ageGroupFor(14), "teen");
  assert.equal(ageGroupFor(19), "teen");
  assert.equal(ageGroupFor(20), "junior");
  assert.equal(ageGroupFor(23), "junior");
  assert.equal(ageGroupFor(24), "open");
  assert.equal(ageGroupFor(39), "open");
  assert.equal(ageGroupFor(40), "masters");
});

const CLIP = {
  videoId: "vid-1",
  recording: {
    source: "in_app_camera" as const,
    mimeType: "video/webm",
    durationSec: 8,
    sizeBytes: 1000,
    recordedAt: "2026-01-01T00:00:00Z",
  },
  dots: 100,
};

test("recording: only in-app clips of 3s+ are accepted; DOTS and tag are stored", () => {
  const e = ok(declareAttempt(newEntry("novice", "-83"), "squat", 150));
  assert.ok("error" in submitAttempt(e, "squat", { ...CLIP, recording: { ...CLIP.recording, durationSec: 1 } }));
  assert.ok(
    "error" in
      submitAttempt(e, "squat", { ...CLIP, recording: { ...CLIP.recording, source: "gallery" as never } }),
  );
  const r = submitAttempt(e, "squat", CLIP);
  assert.ok("entry" in r);
  const a = r.entry.attempts.squat[0]!;
  assert.equal(a.recording?.source, "in_app_camera");
  assert.equal(a.dots, 100);
  assert.equal(a.status, "submitted");
});

test("attempts: declare, edit, lock, and weights only go up", () => {
  let e = newEntry("novice", "-83");

  // declare + edit before video
  e = ok(declareAttempt(e, "squat", 150));
  e = ok(declareAttempt(e, "squat", 155));
  assert.equal(e.attempts.squat.length, 1);
  assert.equal(e.attempts.squat[0]!.weightKg, 155);

  // declaring again before the video is submitted just edits the same open attempt
  const edited = ok(declareAttempt(e, "squat", 170));
  assert.equal(edited.attempts.squat.length, 1);
  e = ok(declareAttempt(edited, "squat", 155));

  // submit video → weight locked
  e = (() => {
    const r = submitAttempt(e, "squat", CLIP);
    assert.ok("entry" in r);
    return r.entry;
  })();
  assert.ok("error" in declareAttempt(e, "squat", 160), "still waiting for review");
  assert.ok("error" in submitAttempt(e, "squat", CLIP));

  // good lift → next must be >= +2.5
  e = (() => {
    const r = reviewAttempt(e, "squat", 0, "good", []);
    assert.ok("entry" in r);
    return r.entry;
  })();
  assert.ok("error" in declareAttempt(e, "squat", 155));
  assert.ok("error" in declareAttempt(e, "squat", 156));
  assert.ok("error" in declareAttempt(e, "squat", 150));
  e = ok(declareAttempt(e, "squat", 157.5));

  // no lift → can repeat the same weight but not go down
  e = (() => {
    let r = submitAttempt(e, "squat", CLIP);
    assert.ok("entry" in r);
    r = reviewAttempt(r.entry, "squat", 1, "no_lift", ["Depth not reached (hip crease above knee)"]);
    assert.ok("entry" in r);
    return r.entry;
  })();
  assert.ok("error" in declareAttempt(e, "squat", 155));
  e = ok(declareAttempt(e, "squat", 157.5));

  // 3 attempts max
  e = (() => {
    let r = submitAttempt(e, "squat", CLIP);
    assert.ok("entry" in r);
    r = reviewAttempt(r.entry, "squat", 2, "good", []);
    assert.ok("entry" in r);
    return r.entry;
  })();
  assert.ok("error" in declareAttempt(e, "squat", 200));
  assert.equal(bestGood(e, "squat"), 157.5);
});

test("validation: step, cap, no-lift needs a reason", () => {
  const e = newEntry("pro", "-93");
  assert.ok("error" in declareAttempt(e, "bench", 100.3));
  assert.ok("error" in declareAttempt(e, "bench", 400));
  assert.ok("error" in declareAttempt(e, "bench", 0));
  const d = ok(declareAttempt(e, "bench", 100));
  const s = submitAttempt(d, "bench", CLIP);
  assert.ok("entry" in s);
  assert.ok("error" in reviewAttempt(s.entry, "bench", 0, "no_lift", []));
});

test("official only after weigh-in + fee approved", () => {
  MEET.demoSkips = false; // demo mode unlocks lifting; test the real rule
  let e = newEntry("novice", "-66");
  assert.equal(canLift(e), false);
  e = {
    ...e,
    weighIn: { measuredKg: 64, code: e.weighInCode, submittedAt: "", status: "pending" },
    payment: { method: "bkash", senderNumber: "01712345678", trxId: "ABC123XYZ", amountBdt: 300, submittedAt: "", status: "pending" },
  };
  assert.equal(canLift(e), true);
  assert.equal(isOfficial(e), false);
  e = { ...e, weighIn: { ...e.weighIn!, status: "approved" }, payment: { ...e.payment!, status: "approved" } };
  assert.equal(isOfficial(e), true);
  assert.deepEqual(entryLifts(e), { squatKg: 0, benchKg: 0, deadliftKg: 0 });
});

test("camera skip: demo_skip is accepted only while MEET.demoSkips is on", async () => {
  const { MEET } = await import("./meet");
  const e = ok(declareAttempt(newEntry("novice", "-83"), "squat", 150));
  const demo = { ...CLIP, recording: { ...CLIP.recording, source: "demo_skip" as const } };
  const prev = MEET.demoSkips;
  try {
    MEET.demoSkips = true;
    assert.ok("entry" in submitAttempt(e, "squat", demo));
    MEET.demoSkips = false;
    assert.ok("error" in submitAttempt(e, "squat", demo));
  } finally {
    MEET.demoSkips = prev;
  }
});

test("attachAiReview adds the AI pre-check to a submitted attempt only", async () => {
  const { attachAiReview } = await import("./meet");
  const { unavailableReview } = await import("./ai-review");
  const e = ok(declareAttempt(newEntry("novice", "-83"), "bench", 100));
  const ai = unavailableReview("bench", "x");
  assert.equal(attachAiReview(e, "bench", 0, ai), null, "declared attempt has no clip yet");
  const s = submitAttempt(e, "bench", CLIP);
  assert.ok("entry" in s);
  const withAi = attachAiReview(s.entry, "bench", 0, ai);
  assert.equal(withAi?.attempts.bench[0]!.ai?.status, "unavailable");
  assert.equal(withAi?.attempts.bench[0]!.ai?.checks.length, 2);
});

test("demo: canLift is open and demoFillResults gives all three lifts a Good Lift", () => {
  MEET.demoSkips = true;
  const e = newEntry("novice", "-83");
  assert.equal(canLift(e), true);
  const f = demoFillResults(e, "M");
  assert.ok(bestGood(f, "squat") > 0 && bestGood(f, "bench") > 0 && bestGood(f, "deadlift") > 0);
  assert.equal(f.payment?.status, "approved");
});
