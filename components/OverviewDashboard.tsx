"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDemoEvent, getEventPressure, EVENT_PHASE_LABELS, type AnalysisAgent } from "@/lib/demo-event";
import { useDecisionRecord, DECISION_PLANS } from "@/lib/decision-card";
import TwinOperatingLayer from "./TwinOperatingLayer";
import AnimatedNumber from "./AnimatedNumber";
import { useAlarmPresentation } from "@/lib/use-alarm-presentation";

type AgentKey = "safety" | "green" | "energy";
type Destination = "copilots" | "decision" | "simulation" | "evidence";
type TwinView = "scene" | "process" | "parameters";
type Detail = { title: string; description: string; rows: [string, string][]; action?: Destination };

function OverviewIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    shield: <><path d="M12 22S3 18 3 9V5l9-3 9 3v4c0 9-9 13-9 13Z"/><path d="M12 3v17M4 6l8 4 8-4"/></>,
    safe: <><path d="M12 22S3 18 3 9V5l9-3 9 3v4c0 9-9 13-9 13Z"/><path d="m8 12 3 3 5-6"/></>,
    alarm: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/></>,
    document: <><path d="M5 2h10l4 4v16H5Z"/><path d="M14 2v5h5M8 10h7M8 14h8M8 18h5"/></>,
    brain: <><path d="M12 4c-2-4-7-1-6 2-4 0-5 6-2 8-2 4 2 7 5 5 0 3 3 3 3 0V4Zm0 0c2-4 7-1 6 2 4 0 5 6 2 8 2 4-2 7-5 5 0 3-3 3-3 0"/><path d="M8 7v3l-2 2M16 7v3l2 2M8 15l4-2 4 2"/></>,
    leaf: <><path d="M21 3S8 2 4 12c-3 8 8 12 13 3 3-5 4-12 4-12Z"/><path d="m3 22 14-15"/></>,
    wrench: <path d="m14 4 3 3 4-4c2 6-1 10-7 9L5 22l-4-4 10-9c-1-6 3-9 7-7Z"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    expand: <path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>,
    contract: <path d="M3 9h6V3M15 3v6h6M21 15h-6v6M9 21v-6H3"/>,
    twin: <><path d="M4 20V8a3 3 0 0 1 6 0v12Zm10 0V5a3 3 0 0 1 6 0v15Z"/><path d="M2 20h20M10 12h4M7 3V1M17 2V0M5 10h4M15 8h4"/></>,
    timeline: <><circle cx="12" cy="13" r="9"/><path d="M12 7v6l4 2M12 1v3M4 4l2 2M20 4l-2 2"/></>,
    spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/><path d="M12 8v8M8 12h8"/></>,
    drop: <><path d="M12 2S4 10 4 15a8 8 0 0 0 16 0c0-5-8-13-8-13Z"/><path d="m12 8-3 6h3v5l3-7h-3Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.document}</svg>;
}

const equipment = [
  { key: "steam", name: "蒸汽发生器", value: "15.6 MPa", sub: "323.4 °C", description: "通过传热管束将一回路热量传递至二回路，支持稳定蒸汽供应。", rows: [["压力", "15.6 MPa"], ["温度", "323.4 °C"], ["运行状态", "稳定"], ["监测来源", "SG-01 · 仿真测点"]] },
  { key: "reactor", name: "反应堆压力容器", value: "15.6 MPa", sub: "325.1 °C", description: "反应堆压力容器的运行快照。当前压力与温度处于本场景设定的正常区间。", rows: [["压力", "15.6 MPa"], ["温度", "325.1 °C"], ["运行状态", "正常"], ["监测来源", "RPV-01 · 仿真测点"]] },
  { key: "turbine", name: "汽轮机", value: "3,000 rpm", sub: "1,248 MWe", description: "汽轮发电机组将二回路蒸汽热能转化为电能，当前按场景基准工况稳定运行。", rows: [["转速", "3,000 rpm"], ["电功率", "1,248 MWe"], ["运行状态", "并网运行"], ["监测来源", "TG-01 · 仿真测点"]] },
  { key: "pump", name: "主泵 P-201", value: "运行中", sub: "功率 6.8 MW", description: "主泵处于运行状态。智能体正在复核一回路压力波动与泵组运行特征，分析结果需人工确认。", rows: [["运行状态", "运行中"], ["驱动功率", "6.8 MW"], ["健康度", "82.6%"], ["当前任务", "压力趋势与振动特征复核"]] },
  { key: "cooling", name: "冷却海水系统", value: "进水温度 12.1 °C", sub: "流量 8,450 m³/h", description: "冷却海水系统为机组提供稳定冷源，当前水温与流量采用仿真场景快照。", rows: [["进水温度", "12.1 °C"], ["流量", "8,450 m³/h"], ["运行状态", "正常"], ["当前策略", "按负荷匹配冷却能力"]] },
] as const;

