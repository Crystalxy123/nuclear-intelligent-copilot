"use client";

import { useEffect, useRef } from "react";
import { useDemoMotion } from "@/lib/use-demo-motion";

const enteredNumbers = new Set<string>();

/** Shared motion preferences include global pause, reduced motion, and visibility. */
export function usePresentationMotion() { return useDemoMotion().running; }

type AnimatedNumberProps = {
  as?: "span" | "tspan";
  value: number;
  digits?: number;
  duration?: number;
  firstFromZero?: boolean;
  identity?: string;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
};

/** Tween only the displayed text. A stable identity prevents repeated zero-counts on navigation. */
export default function AnimatedNumber({ as = "span", value, digits = 0, duration = 320, firstFromZero = false, identity, delay = 0, className, prefix = "", suffix = "" }: AnimatedNumberProps) {
  const element = useRef<HTMLSpanElement>(null);
  const svgElement = useRef<SVGTSpanElement>(null);
  const shown = useRef(value);
  const initialized = useRef(false);
  const motion = usePresentationMotion();
  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const node = as === "tspan" ? svgElement.current : element.current;
    if (!node) return;
    const fresh = !initialized.current && firstFromZero && (!identity || !enteredNumbers.has(identity));
    initialized.current = true;
    if (identity) enteredNumbers.add(identity);
    const from = fresh && motion ? 0 : shown.current;
    const write = (number: number) => { shown.current = number; node.textContent = `${prefix}${number.toFixed(digits)}${suffix}`; };
    if (!motion || Math.abs(target - from) < .000001) { write(target); return; }
    write(from);
    const started = performance.now() + delay;
    const length = fresh ? Math.max(700, duration) : duration;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - started) / Math.max(1, length)));
      write(from + (target - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [as, value, digits, duration, firstFromZero, identity, delay, prefix, suffix, motion]);
  const label = `${prefix}${value.toFixed(digits)}${suffix}`;
  return as === "tspan"
    ? <tspan ref={svgElement} className={className} style={{ fontVariantNumeric: "tabular-nums" }} aria-label={label}>{label}</tspan>
    : <span ref={element} className={className} style={{ fontVariantNumeric: "tabular-nums" }} aria-label={label}>{label}</span>;
}
