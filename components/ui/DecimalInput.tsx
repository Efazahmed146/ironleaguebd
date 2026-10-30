"use client";

import type { InputHTMLAttributes } from "react";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * Keeps only a plain decimal number: converts Bangla digits (০-৯) to 0-9,
 * turns "," into ".", drops everything else, max 3 integer digits and
 * 2 decimals.
 */
export function sanitizeDecimal(raw: string): string {
  let s = raw
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[,।]/g, ".")
    .replace(/[^0-9.]/g, "");

  const dot = s.indexOf(".");
  if (dot === -1) return s.slice(0, 3);

  const intPart = s.slice(0, dot).slice(0, 3);
  const decPart = s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${intPart}.${decPart}`;
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  /** Small unit label shown inside the box, e.g. "kg". */
  suffix?: string;
  /** Whole numbers only (e.g. age). */
  integer?: boolean;
};

/**
 * Text input for kg values. Unlike type="number" it accepts typing with any
 * keyboard (including Bangla), has no spinner arrows, and never "swallows"
 * keystrokes.
 */
export function DecimalInput({ value, onChange, suffix, integer, className = "", ...rest }: Props) {
  return (
    <div className="relative">
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          const v = sanitizeDecimal(e.target.value);
          onChange(integer ? v.replace(/\..*/, "") : v);
        }}
        className={`field ${suffix ? "pr-11" : ""} ${className}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wide text-iron-500">
          {suffix}
        </span>
      )}
    </div>
  );
}