const timeline = [
  { title: "异常检测", description: "识别参数偏离", detail: "保留 P101 压力下降事件的原始快照与 A317 关联报警。" },
  { title: "诊断分析", description: "多源数据研判", detail: "结合压力趋势、泵组状态及历史场景进行关联诊断。" },
  { title: "安全评估", description: "复核安全边界", detail: "复核压力、温度、流量和反应性，形成候选方案的前置约束。" },
  { title: "方案比较", description: "比较 A / B / C", detail: "对安全性、经济性、设备寿命和绿色效益进行加权比较。" },
  { title: "决策生成", description: "形成处置建议", detail: "汇总分析证据，形成方案及对应决策记录，等待值长确认。" },
  { title: "人工复核", description: "值长审核留痕", detail: "记录人工审核及本地归档状态；此演示不会下发真实设备指令。" },
];

function ProcessDiagram({ onEquipment }: { onEquipment: (key: string) => void }) {
  return <div className="ov-process"><div className="ov-process-heading"><h3>核电机组工艺流程</h3><p>一回路传热 · 二回路发电 · 冷源换热</p></div><svg viewBox="0 0 1000 390" role="img" aria-label="反应堆经蒸汽发生器向汽轮发电机组传热，冷却系统回收余热的工艺示意">
    <defs><linearGradient id="ov-vessel" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#05324f"/><stop offset=".5" stopColor="#0a7089"/><stop offset="1" stopColor="#022c46"/></linearGradient></defs>
    <g className="ov-process-grid">{[70,130,190,250,310,370].map(y => <path key={y} d={`M30 ${y}H970`}/>)}{[70,170,270,370,470,570,670,770,870,970].map(x => <path key={x} d={`M${x} 30V370`}/>)}</g>
    <path className="ov-flow ov-flow-primary" d="M218 143H363V252H219"/><path className="ov-flow ov-flow-steam" d="M405 97H656V154H719"/><path className="ov-flow ov-flow-return" d="M758 211V272H406V206"/><path className="ov-flow ov-flow-cooling" d="M806 293H913V172H808"/>
    <g className="ov-process-vessel"><rect x="118" y="85" width="103" height="194" rx="47"/><path d="M142 237V132h54v105M156 131v105M182 131v105"/><text x="170" y="312">反应堆压力容器</text><text x="170" y="336" className="ov-process-reading">15.6 MPa · 325.1 °C</text></g>
    <g className="ov-process-vessel"><rect x="362" y="91" width="83" height="125" rx="29"/><path d="M380 118v64q22 24 45 0v-64"/><text x="403" y="54">蒸汽发生器</text><text x="403" y="76" className="ov-process-reading">323.4 °C</text></g>
    <g className="ov-process-pump"><circle cx="300" cy="252" r="23"/><path d="m290 239 22 13-22 13Z"/><text x="300" y="296">主泵 P-201</text><text x="300" y="317" className="ov-process-reading">6.8 MW</text></g>
    <g className="ov-process-vessel"><path d="M682 124h41l83-30v145l-83-31h-41Z"/><path d="M733 124v83M750 118v96M769 111v108"/><text x="746" y="57">汽轮发电机组</text><text x="746" y="79" className="ov-process-reading">3,000 rpm · 1,248 MWe</text></g>
    <g className="ov-process-vessel"><rect x="698" y="260" width="121" height="52" rx="8"/><path d="m709 274 14 21 15-21 15 21 15-21 15 21 15-21"/><text x="758" y="347">凝汽器</text></g>
    <g className="ov-process-vessel"><rect x="873" y="106" width="74" height="81" rx="7"/><path d="M888 122v50M903 122v50M918 122v50M932 122v50"/><text x="909" y="216">冷却海水</text><text x="909" y="237" className="ov-process-reading">12.1 °C</text></g>
    <text x="278" y="120" className="ov-flow-label">一回路</text><text x="543" y="86" className="ov-flow-label">蒸汽流</text><text x="544" y="294" className="ov-flow-label">给水回流</text>
  </svg><div className="ov-process-links">{equipment.map(item => <button key={item.key} onClick={() => onEquipment(item.key)}>{item.name}<span>↗</span></button>)}</div></div>;
}

