import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDots, relativeStrength, totalKg } from "./scoring";

test("DOTS: 500kg total @ 80kg male ≈ 344.8", () => {
  const score = calculateDots(500, 80, "M");
  assert.ok(Math.abs(score - 344.8) < 0.5, `got ${score}`);
});

test("DOTS: lighter lifter with same total scores higher", () => {
  assert.ok(calculateDots(400, 66, "M") > calculateDots(400, 93, "M"));
});

test("DOTS: women use their own polynomial", () => {
  assert.notEqual(calculateDots(300, 60, "F"), calculateDots(300, 60, "M"));
});

test("DOTS: invalid input returns 0", () => {
  assert.equal(calculateDots(0, 80), 0);
  assert.equal(calculateDots(200, 0), 0);
  assert.equal(calculateDots(NaN, 80), 0);
});

test("DOTS: extreme bodyweight is clamped (no blow-ups)", () => {
  const s = calculateDots(300, 400, "M");
  assert.ok(Number.isFinite(s) && s > 0);
});

test("relativeStrength + totalKg", () => {
  assert.equal(relativeStrength(200, 80), 2.5);
  assert.equal(totalKg({ squatKg: 200, benchKg: 120, deadliftKg: 240 }), 560);
});
