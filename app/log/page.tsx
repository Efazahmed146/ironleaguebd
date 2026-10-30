import { redirect } from "next/navigation";

// The old "Log PR" page became the competition flow.
export default function LogPage() {
  redirect("/compete");
}
