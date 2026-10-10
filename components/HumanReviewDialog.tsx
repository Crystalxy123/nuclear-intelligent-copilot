"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DECISION_ID, type PlanId } from "@/lib/decision-card";

export type HumanReviewInput = { reason: string; evidenceReviewed: true; constraintsReviewed: true };
export default function HumanReviewDialog({ plan, title, risk, confidence, onClose, onConfirm, demonstration = false, demonstrationTime = 0 }: { plan: PlanId; title: string; risk: string; confidence: number; onClose: () => void; onConfirm: (review: HumanReviewInput) => void; demonstration?: boolean; demonstrationTime?: number }) {
  const [evidenceReviewed,setEvidenceReviewed] = useState(false);
  const [constraintsReviewed,setConstraintsReviewed] = useState(false);
  const [reason,setReason] = useState("");
  const [submitting,setSubmitting] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const ready = !demonstration && evidenceReviewed && constraintsReviewed && reason.trim().length >= 8 && !submitting;
  useEffect(() => { closeRef.current = onClose; },[onClose]);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,[tabindex="0"]') ?? []);
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    document.addEventListener("keydown",onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown",onKey); if(trigger?.isConnected) trigger.focus(); };
  },[]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    onConfirm({ reason: reason.trim(), evidenceReviewed: true, constraintsReviewed: true });
  };
  return <div className="hr-backdrop"><button className="hr-scrim" tabIndex={-1} aria-label="关闭人工确认背景" onClick={onClose}/><section ref={panel} className="hr-dialog" role="dialog" aria-modal="true" aria-labelledby="hr-title"><header><div><small>{DECISION_ID} · {demonstration ? "自动演示示例 · 非人工签名" : "人工复核"}</small><h2 id="hr-title">人工确认</h2></div><button className="hr-close" aria-label="关闭人工确认" onClick={onClose}>×</button></header><form onSubmit={submit}><div className="hr-body"><div className="hr-selected"><span>当前人工选择</span><strong>方案 {plan} · {title}</strong></div><div className="hr-summary"><div><span>风险等级（预估）</span><strong>{risk}</strong></div><div><span>智能体置信度</span><strong>{confidence}%</strong></div></div><div className="hr-checks"><label><input type="checkbox" disabled={demonstration} checked={demonstration ? demonstrationTime >= .4 : evidenceReviewed} onChange={event => setEvidenceReviewed(event.target.checked)}/><span>已查看关键证据</span></label><label><input type="checkbox" disabled={demonstration} checked={demonstration ? demonstrationTime >= 1 : constraintsReviewed} onChange={event => setConstraintsReviewed(event.target.checked)}/><span>已核对安全约束</span></label></div><div className="hr-reason"><label htmlFor="hr-reason">确认理由</label><textarea id="hr-reason" rows={4} maxLength={400} minLength={8} required placeholder="说明采用当前方案的依据，以及需要持续跟踪的参数…" readOnly={demonstration} value={demonstration ? (demonstrationTime >= 1.5 ? "演示示例：已核对压力趋势与规程约束，建议安排设备核查并持续监测。" : "") : reason} onChange={event => setReason(event.target.value)} aria-describedby="hr-reason-hint"/></div><div className="hr-reason-hint" id="hr-reason-hint"><span>至少填写 8 个字符，完整保留在审核记录中。</span><span>{demonstration ? "演示示例" : `${reason.trim().length}/400`}</span></div><p className="hr-demo-note">{demonstration ? "这是自动流程中的复核步骤示例，不代表人工签名。手动关闭后可填写自己的复核意见。" : "确认后记录本地审核结果并打开证据与审计。此演示不会向现场设备发送指令。"}</p></div><footer><button type="button" onClick={onClose}>返回修改</button><button className="hr-confirm" type="submit" disabled={!ready}>{demonstration ? "自动演示 · 非人工确认" : submitting ? "正在记录…" : "确认并执行（演示）"}</button></footer></form></section></div>;
}
