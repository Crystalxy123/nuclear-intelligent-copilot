"use client";

import { useEffect, useRef, useState } from "react";
import { DECISION_EVIDENCE, DECISION_ID } from "@/lib/decision-card";
import { hashAuditJson, recordAuditAccess } from "@/lib/evidence-audit";
import { downloadDemoFile } from "@/lib/demo-downloads";
import { usePresentationMotion } from "./AnimatedNumber";
import "@/app/motion-decision-enhanced.css";
import { useDemoEvent } from "@/lib/demo-event";

export type EvidenceId = "pressure" | "alarms" | "procedure" | "history" | "model";
const previouslyHashed = new Set<string>();
const details: Record<EvidenceId, { timestamp: string; version: string; confidence: string; role: string }> = {
  pressure: { timestamp: "2026-10-04 18:21:04", version: "P101 snapshot v3.2.1", confidence: "98% · 场景数据完整度", role: "识别 P-201 压力持续下降 4.3% 的趋势，支持事件触发与持续监测；单一趋势不能确认故障根因。" },
  alarms: { timestamp: "2026-10-04 18:21:27", version: "Alarm correlation v1.2", confidence: "94% · 场景关联评分", role: "将 A317、A320、A322 归并到 Event-021，避免把同一设备的关联报警误认为多个独立事件。" },
  procedure: { timestamp: "2026-10-04 18:22:15", version: "OP-12 rev.4 · §4.3", confidence: "适用性待人工核对", role: "约束处置顺序：复核测点、核查设备、持续监测、值长审核。运行建议必须经过人工确认。" },
  history: { timestamp: "2026-10-04 18:22:30", version: "Event library v2.1", confidence: "82% · 历史模式相似度", role: "提供相似压力趋势的核查经验，支持对主泵效率和阀门反馈开展检查；相似案例不是当前故障的定论。" },
  model: { timestamp: "2026-10-04 18:23:08", version: "Boundary Model v2.8", confidence: "86% · 场景综合置信度", role: "结合压力、温度、流量与反应性摘要评估安全边界，支持中低风险判断及多目标方案比较。" },
};

