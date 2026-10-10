"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function EventDrawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, a[href], [tabindex="0"]') ?? []);
      if (event.shiftKey && document.activeElement === targets[0]) { event.preventDefault(); targets.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === targets.at(-1)) { event.preventDefault(); targets[0]?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="event-drawer-backdrop"><button className="event-drawer-scrim" onClick={onClose} aria-label="关闭详情背景"/><section className="event-drawer" role="dialog" aria-modal="true" aria-labelledby="event-drawer-title" ref={panel}><header><div><small>{subtitle ?? "Event-021 · P-201 · 本地演示"}</small><h2 id="event-drawer-title">{title}</h2></div><button onClick={onClose} aria-label="关闭事件详情">×</button></header><div className="event-drawer-content">{children}</div><footer><button onClick={onClose}>返回审计中心</button></footer></section></div>;
}
