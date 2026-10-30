import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBdPhone, normalizeBdPhone } from "./phone";

test("normalizes the ways people type a BD mobile number", () => {
  for (const v of ["01712345678", "017-1234 5678", "+8801712345678", "8801712345678", " 01712 345678 "]) {
    assert.equal(normalizeBdPhone(v), "+8801712345678", v);
  }
});

test("rejects numbers that are not BD mobiles", () => {
  for (const v of ["", "0171234567", "017123456789", "01212345678", "+919812345678", "abcdefghijk"]) {
    assert.equal(normalizeBdPhone(v), null, v);
  }
});

test("formats for display", () => {
  assert.equal(formatBdPhone("+8801712345678"), "01712-345678");
  assert.equal(formatBdPhone(null), "");
});