export default function EvidenceDrawer({ initialEvidence = "pressure", onClose }: { initialEvidence?: EvidenceId; onClose: () => void }) {
  const demoEvent = useDemoEvent();
  const motion = usePresentationMotion();
  const detailRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<EvidenceId>(initialEvidence);
  const [digest, setDigest] = useState({ id: "", value: "", error: false });
  const [notice, setNotice] = useState("");
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const evidence = DECISION_EVIDENCE.find(item => item.id === selected)!;
  const detail = details[selected];
  const snapshot = { decisionId: DECISION_ID, eventId: "Event-021", equipmentId: "P-201", evidence, metadata: detail, mode: "local-demo" };
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]') ?? []).filter(item => item.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    let timer = 0;
    const delay = motion && !previouslyHashed.has(selected) ? 300 : 0;
    const reveal = new Promise<void>(resolve => { if (!delay) resolve(); else timer = window.setTimeout(resolve,delay); });
    const item = DECISION_EVIDENCE.find(entry => entry.id === selected)!;
    Promise.all([reveal, hashAuditJson({ decisionId: DECISION_ID, eventId: "Event-021", equipmentId: "P-201", evidence: item, metadata: details[selected], mode: "local-demo" })])
      .then(([,value]) => { previouslyHashed.add(selected); if (active) setDigest({ id: selected, value, error: false }); })
      .catch(() => { if (active) setDigest({ id: selected, value: "", error: true }); });
    recordAuditAccess(item.title, undefined, "查看证据");
    return () => { active = false; window.clearTimeout(timer); };
  }, [selected, motion]);
  useEffect(() => {
    const target = detailRef.current;
    if (!target) return;
    const frame = requestAnimationFrame(() => target.scrollIntoView({ behavior: motion ? "smooth" : "instant", block: "nearest" }));
    return () => cancelAnimationFrame(frame);
  }, [selected, motion]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2500); return () => window.clearTimeout(timer); }, [notice]);
  const select = (id: EvidenceId) => { setSelected(id); setNotice(""); };
  const moveEvidence = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 4 : (index + (event.key === "ArrowDown" ? 1 : -1) + 5) % 5;
    select(DECISION_EVIDENCE[next].id as EvidenceId);
    document.getElementById(`evidence-drawer-tab-${DECISION_EVIDENCE[next].id}`)?.focus();
  };
  return <div className="ed-backdrop">
    <button className="ed-scrim" aria-label="关闭证据抽屉背景" tabIndex={-1} onClick={onClose}/>
    <aside ref={panel} className="ed-drawer" role="dialog" aria-modal="true" aria-labelledby="ed-title">
      <header className="ed-header"><div><small>Event-021 · P-201</small><h2 id="ed-title">判断背后的证据</h2><p>每个结论，都可以回到来源。</p></div><button className="ed-close" aria-label="关闭证据抽屉" onClick={onClose}>×</button></header>
      <div className="ed-body">{!demoEvent.alarmTriggered && <p className="ed-context-note">预设异常证据 · Event-021 尚未触发。以下为演示场景快照，不代表当前监测状态。</p>}{demoEvent.alarmTriggered && demoEvent.analysisStage !== "complete" && <p className="ed-context-note">Event-021 已识别 · 当前协同分析尚未完成，模型摘要为预设评估参考。</p>}<div className="ed-tabs" role="tablist" aria-label="证据来源" aria-orientation="vertical">{DECISION_EVIDENCE.map((item, index) => <button key={item.id} role="tab" id={`evidence-drawer-tab-${item.id}`} aria-selected={selected === item.id} aria-controls="ed-detail" tabIndex={selected === item.id ? 0 : -1} onClick={() => select(item.id as EvidenceId)} onKeyDown={event => moveEvidence(event,index)}><span>{item.number}</span><div><small>{item.category}</small><strong>{item.title}</strong></div><b aria-hidden="true">›</b></button>)}</div>
        <section key={selected} ref={detailRef} id="ed-detail" className="ed-detail ed-motion-target" role="tabpanel" tabIndex={0} aria-labelledby={`evidence-drawer-tab-${selected}`}>
          <div className="ed-detail-title"><span>证据 {evidence.number}</span><h3>{evidence.title}</h3></div><p>{evidence.summary}</p>
          {selected === "pressure" && <figure className="ed-pressure"><svg viewBox="0 0 420 120" role="img" aria-label="P101 压力在 180 秒内下降 4.3%，由基线100%降至95.7%"><path className="ed-grid" d="M35 15H405M35 55H405M35 95H405M35 15V95M160 15V95M285 15V95M405 15V95"/><text x="2" y="19">100%</text><text x="2" y="99">95%</text><polyline points="35,15 62,19 88,24 115,24 141,32 168,38 194,39 221,45 247,51 274,55 300,65 327,71 353,78 379,82 405,84" fill="none" stroke="#0ce3d4" strokeWidth="2.4"/><circle cx="405" cy="84" r="4" fill="#5dffdc"/><text x="35" y="114">−180 s</text><text x="380" y="114">当前</text></svg><figcaption>当前 95.7% <strong>↓ 4.3%</strong> <span>本地场景快照</span></figcaption></figure>}
          <dl className="ed-metadata"><div><dt>来源</dt><dd>{evidence.source}</dd></div><div><dt>记录时间</dt><dd>{detail.timestamp} <small>UTC+8</small></dd></div><div><dt>数据版本</dt><dd>{detail.version}</dd></div><div><dt>可信度</dt><dd>{detail.confidence}</dd></div></dl>
          <div className="ed-role"><span>对当前判断的作用</span><p>{detail.role}</p></div>
          <dl className="ed-records">{evidence.items.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <div className="ed-hash"><div><strong>SHA-256 · 本地内容摘要</strong><button disabled={digest.id !== selected || digest.error} onClick={async () => { try { await navigator.clipboard.writeText(digest.value); setNotice("摘要已复制"); } catch { setNotice("复制不可用，请下载证据快照查看摘要"); } }}>复制</button></div><code data-calculating={digest.id !== selected}>{digest.id !== selected ? "VERIFYING · 正在计算内容摘要…" : digest.error ? "当前浏览器无法计算摘要" : digest.value}</code><small>由此证据快照在浏览器中计算，用于检查副本一致性；不是机构数字签名。</small></div>
        </section></div>
      <footer className="ed-footer"><span role="status">{notice || "本地演示证据 · 未接入现场数据"}</span><button onClick={() => downloadDemoFile(`Event-021-${selected}.json`, JSON.stringify({ snapshot, integrity: { algorithm: "SHA-256", canonicalization: "递归按对象键排序，保留数组顺序，UTF-8 JSON，无缩进", digest: digest.id === selected && !digest.error ? digest.value : null } },null,2),"application/json;charset=utf-8")}>下载证据快照 ↓</button></footer>
    </aside>
  </div>;
}
