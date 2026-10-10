"use client";

import { useSyncExternalStore } from "react";

export type DemoPlayback = { active: boolean; status: "idle" | "playing" | "paused" | "complete"; elapsed: number; mode: "auto" | "step"; interruption: string };
const INITIAL: DemoPlayback = { active: false, status: "idle", elapsed: 0, mode: "auto", interruption: "" };
let playback = INITIAL;
const listeners = new Set<() => void>();
export function subscribeDemoPlayback(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getDemoPlayback() { return playback; }
export function useDemoPlayback() { return useSyncExternalStore(subscribeDemoPlayback, getDemoPlayback, () => INITIAL); }
export function updateDemoPlayback(patch: Partial<DemoPlayback>) { playback = { ...playback, ...patch }; listeners.forEach(listener => listener()); }
export function pauseDemoPlayback(reason = "演示已暂停") { if (playback.active && playback.status === "playing") updateDemoPlayback({ status: "paused", interruption: reason }); }
export function closeDemoPlayback() { playback = INITIAL; listeners.forEach(listener => listener()); }
