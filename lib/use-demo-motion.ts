"use client";

import { useSyncExternalStore } from "react";
import { getDemoPlayback, subscribeDemoPlayback } from "./demo-playback";

let requested = true;
const motionListeners = new Set<() => void>();
const subscribeRequested = (notify: () => void) => { motionListeners.add(notify); return () => { motionListeners.delete(notify); }; };
const readRequested = () => requested;
const toggleRequested = () => { requested = !requested; motionListeners.forEach(notify => notify()); };
const readPlaybackMotion = () => { const demo = getDemoPlayback(); return !demo.active || demo.status === "playing" || demo.status === "complete"; };

// All numeric and SVG animations share one native listener per environment signal.
const reducedListeners = new Set<() => void>();
let media: MediaQueryList | null = null;
const notifyReduced = () => reducedListeners.forEach(notify => notify());
const subscribeReducedMotion = (notify: () => void) => {
  if (!reducedListeners.size) { media = window.matchMedia("(prefers-reduced-motion: reduce)"); media.addEventListener("change", notifyReduced); }
  reducedListeners.add(notify);
  return () => { reducedListeners.delete(notify); if (!reducedListeners.size) { media?.removeEventListener("change", notifyReduced); media = null; } };
};
const readReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const visibilityListeners = new Set<() => void>();
const notifyVisibility = () => visibilityListeners.forEach(notify => notify());
const subscribeVisibility = (notify: () => void) => {
  if (!visibilityListeners.size) document.addEventListener("visibilitychange", notifyVisibility);
  visibilityListeners.add(notify);
  return () => { visibilityListeners.delete(notify); if (!visibilityListeners.size) document.removeEventListener("visibilitychange", notifyVisibility); };
};
const readVisibility = () => document.visibilityState !== "hidden";
const serverReducedMotion = () => false;
const serverVisibility = () => true;

/** Presentation effects are independent of simulation/data playback. */
export function useDemoMotion() {
  const requested = useSyncExternalStore(subscribeRequested, readRequested, serverVisibility);
  const playbackMotion = useSyncExternalStore(subscribeDemoPlayback, readPlaybackMotion, serverVisibility);
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverReducedMotion);
  const visible = useSyncExternalStore(subscribeVisibility, readVisibility, serverVisibility);
  const enabled = requested && !reduced;
  return { requested, enabled, reduced, visible, dataRunning: requested && visible, running: enabled && visible && playbackMotion, toggle: toggleRequested };
}