function trapDialogFocus(container: HTMLElement | null, close: () => void, suspended = () => false) {
  const previousFocus = document.activeElement as HTMLElement | null;
  const focusable = () => Array.from(container?.querySelectorAll<HTMLElement>('button, select, [tabindex="0"]') ?? []).filter(element => element.tabIndex >= 0 && !element.closest('[hidden]'));
  focusable()[0]?.focus();
  const keydown = (event: KeyboardEvent) => {
    if (suspended()) return;
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key !== "Tab") return;
    const elements = focusable();
    const first = elements[0]; const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  document.addEventListener("keydown", keydown);
  return () => { document.removeEventListener("keydown", keydown); if (previousFocus?.isConnected) previousFocus.focus(); };
}

export function OverviewSidebarStatus() {
  return <div className="ov-sidebar-extra"><div className="ov-side-decoration"><svg viewBox="0 0 210 105" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true"><path d="M0 96h210M13 95V84l22-7 18 5v13M22 94V84h13v11M35 81V63h24v32M39 69h17M62 95V73h17v22M80 96V66l27-9 19 7v31M103 59V21h5v41M103 28h5M103 37h5M103 46h5M129 95V41q0-10 26-10t26 10v54M127 42q25-14 57 0M134 45v50M177 45v50M133 48q20-10 43 0M133 64q20-10 43 0M186 95V81h15v14M89 79h9v16M10 88h5M46 78h8M46 87h8M153 31V17M125 95h62"/><path d="M0 99h210M5 103h200M65 70V60h12v10M68 60V49h4v11"/></svg><p>守护安全 · 驱动未来</p><small>SAFE NUCLEAR · BETTER TOMORROW</small></div><div className="ov-side-health"><div className="ov-side-ring"><svg viewBox="0 0 90 90" aria-hidden="true"><circle cx="45" cy="45" r="35" fill="none" stroke="#0b4460" strokeWidth="5"/><circle cx="45" cy="45" r="35" fill="none" stroke="#00ead8" strokeWidth="5" strokeDasharray="210 220" transform="rotate(-90 45 45)"/></svg><strong>98.7<small>%</small></strong></div><dl>{["计算服务", "数据服务", "网络通信"].map(label => <div key={label}><dt><i>✓</i>{label}</dt><dd>正常</dd></div>)}</dl></div><span className="ov-side-version">版本 v1.0.0</span></div>;
}

