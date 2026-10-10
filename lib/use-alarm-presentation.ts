"use client";

import { useEffect, useState } from "react";
import { useDemoEvent } from "./demo-event";

/** Presentation timing reads the event; it never advances business state. */
export function useAlarmPresentation() {
  const event = useDemoEvent();
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (!event.alarmTriggered || event.presentationTime !== null || !event.alarmStartedAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 100);
    const stop = window.setTimeout(() => window.clearInterval(timer), Math.max(0, 6200 - (Date.now() - event.alarmStartedAt)));
    return () => { window.clearInterval(timer); window.clearTimeout(stop); };
  }, [event.alarmTriggered, event.alarmStartedAt, event.presentationTime]);
  const elapsed = !event.alarmTriggered ? 0 : event.presentationTime !== null ? event.presentationTime * 1000 : event.alarmStartedAt ? Math.max(0, clock - event.alarmStartedAt) : 6000;
  return {
    elapsed,
    seconds: Math.min(180, elapsed * .03),
    equipmentAlert: event.alarmTriggered && elapsed >= 250,
    warningPulse: event.alarmTriggered && elapsed >= 400,
    pulseActive: event.alarmTriggered && elapsed >= 400 && elapsed < 1150,
    alarmCard: event.alarmTriggered && elapsed >= 800,
    alarmTimeline: event.alarmTriggered && elapsed >= 1000,
    pumpSpeed: !event.alarmTriggered ? 4320 : elapsed < 2400 ? 4320 - Math.min(1, elapsed / 2400) * 340 : 3980 - Math.min(1, (elapsed - 2400) / 3600) * 330,
    steamLevel: !event.alarmTriggered ? 62 : elapsed < 2400 ? 62 - Math.min(1, elapsed / 2400) * 4 : 58 - Math.min(1, (elapsed - 2400) / 3600) * 4,
  };
}
