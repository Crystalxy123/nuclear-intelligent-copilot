"use client";

import { EVENT_PHASE_LABELS, useDemoEvent } from "@/lib/demo-event";
import { useDecisionRecord } from "@/lib/decision-card";

export default function EventContextBar({ compact, onOpen }: { compact: boolean; onOpen: () => void }) {
  const event = useDemoEvent();
  const decision = useDecisionRecord();
  return <div className={`event-context-bar ${compact ? "event-context-compact" : ""}`} aria-label="当前事件上下文">
    <button className="event-context-object" onClick={onOpen} title="查看 Event-021 关联证据"><span>◎</span><strong>{event.eventId}</strong><b>{event.equipmentId}</b></button>
    <span className={`event-context-risk ${event.riskLevel === "medium-low" ? "attention" : ""}`}>◇ {event.riskLevel === "medium-low" ? "中低风险" : "低风险"}</span>
    <span className="event-context-phase" key={event.phase}>{EVENT_PHASE_LABELS[event.phase]}</span>
    <span className="event-context-plan">推荐 <b>方案 {event.recommendedPlan}</b></span>
    <span className="event-context-record">{event.decisionId}<i>r{decision.revision} · {decision.status === "approved" ? "已确认，待验证" : decision.status === "rejected" ? "待修订" : "待确认"}</i></span>
    <small>本地演示</small>
  </div>;
}