export default function OverviewDashboard({ go, onOpenAgent, pendingDecisions = 1 }: { go: (view: Destination) => void; onOpenAgent: (agent: AgentKey) => void; pendingDecisions?: number }) {
  const event = useDemoEvent();
  const alarmMotion = useAlarmPresentation();
  const record = useDecisionRecord();
  const analyzing = event.analysisStage === "processing" || event.analysisStage === "results";
  const analyzed = event.analysisStage === "complete";
  const review = event.phase === "human-review";
  const archived = event.phase === "archived";
  const risk = event.riskLevel === "medium-low" ? "中低" : "低";
  const selectedPlan = DECISION_PLANS.find(plan => plan.id === (review || archived ? record.selected : event.recommendedPlan))!;
  const reviewLabel = record.status === "approved" ? "人工已确认" : record.status === "rejected" ? "已驳回 · 待修改" : "等待人工确认";
  const pendingForEvent = analyzed || review || archived ? pendingDecisions : 0;
  const agentState = (id: AnalysisAgent) => {
    const done = event.agentResults.includes(id);
    return { progress: done ? 100 : event.analysisProgress, status: done ? archived ? "已留档" : "分析完成" : analyzing ? "分析中" : "待启动", task: done ? { safety: "安全边界内，综合风险为中低。", green: "不因单一压力趋势立即降低机组负荷。", equipment: "安排 P-201 设备核查，根因待确认。" }[id] : analyzing ? { safety: "正在复核 P101 与安全边界…", green: "正在评估负荷调整与能效影响…", equipment: "正在关联 P-201 设备与历史证据…" }[id] : event.alarmTriggered ? "异常已识别，等待启动协同分析。" : "持续监测，等待 Event-021 异常触发。" };
  };
  const stepState = (index: number) => {
    const done = index === 0 ? event.alarmTriggered : index < 3 ? analyzed : index < 5 ? review || archived : archived || (review && record.status === "approved");
    const current = !done && (index === 0 ? !event.alarmTriggered : index === 1 ? event.alarmTriggered && !analyzed : index === 2 ? analyzing && event.agentResults.includes("safety") : index === 3 ? analyzed && !review && !archived : index === 5 ? review : false);
    const label = done ? index === 5 ? archived ? "本地副本已归档" : "人工已确认" : "已完成" : current ? index === 0 ? "监测中" : index === 1 ? analyzing ? "分析中" : "待启动" : index === 3 ? "待比较确认" : index === 5 ? reviewLabel : "处理中" : "待开展";
    return { done, current, label };
  };
  const [twinView, setTwinView] = useState<TwinView>("scene");
  const [camera, setCamera] = useState("panorama");
  const [fullscreen, setFullscreen] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const modal = useRef<HTMLElement>(null);
  const twin = useRef<HTMLElement>(null);
  const detailOpen = detail !== null;
  const twinViews = [{ key: "scene", label: "三维视图" }, { key: "process", label: "工艺流程" }, { key: "parameters", label: "关键参数" }] as const;

  const overlayOpen = detailOpen || fullscreen;
  useEffect(() => {
    if (!overlayOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = oldOverflow; };
  }, [overlayOpen]);
  useEffect(() => {
    if (fullscreen) return trapDialogFocus(twin.current, () => setFullscreen(false), () => modal.current !== null);
  }, [fullscreen]);
  useEffect(() => {
    if (detailOpen) return trapDialogFocus(modal.current, () => setDetail(null));
  }, [detailOpen]);

  const openEquipment = (key: string) => {
    const item = equipment.find(entry => entry.key === key);
    if (item?.key === "pump") { setDetail({ title: item.name, description: event.alarmTriggered ? "Event-021 已识别 P-201 出口压力下降，后续分析与核查进度在各工作空间中同步。" : "主泵处于常规监测状态，本次压力下降事件尚未触发。", rows: [["运行状态", "运行中"], ["P101 出口压力", `${getEventPressure(alarmMotion.seconds).toFixed(2)} MPa`], ["当前风险", `${risk}风险`], ["事件阶段", EVENT_PHASE_LABELS[event.phase]], ["关联事件", event.eventId]], action: "evidence" }); return; }
    if (item) setDetail({ title: item.name, description: item.description, rows: item.rows.map(([label, value]) => [label, value]), action: "evidence" });
  };
  const maintenance = () => setDetail({ title: "预测性维护智能体", description: agentState("equipment").task, rows: [["分析状态", agentState("equipment").status], ["分析进度", `${Math.round(agentState("equipment").progress)}%`], ["当前设备", event.equipmentId], ["待补充数据", "就地振动记录 / 阀门反馈"], ["事件阶段", EVENT_PHASE_LABELS[event.phase]]], action: "evidence" });

  return <div className="ov-dashboard">
    <h1 className="ov-visually-hidden">运行总览</h1>
    <section className="ov-kpis" aria-label="运行状态指标">
      <button className="ov-kpi ov-cyan" onClick={() => setDetail({ title: "系统健康度", description: "机组综合健康评分，根据当前仿真场景的运行状态与数据质量汇总。", rows: [["综合评分", "95.3%"], ["较上一周期", "+0.2%"], ["平台服务可用性", "98.7%"], ["数据状态", "同步完成"]] })}><span className="ov-kpi-icon"><OverviewIcon name="shield" size={31}/></span><div className="ov-kpi-copy"><span>系统健康度</span><strong><AnimatedNumber value={95.3} digits={1} firstFromZero identity="overview-health"/><small>%</small></strong><p>↑ +0.2%</p></div><svg className="ov-spark" viewBox="0 0 105 48" aria-hidden="true"><defs><linearGradient id="ov-spark-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00eaff" stopOpacity=".28"/><stop offset="1" stopColor="#00eaff" stopOpacity="0"/></linearGradient></defs><path d="m1 33 10-8 11 5 11-8 10 2 12-13 10 5 10-8 10 3 17-11v48H1Z" fill="url(#ov-spark-fill)"/><path d="m1 33 10-8 11 5 11-8 10 2 12-13 10 5 10-8 10 3 17-11" fill="none" stroke="#07e6f4" strokeWidth="1.6"/></svg></button>
      <button className="ov-kpi ov-green" onClick={() => onOpenAgent("safety")}><span className="ov-kpi-icon"><OverviewIcon name="safe" size={31}/></span><div className="ov-kpi-copy"><span>安全状态</span><strong>{event.alarmTriggered ? "需核查" : "正常"}</strong><p>{event.alarmTriggered ? "· 场景安全边界未触及" : "· 满足场景安全限值"}</p></div></button>
      <button className="ov-kpi ov-amber" onClick={() => onOpenAgent("safety")}><span className="ov-kpi-icon"><OverviewIcon name="alarm" size={31}/></span><div className="ov-kpi-copy"><span>当前风险等级</span><strong>{risk}</strong><p><AnimatedNumber value={event.riskLevel === "medium-low" ? 32 : 12.4} digits={1}/> / 100 <span className="ov-risk-meter"><i style={{ width: event.riskLevel === "medium-low" ? "32%" : "12.4%" }}/></span></p></div></button>
      <button className="ov-kpi ov-blue" onClick={() => setDetail({ title: "运行任务", description: `${event.eventId} 的协同任务与当前事件状态同步。`, rows: [["01 · 安全运行", agentState("safety").status], ["02 · 绿色增效", agentState("green").status], ["03 · 预测性维护", agentState("equipment").status], ["需要关注", event.alarmTriggered ? "P-201 设备核查 · 1 条" : "暂无本事件异常"]], action: "copilots" })}><span className="ov-kpi-icon"><OverviewIcon name="document" size={31}/></span><div className="ov-kpi-copy"><span>协同分析任务</span><strong><AnimatedNumber value={analyzing || analyzed ? 3 : 0} prefix="0"/></strong><p>{analyzing ? "三方正在分析" : analyzed ? "三方分析已完成" : "等待异常触发"}</p></div></button>
      <button className="ov-kpi ov-purple" onClick={() => go("decision")}><span className="ov-kpi-icon"><OverviewIcon name="brain" size={31}/></span><div className="ov-kpi-copy"><span>待决策事项</span><strong><AnimatedNumber value={pendingForEvent} prefix={pendingForEvent<10 ? "0" : ""}/></strong><p>{archived ? "本地副本已归档" : pendingForEvent ? "待人工确认" : analyzed || review ? "本轮审核已完成" : "尚未生成本事件方案"}</p></div><span className="ov-kpi-next"><OverviewIcon name="chevron"/></span></button>
    </section>

    <div className="ov-main">
      {fullscreen && <button className="ov-fullscreen-backdrop" aria-label="退出数字孪生全屏" onClick={() => setFullscreen(false)}/>}
      <section ref={twin} className={`ov-panel ov-twin ${fullscreen ? "ov-fullscreen" : ""}`} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen ? true : undefined} aria-label={fullscreen ? "数字孪生全屏视图" : "机组数字孪生"}>
        <header className="ov-panel-head"><div className="ov-panel-title"><OverviewIcon name="twin"/><h2>机组数字孪生体</h2><span>三维可视化 · 实时数据驱动 · 多物理场耦合仿真</span></div><div className="ov-view-tabs" role="tablist" aria-label="数字孪生视图">{twinViews.map((view, index) => <button key={view.key} id={`ov-tab-${view.key}`} role="tab" aria-selected={twinView === view.key} aria-controls={`ov-view-${view.key}`} tabIndex={twinView === view.key ? 0 : -1} onClick={() => setTwinView(view.key)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % 3 : event.key === "ArrowLeft" ? (index + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1; if (next >= 0) { event.preventDefault(); setTwinView(twinViews[next].key); document.getElementById(`ov-tab-${twinViews[next].key}`)?.focus(); } }}>{view.label}</button>)}</div><button className="ov-expand" aria-label={fullscreen ? "退出全屏" : "放大数字孪生"} onClick={() => setFullscreen(!fullscreen)}><OverviewIcon name={fullscreen ? "contract" : "expand"} size={21}/></button></header>
        <div className="ov-twin-body">
          <div className="ov-scene" id="ov-view-scene" role="tabpanel" aria-labelledby="ov-tab-scene" hidden={twinView !== "scene"}>
            <div className="ov-scene-visual" data-camera={camera}><img className="ov-twin-image" src="/assets/overview-digital-twin.png" alt="深蓝工业空间中的青色全息核电机组数字孪生"/><TwinOperatingLayer alarm={alarmMotion.warningPulse} alarmPulse={alarmMotion.pulseActive} pumpSpeed={alarmMotion.pumpSpeed} steamLevel={alarmMotion.steamLevel}/><div className="um-twin-motion" aria-hidden="true"><i className="um-scan-band"/><i className="um-energy-ring"/><i className="um-energy-ring um-energy-ring-delayed"/><span className="um-particles"><i/><i/><i/><i/><i/></span></div><svg className="ov-callout-lines" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true"><path d="M319 110H355L419 171M650 116l43-58h83M721 223h31l40-48h52M319 282h35l50-36M723 337h35l36-30h55"/><path className="um-line-flow" pathLength="1000" d="M319 110H355L419 171M650 116l43-58h83M721 223h31l40-48h52M319 282h35l50-36M723 337h35l36-30h55"/><circle cx="419" cy="171" r="3"/><circle cx="650" cy="116" r="3"/><circle cx="721" cy="223" r="3"/><circle cx="404" cy="246" r="3"/><circle cx="723" cy="337" r="3"/></svg>{equipment.map(item => <button key={item.key} className={`ov-equipment ov-${item.key}`} onClick={() => openEquipment(item.key)}><i/><strong>{item.name}</strong><span>{item.key === "pump" && event.alarmTriggered ? "压力下降 · 待核查" : item.value}</span><span>{item.key === "pump" ? `P101 ${getEventPressure(alarmMotion.seconds).toFixed(2)} MPa` : item.sub}</span></button>)}</div>
            <div className="ov-twin-caption"><h3>Nuclear<br/>Digital Twin</h3><small>REAL-TIME<br/>SIMULATION<br/>FOR A SAFER TOMORROW</small></div>
            <div className="ov-compass"><svg viewBox="0 0 82 87" fill="none" aria-hidden="true"><path d="m41 17 9 24 23 9-23 9-9 23-9-23-23-9 23-9Z" stroke="#68aed5"/><path d="m41 17 0 33-9-9Zm32 33H41l9 9ZM41 82V50l-9 9ZM9 50h32l9-9Z" fill="#3b658a" stroke="#739ac2" strokeWidth=".6"/><text x="41" y="11">N</text><text x="78" y="53">E</text><text x="41" y="87">S</text><text x="3" y="53">W</text></svg></div>
            <div className="ov-scene-footer"><span className="ov-live"><i/>仿真数据已同步 · 场景快照</span><label className="ov-view-picker"><OverviewIcon name="spark" size={14}/><select aria-label="数字孪生观察视角" value={camera} onChange={event => setCamera(event.target.value)}><option value="panorama">全景视角</option><option value="reactor">堆岛特写</option><option value="power">动力系统</option></select></label></div>
          </div>
          <div className="ov-view-content" id="ov-view-process" role="tabpanel" aria-labelledby="ov-tab-process" hidden={twinView !== "process"}><ProcessDiagram onEquipment={openEquipment}/></div>
          <div className="ov-view-content" id="ov-view-parameters" role="tabpanel" aria-labelledby="ov-tab-parameters" hidden={twinView !== "parameters"}><div className="ov-parameters"><div className="ov-parameter-title"><h3>机组关键参数</h3><p>同源数据 · 当前场景运行快照</p></div><div className="ov-parameter-grid">{[{ key: "reactor", label: "一回路压力", value: "15.6", unit: "MPa" }, { key: "reactor", label: "堆出口温度", value: "325.1", unit: "°C" }, { key: "steam", label: "蒸汽发生器温度", value: "323.4", unit: "°C" }, { key: "turbine", label: "汽轮机转速", value: "3,000", unit: "rpm" }, { key: "turbine", label: "机组电功率", value: "1,248", unit: "MWe" }, { key: "cooling", label: "冷却水流量", value: "8,450", unit: "m³/h" }].map(item => <button key={item.label} onClick={() => openEquipment(item.key)}><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong><em>● 正常区间</em></button>)}</div><p className="ov-parameter-note">点击参数可查看设备来源和运行详情。所有数值来自本地仿真场景。</p></div></div>
        </div>
      </section>
      <section className="ov-panel ov-agents"><header className="ov-panel-head"><div className="ov-panel-title"><OverviewIcon name="spark"/><div><h2>专业智能体</h2><span>多智能体协同 · 专业知识驱动 · 实时分析支持</span></div></div></header><div className="ov-agent-list">{[
        { key: "safety", icon: "safe", title: "安全运行智能体", description: "实时监测安全边界，识别潜在风险，保障机组安全。", ...agentState("safety"), open: () => onOpenAgent("safety") },
        { key: "green", icon: "leaf", title: "绿色增效智能体", description: "优化运行参数，提升能效，支持低碳运行。", ...agentState("green"), open: () => onOpenAgent("green") },
        { key: "maintenance", icon: "wrench", title: "预测性维护智能体", description: "基于 AI 的设备健康评估与故障预测。", ...agentState("equipment"), open: maintenance },
      ].map(item => <button className={`ov-agent ov-agent-${item.key}`} key={item.key} onClick={item.open}><span className="ov-agent-icon"><OverviewIcon name={item.icon} size={33}/></span><div className="ov-agent-copy"><div className="ov-agent-heading"><h3>{item.title}</h3><span className="ov-agent-status"><i/>{item.status}</span></div><p>{item.description}</p><div className="ov-agent-progress"><strong>{Math.round(item.progress)}<small>%</small></strong><div><i style={{ width: `${item.progress}%` }}/></div></div><small className="ov-agent-task">{item.task}</small></div><span className="ov-agent-arrow"><OverviewIcon name="chevron" size={18}/></span></button>)}</div></section>
    </div>

    <div className="ov-bottom"><section className="ov-panel ov-timeline"><header className="ov-panel-head"><div className="ov-panel-title"><OverviewIcon name="timeline"/><h2>决策时间线</h2><span>{event.eventId} · {EVENT_PHASE_LABELS[event.phase]}</span></div><button className="ov-text-button" onClick={() => go("evidence")}>查看详情<OverviewIcon name="arrow" size={16}/></button></header><div className="ov-timeline-track">{timeline.map((step, index) => {
      const state = stepState(index);
      return <button key={step.title} className={`ov-step ${state.done ? "ov-done" : state.current ? "ov-current" : "ov-pending"}`} onClick={() => setDetail({ title: `${String(index + 1).padStart(2, "0")} · ${step.title}`, description: step.detail, rows: [["阶段状态", state.label], ["关联事件", event.eventId], ["当前风险", `${risk}风险`], ["关联决策", event.decisionId], ...(index === 0 && event.triggeredAt ? [["触发时间", new Date(event.triggeredAt).toLocaleString("zh-CN", { hour12: false })] as [string,string]] : [])], action: index >= 4 ? "decision" : "evidence" })}><span className="ov-step-dot">{state.done && <OverviewIcon name="check" size={15}/>}</span><span className="ov-step-number">{String(index + 1).padStart(2, "0")}</span><strong>{index === 5 && archived ? "复核与归档" : step.title}</strong><p>{step.description}</p><time>{state.label}</time></button>;
    })}</div></section><section className="ov-panel ov-recommendation"><header className="ov-panel-head"><div className="ov-panel-title"><OverviewIcon name="drop"/><h2>{archived ? "本轮决策记录" : review ? "当前送审方案" : "当前推荐方案"}</h2></div><span className="ov-recommend-badge">{EVENT_PHASE_LABELS[event.phase]}</span></header><div className="ov-recommend-body"><span className="ov-recommend-icon"><OverviewIcon name="document" size={30}/></span><div><h3>{analyzed || review || archived ? `方案 ${selectedPlan.id} · ${selectedPlan.title}` : analyzing ? "三个智能体正在协同分析" : event.alarmTriggered ? "P-201 异常已识别，待协同分析" : "持续监测主泵 P-201"}</h3><p>{archived ? `${event.decisionId} 的本地审计副本已归档，可查看证据链和审核记录。` : review ? `${reviewLabel}。${event.decisionId} · 第 ${record.revision} 版；演示不下发设备指令。` : analyzed ? `${event.eventId} · ${risk}风险。依据 ${event.regulation} 进行核查，当前权重推荐方案 ${event.recommendedPlan}，综合置信度 ${event.confidence}%。` : analyzing ? "安全、绿色与设备智能体正在读取同一事件快照，结果完成后在各页面同步。" : event.alarmTriggered ? `P101 在 180 秒下降 ${event.pressureDrop}%，关联报警 ${event.alarmId}，进入工作台启动分析。` : "本次事件尚未触发。可进入实时机组模拟异常，再开展分析与方案比较。"}</p><div className="ov-recommend-tags"><span>{event.equipmentId}</span><span>{archived ? "已归档" : analyzed ? "人工最终确认" : "本地场景演示"}</span></div></div><button className="ov-recommend-go" aria-label={archived ? "查看本轮审计记录" : analyzed || review ? "查看推荐决策方案" : "前往智能体工作台"} onClick={() => archived ? go("evidence") : analyzed || review ? go("decision") : onOpenAgent("safety")}><OverviewIcon name="arrow" size={27}/></button></div></section></div>


    {detail && <div className="ov-modal-backdrop"><button className="ov-modal-scrim" aria-label="关闭设备详情背景" onClick={() => setDetail(null)}/><section ref={modal} className="ov-detail" role="dialog" aria-modal="true" aria-labelledby="ov-detail-heading"><button className="ov-detail-close" aria-label="关闭详情" onClick={() => setDetail(null)}><OverviewIcon name="close"/></button><span className="ov-detail-eyebrow">运行总览 · 仿真数据</span><h2 id="ov-detail-heading">{detail.title}</h2><p>{detail.description}</p><dl>{detail.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><footer><button onClick={() => setDetail(null)}>返回总览</button>{detail.action && <button onClick={() => { setDetail(null); go(detail.action!); }}>{detail.action === "decision" ? "打开决策中心" : detail.action === "copilots" ? "打开智能体工作台" : "查看证据与审计"}<OverviewIcon name="arrow" size={17}/></button>}</footer></section></div>}
  </div>;
}
