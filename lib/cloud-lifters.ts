"use client";

import { useEffect, useState } from "react";
import type { Lifter } from "./types";
import { rowToLifter, type Row } from "./cloud-lifter-map";
import { supabase, supabaseConfigured } from "./supabase/client";

export async function fetchCloudLifters(): Promise<Lifter[]> {
  const { data, error } = await supabase().from("public_leaderboard").select("*").limit(500);
  if (error || !data) return [];
  return (data as Row[]).map(rowToLifter);
}

export async function fetchCloudLifter(id: string): Promise<Lifter | null> {
  const { data } = await supabase().from("public_leaderboard").select("*").eq("id", id).maybeSingle();
  return data ? rowToLifter(data as Row) : null;
}

/** Real lifters from every account and device (guests can read it too). Refreshes every minute. */
export function useCloudLifters(): Lifter[] {
  const [list, setList] = useState<Lifter[]>([]);
  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    const run = () =>
      fetchCloudLifters()
        .then((l) => alive && setList(l))
        .catch(() => {
          /* offline: keep what we have */
        });
    void run();
    const t = setInterval(run, 60000);
    window.addEventListener("focus", run);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("focus", run);
    };
  }, []);
  return list;
}
