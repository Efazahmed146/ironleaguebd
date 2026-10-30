import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToLifter } from "./cloud-lifter-map";

test("a leaderboard row from the database becomes a Lifter", () => {
  const l = rowToLifter({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Rakib",
    sex: "M",
    age: 27,
    district: "Dhaka",
    area: null,
    home_gym: "Iron Temple",
    experience: "pro",
    weight_class: null,
    is_pro: true,
    squat_kg: "200.0",
    bench_kg: 140,
    deadlift_kg: "250.5",
    bodyweight_kg: "82.4",
    has_proof: true,
    verified: false,
    updated_at: "2026-10-30T00:00:00Z",
  });
  assert.equal(l.squatKg, 200);
  assert.equal(l.deadliftKg, 250.5);
  assert.equal(l.bodyweightKg, 82.4);
  assert.equal(l.weightClass, "-83");
  assert.equal(l.verified, false);
  assert.equal(l.isPro, true);
  assert.equal(l.homeGym, "Iron Temple");
});

test("missing optional data doesn't break a row", () => {
  const l = rowToLifter({
    id: "x", name: null, sex: null, age: null, district: null, area: null, home_gym: null, experience: null,
    weight_class: null, is_pro: null, squat_kg: 100, bench_kg: 0, deadlift_kg: 0, bodyweight_kg: null,
    has_proof: null, verified: null, updated_at: "2026-10-30T00:00:00Z",
  });
  assert.equal(l.name, "Lifter");
  assert.equal(l.sex, "M");
  assert.equal(l.weightClass, undefined);
});
