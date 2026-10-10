"use client";

import { useEffect, useState } from "react";

const revealedViews = new Set<string>();

/** Hidden tabs do not consume their first reveal; page returns keep the drawn chart. */
export function useFirstViewMotion(identity: string, active = true) {
  const [reveal, setReveal] = useState<"waiting" | "animate" | "seen">(() => revealedViews.has(identity) ? "seen" : "waiting");
  if (active && reveal === "waiting") setReveal("animate");
  if (!active && reveal === "animate") setReveal("seen");
  useEffect(() => {
    if (reveal === "animate") revealedViews.add(identity);
  }, [identity, reveal]);
  return reveal;
}
