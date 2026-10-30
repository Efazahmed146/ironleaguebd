import { initials } from "@/lib/format";

export function PersonAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-iron-800 font-display font-extrabold text-iron-200 ring-2 ring-iron-700 ${
        size === "sm" ? "h-9 w-9 text-base" : "h-11 w-11 text-lg"
      }`}
    >
      {initials(name)}
    </span>
  );
}
