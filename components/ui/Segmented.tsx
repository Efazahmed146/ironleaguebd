"use client";

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-stencil text-iron-500">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-lg bg-iron-950 p-1 ring-1 ring-iron-700"
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-bold uppercase tracking-wide transition ${
              value === o.id
                ? "bg-volt-400 text-iron-950"
                : "text-iron-400 hover:text-iron-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
