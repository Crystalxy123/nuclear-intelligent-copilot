"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type CSSProperties } from "react";
import AnimatedNumber from "./AnimatedNumber";
import { useDemoPlayback } from "@/lib/demo-playback";
import "@/app/motion-decision-enhanced.css";
import EvidenceDrawer, { type EvidenceId } from "./EvidenceDrawer";
import HumanReviewDialog, { type HumanReviewInput } from "./HumanReviewDialog";
import { useDemoEvent, getPlanScores, normalizeWeights, updateEventWeight, setDemoEventPhase, type WeightKey } from "@/lib/demo-event";
import { DECISION_ID, DECISION_PLANS, DECISION_EVIDENCE, EVIDENCE_COUNT, updateDecisionRecord, useDecisionRecord, type DecisionAudit, type PlanAdjustment, type PlanId } from "@/lib/decision-card";

type Detail = { title: string; subtitle: string; description: string; rows: string[][]; pressure?: boolean };
type Modal = { kind: "detail"; detail: Detail } | { kind: "modify" } | { kind: "reject" } | { kind: "audit" } | null;

function DecisionIcon({ name, size = 22 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    document: <><path d="M6 2h9l5 5v15H6Z"/><path d="M15 2v6h5M10 12h6M10 16h6"/></>,
    clipboard: <><rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="6" rx="2"/><path d="M9 12h6M9 16h4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/></>,
    shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m12 6 4 2v4c0 2-4 5-4 5S8 14 8 12V8Z"/></>,
    settings: <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>,
    target: <><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-10M17 3h4v4"/></>,
    arrow: <path d="M4 12h15m-5-5 5 5-5 5"/>, chevron: <path d="m8 9 4 4 4-4M8 14l4 4 4-4"/>,
    check: <path d="m5 12 4 4L19 6"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    balance: <><path d="M12 2v19M6 21h12M3 6h18M6 6 2 15h8ZM18 6l-4 9h8Z"/></>,
    trend: <><path d="M3 3v18h18M6 15l4-6 4 3 6-7"/></>,
    bars: <><path d="M4 15h3v6H4ZM10 10h3v11h-3ZM16 4h3v17h-3Z"/></>,
    energy: <path d="m14 2-10 12h7l-1 8L21 9h-8Z"/>,
    coins: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v4c0 4 16 4 16 0V5M4 10v4c0 4 16 4 16 0v-4M4 15v4c0 4 16 4 16 0v-4"/></>,
    network: <><circle cx="12" cy="4" r="3"/><circle cx="4" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><path d="m10 7-4 9M14 7l4 9M7 19h10"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    fusion: <><path d="M6 3h12a3 3 0 0 1 3 3v4H3V6a3 3 0 0 1 3-3ZM3 14v4a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-4M8 14l4 4 4-4M12 8v10"/></>,
    pulse: <path d="M2 12h4l3-8 4 16 3-12 3 4h3"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
function PanelHeading({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return <header className="dc-panel-head"><DecisionIcon name={icon}/><h2>{title}</h2>{children}</header>;
}
function PressureTrend({ expanded = false }: { expanded?: boolean }) {
  const values = [100,99.85,99.32,99.3,99.21,98.94,98.81,98.68,98.24,98.23,98.15,97.89,97.87,97.54,97.03,96.58,96.24,95.98,95.7];
  const points = values.map((value,index) => `${30+index*216/(values.length-1)},${18+(100-value)*13}`).join(" ");
  return <svg className={expanded ? "dc-pressure-expanded" : undefined} viewBox="0 0 270 108" role="img" aria-label="P101 出口压力在180秒内由相对基线100%下降至95.7%"><defs><linearGradient id={expanded ? "dc-pressure-modal-fill" : "dc-pressure-fill"} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00d6f3" stopOpacity=".22"/><stop offset="1" stopColor="#00d6f3" stopOpacity="0"/></linearGradient></defs>{[100,98,96].map(value => <g key={value}><text x="0" y={22+(100-value)*13}>{value}</text><path className="dc-chart-grid" d={`M30 ${18+(100-value)*13}H256`}/></g>)}<polygon points={`30,84 ${points} 246,84`} fill={`url(#${expanded ? "dc-pressure-modal-fill" : "dc-pressure-fill"})`}/><polyline points={points} fill="none" stroke="#00d7f3" strokeWidth="1.6"/><circle cx="246" cy="73.9" r="2.8" fill="#40f5ec"/><text x="30" y="103">−180 s</text><text x="222" y="103">当前</text><rect x="200" y="34" width="51" height="23" rx="4" fill="#043542" stroke="#087181"/><text className="dc-chart-delta" x="208" y="50">−4.3%</text></svg>;
}

function AnimatedMetric({ value, identity, delay }: { value: string; identity: string; delay: number }) {
  const number = value.match(/[0-9]+(?:\.[0-9]+)?/);
  if (!number || number.index === undefined) return <>{value}</>;
  return <AnimatedNumber value={Number(number[0])} digits={number[0].includes(".") ? 1 : 0} prefix={value.slice(0,number.index)} suffix={value.slice(number.index+number[0].length)} firstFromZero identity={identity} delay={delay}/>;
}
function RiskGauge({ moderate }: { moderate: boolean }) {
  const risk = moderate ? 38 : 20;
  return <svg className="dme-risk-gauge" viewBox="0 0 100 55" role="img" aria-label={`场景风险指标 ${risk}，${moderate ? "中低风险" : "低风险"}`} style={{"--risk-offset": 100 - risk} as CSSProperties}><path d="M8 48A42 42 0 0 1 92 48" pathLength="100" fill="none" stroke="#17475a" strokeWidth="7"/><path className="dme-risk-arc" d="M8 48A42 42 0 0 1 92 48" pathLength="100" fill="none" stroke={moderate ? "#f3b756" : "#18e6c0"} strokeWidth="7" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100-risk}/></svg>;
}

const defaultAdjustment = (id: PlanId): PlanAdjustment => ({
  note: id === "A" ? "维持当前工况，加强运行参数监测。" : id === "B" ? "优化循环水泵流量，安排 P-201 设备核查。" : "切换备用机组，提高设备冗余，保留更多运行裕度。",
  reviewWindow: "2 小时内", monitorInterval: "30 秒",
});
const timeLabel = (date: string) => new Date(date).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
const makeAudit = (action: DecisionAudit["action"], plan: PlanId, message: string, revision: number): DecisionAudit => ({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), action, plan, message, revision });

export default function DecisionCenter({ onApproved }: { onApproved?: () => void }) {
  const record = useDecisionRecord();
  const playback = useDemoPlayback();
  const [demoReviewDismissed, setDemoReviewDismissed] = useState(false);
  const demonstrationReview = playback.active && playback.elapsed >= 21 && playback.elapsed < 24 && !demoReviewDismissed;
  const demoEvent = useDemoEvent();
  const scores = getPlanScores(demoEvent.weights);
  const normalized = normalizeWeights(demoEvent.weights);
  const riskLabel = demoEvent.riskLevel === "medium-low" ? "中低" : "低";
  const [evidenceDrawer, setEvidenceDrawer] = useState<EvidenceId | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const selectedPlan = DECISION_PLANS.find(plan => plan.id === record.selected)!;
  const adjustment = record.adjustments[record.selected];
  const [modal, setModal] = useState<Modal>(null);
  const [draftPlan, setDraftPlan] = useState<PlanId>("B");
  const [draft, setDraft] = useState<PlanAdjustment>({ note: "", reviewWindow: "2 小时内", monitorInterval: "30 秒" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const modalRef = useRef<HTMLElement>(null);
  const open = modal !== null;
  const reviewed = record.status !== "waiting";
  const statusText = record.status === "approved" ? "已确认 · 待验证" : record.status === "rejected" ? "已驳回" : record.revision > 1 ? "已修改 · 待确认" : "待人工确认";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setModal(null); }
      if (event.key !== "Tab") return;
      const buttons = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]') ?? []).filter(element => element.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
    };
    document.addEventListener("keydown",onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown",onKey); if(trigger?.isConnected) trigger.focus(); };
  }, [open]);

  const showEvidence = (id: string) => setEvidenceDrawer(id as EvidenceId);
  const selectPlan = (id: PlanId) => { if (!reviewed) updateDecisionRecord(current => ({ ...current, selected: id })); };
  const openModify = () => {
    setDraftPlan(record.selected);
    setDraft(adjustment ?? defaultAdjustment(record.selected));
    setError(""); setModal({ kind: "modify" });
  };
  const saveModification = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.note.trim()) { setError("请填写修改后的处置建议。"); return; }
    const nextDraft = { ...draft, note: draft.note.trim() };
    const revision = record.revision + 1;
    const audit = makeAudit("modified", draftPlan, `修改建议：${nextDraft.note}；核查时限：${nextDraft.reviewWindow}；监测间隔：${nextDraft.monitorInterval}。`, revision);
    updateDecisionRecord(current => ({ ...current, selected: draftPlan, status: "waiting", revision, adjustments: { ...current.adjustments, [draftPlan]: nextDraft }, audit: [...current.audit, audit] }));
    setDemoEventPhase("comparison");
    setModal(null); setToast(`方案 ${draftPlan} 的修改已保存，等待重新确认。`);
  };
  const reject = (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) { setError("请填写驳回原因，便于后续复核。"); return; }
    const audit = makeAudit("rejected", record.selected, reason.trim(), record.revision);
    updateDecisionRecord(current => current.status === "waiting" ? { ...current, status: "rejected", audit: [...current.audit,audit] } : current);
    setModal(null); setToast(`方案 ${record.selected} 已驳回，原因已记录。`);
  };
  const approve = (review: HumanReviewInput) => {
    if (reviewed) return;
    const audit: DecisionAudit = { ...makeAudit("approved", record.selected, `林岳已完成本地人工复核，选择方案 ${record.selected}。确认理由：${review.reason}；已查看关键证据、已核对安全约束。${adjustment ? `采用修改建议：${adjustment.note}；核查时限：${adjustment.reviewWindow}；监测间隔：${adjustment.monitorInterval}；修改后预期结果待复核。` : selectedPlan.description} 尚未下发设备指令，执行结果待验证。`, record.revision), humanReview: { ...review, confidence: demoEvent.confidence, recommendedPlan: demoEvent.recommendedPlan, weights: { ...demoEvent.weights } } };
    let approved = false;
    updateDecisionRecord(current => {
      if (current.status !== "waiting" || current.revision !== record.revision || current.selected !== record.selected) return current;
      approved = true;
      return { ...current, status: "approved", audit: [...current.audit,audit] };
    });
    setReviewOpen(false);
    if (!approved) { setToast("决策卡已更新，请核对当前方案后重新确认。"); return; }
    setDemoEventPhase("human-review");
    setToast(`方案 ${record.selected} 的人工确认已记录。`);
    onApproved?.();
  };
  const showResult = (index: number) => {
    if (adjustment) {
      setModal({kind:"detail",detail:{title:`方案 ${record.selected} · 修改后待复核`,subtitle:"修改建议尚未重新评估",description:"当前展示已保存的人工修改建议。原方案的演示预估不作为本次修改后的结果。",rows:[["修改建议",adjustment.note],["核查时限",adjustment.reviewWindow],["监测间隔",adjustment.monitorInterval]]}});
      return;
    }
    const labels = ["风险等级", "能耗影响", "新增消纳", "预计综合收益"];
    setModal({ kind: "detail", detail: { title: `方案 ${record.selected} · ${labels[index]}`, subtitle: "仿真场景 · 预期结果", description: selectedPlan.rationale, rows: [["风险变化", `中低 → ${selectedPlan.risk}`], ["辅机能耗", selectedPlan.energy], ["新增消纳", selectedPlan.renewable], ["预计综合收益", selectedPlan.benefit], ["评估口径", "采用本地演示场景预设，尚未执行验证"]] } });
  };
  const showOpinion = (name: string) => setModal({ kind: "detail", detail: { title: `${name} · 分析意见`, subtitle: `多智能体协同 · 原始分析意见`, description: name === "安全智能体" ? "建议持续监测压力变化，并把设备核查作为调整策略的前提。" : name === "经济智能体" ? "方案 B 在当前演示场景中兼顾效率与收益，辅机能耗预估降低 3.4%。" : "主泵压力异常的根因尚待核查，建议补充就地振动和阀门反馈记录。", rows: [["初始分析建议", "方案 B · 调整策略并安排核查"], ["当前加权推荐", `方案 ${demoEvent.recommendedPlan} · 基于当前权重`], ["当前人工选择", `方案 ${record.selected} · ${selectedPlan.title}`], ["执行条件", "完成核查、人工确认并持续监测"]] } });

  return <div className="dc-page">
    <div className="dc-main">
      <header className="dc-heading"><span className="dc-heading-icon"><DecisionIcon name="clipboard"/></span><div className="dc-heading-copy"><span className="dc-eyebrow">决策卡片</span><div className="dc-title-row"><h1>统一决策卡</h1><span className={`dc-status ${record.status}`}><i/>{statusText}</span></div><p className="dc-meta"><span>{DECISION_ID}</span><span>生成于 2026-10-04 18:28:16</span><span>模型版本 NIC-1.4</span><button className="dc-audit-trigger" onClick={() => setModal({ kind: "audit" })}>审核记录{record.audit.length ? ` · ${record.audit.length}` : ""}</button></p></div><span className="dc-motto">更安全 · 更智能 · 更清洁的核能未来</span></header>
      <section className="dc-hero"><img className="dc-hero-image" src="/assets/decision-plant-banner.png" alt="深蓝色数字孪生核电厂建筑群"/><div className="dc-hero-copy"><h2>{demoEvent.analysisStage === "complete" ? "三个智能体完成方案比较" : "Event-021 处置方案预览"}</h2><p>{demoEvent.analysisStage === "complete" ? "安全、经济、设备三大智能体协同分析，基于多维证据给出建议方案。" : "当前展示本地预设方案；从实时机组触发异常并启动协同分析，可完整查看决策形成过程。"}</p><div className="dc-hero-features"><span><DecisionIcon name="network"/>多智能体协同</span><span><DecisionIcon name="fusion"/>多源证据融合</span><span><DecisionIcon name="clock"/>全流程可追溯</span></div></div><div className="dc-hero-caption"><span>数字孪生驱动</span><strong>科学决策 · 稳定运行</strong><small>NUCLEAR<br/>A SAFER TOMORROW</small></div></section>
      <section className="dc-panel dc-incident"><PanelHeading icon="info" title="发生了什么"/><div className="dc-incident-body"><div className="dc-risk"><span>风险等级</span><RiskGauge moderate={demoEvent.riskLevel === "medium-low"}/><strong>{riskLabel}</strong><small>{demoEvent.analysisStage === "complete" ? "仍在可控范围内" : "等待协同分析复核"}</small></div><div className="dc-incident-copy"><h3>{demoEvent.alarmTriggered ? "主泵 P-201 出口压力持续下降" : "P-201 预设异常事件"}</h3><p>{!demoEvent.alarmTriggered && "场景预览（尚未触发）："}{demoEvent.eventId} · 过去 180 秒压力下降 {demoEvent.pressureDrop}%，系统共 3 条报警关联同一事件。当前参数仍在安全边界内，但下降趋势需要持续关注。</p><div className="dc-tags"><button className="cyan" onClick={() => showEvidence("pressure")}>压力 P101 ↓ 4.3%</button><button className="amber" onClick={() => showEvidence("alarms")}><DecisionIcon name="pulse" size={15}/>报警 A317</button><button className="purple" onClick={() => showEvidence("history")}><DecisionIcon name="fusion" size={15}/>历史相似度 82%</button></div></div><button className="dc-pressure-chart" aria-label="查看 P101 压力趋势详情" onClick={() => showEvidence("pressure")}><span>P101 压力趋势 <small>基线 = 100%</small></span><PressureTrend/></button></div></section>
      <section className="dc-panel dci-weights"><PanelHeading icon="balance" title="评价权重调整"><span>自动归一化 · 实时比较</span></PanelHeading><div className="dci-weight-grid">{([{ key: "safety", label: "安全性" }, { key: "economy", label: "经济性" }, { key: "equipment", label: "设备寿命" }, { key: "green", label: "绿色效益" }] as { key: WeightKey; label: string }[]).map(item => <label key={item.key} htmlFor={`weight-${item.key}`}><span>{item.label}<strong><AnimatedNumber value={normalized[item.key] * 100} digits={1}/><small>%</small></strong></span><input id={`weight-${item.key}`} type="range" min="0" max="100" step="1" value={demoEvent.weights[item.key]} disabled={reviewed} aria-label={`${item.label}权重`} aria-valuetext={`归一化权重 ${(normalized[item.key] * 100).toFixed(1)}%`} onChange={event => updateEventWeight(item.key,Number(event.target.value))}/></label>)}</div><div className="dci-weight-note"><span>{reviewed ? "审核依据已锁定，点击“修改”后可重新调整。" : "拖动权重会更新综合评分，推荐变化不会更改你的选择。"}</span><span key={demoEvent.recommendedPlan} className="dci-recommendation" role="status">推荐：方案 {demoEvent.recommendedPlan}</span></div></section>
      <section className="dc-panel dc-options"><PanelHeading icon="balance" title="可选方案"><button className="dc-info-button" onClick={() => setModal({kind:"detail",detail:{title:"方案比较口径",subtitle:"本地仿真场景 · 多目标评估",description:"安全、运行效率与设备冗余共同参与方案比较。四项权重自动归一化后参与加权评分，当前最高分作为演示推荐。推荐变化不会替代人工选择。",rows:DECISION_PLANS.map(plan=>[`方案 ${plan.id}`,`安全 ${plan.safety} / 效率 ${plan.efficiency} · ${plan.title}`])}})}>基于多目标评估的推荐方案<DecisionIcon name="info" size={16}/></button></PanelHeading><div className="dc-option-grid" role="group" aria-label="选择处置方案">{DECISION_PLANS.map(plan => <button key={plan.id} className={`dc-option ${record.selected === plan.id ? "selected" : ""} ${plan.id === demoEvent.recommendedPlan ? "recommended" : ""}`} aria-pressed={record.selected === plan.id} disabled={reviewed} onClick={() => selectPlan(plan.id)} title={record.adjustments[plan.id] ? `${record.adjustments[plan.id]!.note} 核查：${record.adjustments[plan.id]!.reviewWindow}；监测：${record.adjustments[plan.id]!.monitorInterval}。` : reviewed ? "点击底部修改可重新选择并审核方案" : plan.title}><div className="dc-option-top"><DecisionIcon name={plan.icon}/><span>方案 {plan.id}</span>{plan.id === demoEvent.recommendedPlan && <em key={demoEvent.recommendedPlan} className="dci-recommendation">推荐方案</em>}</div><h3>{plan.title}</h3><p>{record.adjustments[plan.id] ? <><span className="dc-plan-schedule">核查：{record.adjustments[plan.id]!.reviewWindow} · 每 {record.adjustments[plan.id]!.monitorInterval} 监测</span>{record.adjustments[plan.id]!.note}</> : plan.description}</p><div className="dci-score"><span>综合评分</span><strong><AnimatedNumber value={scores.find(item=>item.plan===plan.id)!.score} digits={1}/><small> / 100</small></strong><span className="dci-selected-label">{record.selected === plan.id ? "已选择" : "点击选择"}</span></div><div className="dme-score-bar" aria-hidden="true"><i style={{transform:`scaleX(${scores.find(item=>item.plan===plan.id)!.score/100})`}}/></div><div className="dc-option-scores"><span>安全 <b>{plan.safety}</b></span><span>效率 <b>{plan.efficiency}</b></span>{record.adjustments[plan.id] && <small>已修改</small>}</div><span className="dc-option-check"><DecisionIcon name={record.selected === plan.id ? "check" : "arrow"} size={17}/></span></button>)}</div><div className="dci-recommendation-row"><span>系统推荐 <b>方案 {demoEvent.recommendedPlan}</b> · 人工选择 <b>方案 {record.selected}</b></span><button aria-expanded={explanationOpen} aria-controls="dci-explanation" onClick={() => setExplanationOpen(current=>!current)}>为什么推荐？ <DecisionIcon name="chevron" size={13}/></button></div>{explanationOpen && <section id="dci-explanation" className="dci-explanation" aria-label="方案推荐理由"><h3>推荐方案 {demoEvent.recommendedPlan} <small>依据当前权重与场景预设</small></h3><div>{[{number:"01",title:"安全性",evidence:"model",text:demoEvent.recommendedPlan === "C" ? `安全指标为 100 分，当前安全权重 ${(normalized.safety * 100).toFixed(1)}%；保守运行提供更多安全裕度。` : "当前仍有安全裕度，安排核查可兼顾运行与风险控制。"},{number:"02",title:"设备",evidence:"pressure",text:demoEvent.recommendedPlan === "C" ? `设备寿命指标为 97 分，当前设备权重 ${(normalized.equipment * 100).toFixed(1)}%；备用机组提供更高冗余。` : "P-201 压力下降 4.3%，需要安排设备核查并跟踪变化。"},{number:"03",title:"经济性",evidence:"procedure",text:demoEvent.recommendedPlan === "C" ? "接受更保守的经济收益，优先保障设备冗余与运行裕度。" : "在安全约束下优化辅机，减少不必要的负荷调整与发电损失。"},{number:"04",title:"历史经验",evidence:"history",text:`相似案例匹配度 ${demoEvent.similarity}%，支持复核泵效率和出口阀门反馈。`}].map(item=><button key={item.number} onClick={()=>showEvidence(item.evidence)}><span>{item.number}</span><div><strong>{item.title}</strong><p>{item.text}</p></div><DecisionIcon name="arrow" size={16}/></button>)}</div><p className="dci-explanation-foot">综合评分采用本地示例指标与归一化权重，不替代安全约束核查。</p></section>}</section>
      <section className="dc-panel dc-results"><PanelHeading icon="trend" title={`方案 ${record.selected} 预期结果`}>{adjustment && <span className="dc-reassessment">修改后待重新评估</span>}</PanelHeading><div className="dc-result-grid">{[{icon:"shield",label:"风险等级",value:<>{riskLabel} <b>→</b> <em>{selectedPlan.risk}</em></>},{icon:"bars",label:"能耗影响",value:selectedPlan.energy},{icon:"energy",label:"新增消纳",value:selectedPlan.renewable},{icon:"coins",label:"预计综合收益",value:selectedPlan.benefit}].map((item,index) => <button className="dc-result" key={item.label} style={{"--result-delay":`${index*150}ms`} as CSSProperties} onClick={() => showResult(index)}><DecisionIcon name={item.icon} size={29}/><div><span>{item.label}</span><strong>{adjustment ? "待复核" : typeof item.value === "string" ? <AnimatedMetric value={item.value} identity={`decision-result-${record.selected}-${index}`} delay={index*150}/> : item.value}</strong></div><DecisionIcon name="chevron" size={14}/></button>)}</div></section>
    </div>
    <aside className="dc-panel dc-evidence"><PanelHeading icon="clipboard" title="证据链"><span>{DECISION_EVIDENCE.length} 条关键证据支撑</span></PanelHeading><div className="dc-evidence-list">{DECISION_EVIDENCE.map(item => <button className={`dc-evidence-item ${item.tone}`} key={item.id} onClick={() => showEvidence(item.id)}><span className="dc-evidence-number">{item.number}</span><DecisionIcon name={item.icon} size={25}/><div><small>{item.category}</small><strong>{item.title}</strong></div><DecisionIcon name="arrow" size={17}/></button>)}</div><div className="dc-uncertainty"><DecisionIcon name="warning" size={34}/><div><strong>不确定性说明</strong><p>设备退化速率基于 180 秒观测窗口，未来 30 分钟预测区间为 ±1.2%（场景预设）。</p></div></div><section className="dc-agent-opinions"><h3><DecisionIcon name="settings"/>智能体意见</h3>{["安全智能体","经济智能体","设备智能体"].map((name,index) => <button className="dc-agent-vote" key={name} onClick={() => showOpinion(name)}><i className={`vote-${index}`}/><span>{name}</span><DecisionIcon name="arrow" size={16}/><strong>初始 B</strong></button>)}</section></aside>
    <footer className={`dc-approval-bar ${record.status}`}><img className="dc-approval-thumb" src="/assets/decision-plant-banner.png" alt=""/><div className="dc-current-selection"><small>当前选择{record.revision > 1 ? ` · 修订 ${record.revision}` : ""}</small><strong>方案 {record.selected} · {selectedPlan.title}</strong></div><div className="dc-confidence"><span>{adjustment ? "评估状态" : "智能体置信度"}</span><strong>{adjustment ? "待复核" : <AnimatedNumber value={demoEvent.confidence} suffix="%" firstFromZero identity="decision-confidence"/>}</strong>{!adjustment && <div><i style={{width:"86%"}}/></div>}<small>{adjustment ? "修改建议尚待重新评估" : `基于 ${EVIDENCE_COUNT} 项证据的综合评估`}</small></div><div className="dc-approval-note"><DecisionIcon name={record.status === "approved" ? "check" : "info"} size={18}/><span>{record.status === "approved" ? "已由林岳确认 · 待验证" : record.status === "rejected" ? "已驳回 · 可修改后重审" : "需值长复核确认"}</span></div><div className="dc-approval-actions"><button className="dc-reject" disabled={reviewed} onClick={() => { setReason("");setError("");setModal({kind:"reject"}); }}>驳回</button><button className="dc-modify" onClick={openModify}>修改</button><button className="dc-confirm" disabled={reviewed} onClick={() => setReviewOpen(true)}><DecisionIcon name="check" size={18}/>{record.status === "approved" ? "已确认决策" : record.status === "rejected" ? "已驳回" : "确认决策"}</button></div></footer>
    {modal && <div className="dc-modal-backdrop"><button className="dc-modal-scrim" aria-label="关闭决策详情背景" onClick={() => setModal(null)}/><section ref={modalRef} className="dc-dialog" role="dialog" aria-modal="true" aria-labelledby="dc-dialog-heading"><header><div><small>{DECISION_ID} · 本地仿真决策</small><h2 id="dc-dialog-heading">{modal.kind === "detail" ? modal.detail.title : modal.kind === "modify" ? "修改决策建议" : modal.kind === "reject" ? "驳回决策建议" : "审核记录"}</h2></div><button className="dc-dialog-close" aria-label="关闭决策详情" onClick={() => setModal(null)}><DecisionIcon name="close"/></button></header>
      {modal.kind === "detail" && <><div className="dc-dialog-content"><span className="dc-detail-source">{modal.detail.subtitle}</span><p>{modal.detail.description}</p>{modal.detail.pressure && <PressureTrend expanded/>}<dl className="dc-detail-list">{modal.detail.rows.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><footer className="dc-dialog-footer"><button onClick={() => setModal(null)}>返回决策卡</button></footer></>}
      {modal.kind === "modify" && <form className="dc-review-form" onSubmit={saveModification}><div className="dc-dialog-content"><p>保存修改后，本卡将回到待确认状态，并保留之前的审核记录。</p><label>处置方案<select value={draftPlan} onChange={event => { const id=event.target.value as PlanId;setDraftPlan(id);setDraft(record.adjustments[id] ?? defaultAdjustment(id)); }}><option value="A">方案 A · 继续运行，加强监测</option><option value="B">方案 B · 调整策略并安排核查</option><option value="C">方案 C · 进入保守运行模式</option></select></label><label>处置建议<textarea rows={4} maxLength={400} value={draft.note} onChange={event => {setDraft({...draft,note:event.target.value});setError("");}} aria-invalid={!!error} aria-describedby={error ? "dc-form-error" : undefined}/></label><div className="dc-form-grid"><label>核查时限<select value={draft.reviewWindow} onChange={event=>setDraft({...draft,reviewWindow:event.target.value})}>{["30 分钟内","2 小时内","4 小时内"].map(value=><option key={value}>{value}</option>)}</select></label><label>监测间隔<select value={draft.monitorInterval} onChange={event=>setDraft({...draft,monitorInterval:event.target.value})}>{["15 秒","30 秒","60 秒"].map(value=><option key={value}>{value}</option>)}</select></label></div>{error && <p id="dc-form-error" className="dc-form-error" role="alert">{error}</p>}</div><footer className="dc-dialog-footer"><button type="button" onClick={() => setModal(null)}>取消</button><button type="submit">保存修改</button></footer></form>}
      {modal.kind === "reject" && <form className="dc-review-form" onSubmit={reject}><div className="dc-dialog-content"><div className="dc-review-summary"><strong>方案 {record.selected} · {selectedPlan.title}</strong><p>驳回后保留当前证据与记录，可通过“修改”重新提交审核。</p></div><label>驳回原因<textarea rows={4} maxLength={400} placeholder="说明需要补充的证据或调整的建议…" value={reason} onChange={event => {setReason(event.target.value);setError("");}} aria-invalid={!!error} aria-describedby={error ? "dc-form-error" : undefined}/></label>{error && <p id="dc-form-error" className="dc-form-error" role="alert">{error}</p>}</div><footer className="dc-dialog-footer"><button type="button" onClick={() => setModal(null)}>取消</button><button type="submit" className="dc-reject">记录驳回</button></footer></form>}
      {modal.kind === "audit" && <><div className="dc-dialog-content"><p>林岳 · 值长审核。确认结果保存在当前浏览器，尚未下发设备操作。</p><div className="dc-audit-list">{record.audit.length ? record.audit.slice().reverse().map(item => <div key={item.id}><time>{timeLabel(item.timestamp)}</time><strong>{item.action === "approved" ? "确认决策" : item.action === "rejected" ? "驳回决策" : "修改建议"} · 方案 {item.plan} · 修订 {item.revision}</strong><p>{item.message}</p></div>) : <p className="dc-empty">暂无审核记录，当前决策卡等待人工确认。</p>}</div></div><footer className="dc-dialog-footer"><button onClick={() => setModal(null)}>返回决策卡</button></footer></>}
    </section></div>}
    {evidenceDrawer && <EvidenceDrawer initialEvidence={evidenceDrawer} onClose={() => setEvidenceDrawer(null)}/>}
    {(reviewOpen || demonstrationReview) && <HumanReviewDialog demonstration={demonstrationReview} demonstrationTime={playback.elapsed-21} plan={record.selected} title={selectedPlan.title} risk={adjustment ? "修改后待复核" : `${riskLabel} → ${selectedPlan.risk}`} confidence={demoEvent.confidence} onClose={() => { setReviewOpen(false); if (demonstrationReview) setDemoReviewDismissed(true); }} onConfirm={approve}/>}
    {toast && <div className="dc-toast" role="status"><DecisionIcon name="check" size={18}/>{toast}</div>}
  </div>;
}
