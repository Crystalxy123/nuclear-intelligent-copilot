"use client";

import { useLayoutEffect } from "react";
import { useDemoMotion } from "@/lib/use-demo-motion";

/** Pause loops in place; finish one-shot entrances so paused navigation stays readable. */
export default function MotionLifecycle() {
  const { running } = useDemoMotion();
  useLayoutEffect(() => {
    if (running) return;
    const shell = document.querySelector('.app-shell');
    if (!shell) return;
    const settle = () => {
      for (const animation of shell.getAnimations({ subtree: true })) {
        const timing = animation.effect?.getComputedTiming();
        if (timing && timing.iterations !== Infinity && animation.playState !== "finished") {
          try { animation.finish(); } catch { /* Infinite/unresolved timelines are left paused by CSS. */ }
        }
      }
    };
    settle();
    const observer = new MutationObserver(settle);
    observer.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [running]);
  return null;
}
