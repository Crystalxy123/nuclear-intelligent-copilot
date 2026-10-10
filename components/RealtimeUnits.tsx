"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DECISION_ID, DECISION_PLANS, useDecisionRecord } from "@/lib/decision-card";
import { getUnitSnapshot, UNIT_SYSTEMS, UNIT_EQUIPMENT, UNIT_MAINTENANCE, type UnitSnapshot, type UnitSystemId, type UnitEquipmentId } from "@/lib/unit-demo";
import UnitTrendChart, { type UnitTrendMetric } from "./UnitTrendChart";
import EquipmentDrawer from "./EquipmentDrawer";
import TwinOperatingLayer from "./TwinOperatingLayer";
import AnimatedNumber from "./AnimatedNumber";
import { useAlarmPresentation } from "@/lib/use-alarm-presentation";
import { useDemoPlayback } from "@/lib/demo-playback";
import { useDemoMotion } from "@/lib/use-demo-motion";
import { useDemoEvent, triggerDemoAlarm, startCollaborativeAnalysis, getEventPressure } from "@/lib/demo-event";
import "@/app/realtime-event.css";

type Destination = "decision" | "evidence" | "copilots";
type Detail = { title: string; description: string; rows?: [string, string][]; items?: { title: string; text: string }[]; action?: Destination };
type Modal = { kind: "detail"; detail: Detail } | { kind: "twin" } | null;

function UnitIcon({ name, size = 22 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    heart: <><path d="M20 12c5-8-5-14-8-6-3-8-13-2-8 6l8 9Z"/><path d="M2 12h5l2-4 4 9 3-5h6"/></>,
    shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="M12 7v10M8 11h8"/></>,
    warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/></>,
    clipboard: <><rect x="5" y="5" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M9 12h6M9 16h4"/></>,
    document: <><path d="M5 2h10l5 5v15H5Z"/><path d="M15 2v6h5M9 12h7M9 16h7"/></>,
    leaf: <><path d="M21 3C9 3 3 8 4 15c1 7 12 7 15-3 2-5 2-9 2-9Z"/><path d="M3 22c3-7 9-10 14-15"/></>,
    wrench: <path d="M21 3a7 7 0 0 1-9 9l-7 8a2 2 0 0 1-3-3l8-7a7 7 0 0 1 9-9l-5 5 4 4Z"/>,
    arrow: <path d="M4 12h15m-5-5 5 5-5 5"/>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    expand: <><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M3 3l6 6M21 3l-6 6M21 21l-6-6M3 21l6-6"/></>,
    atom: <><ellipse cx="12" cy="12" rx="5" ry="11" transform="rotate(40 12 12)"/><ellipse cx="12" cy="12" rx="5" ry="11" transform="rotate(-40 12 12)"/><circle cx="12" cy="12" r="2"/></>,
    reactor: <><path d="M6 19V9a6 6 0 0 1 12 0v10ZM4 19h16M8 22v-3M16 22v-3M12 1v2"/><path d="M6 9h12M9 12v4M12 12v4M15 12v4"/></>,
    primary: <><path d="M5 4h14v6H5ZM3 10v7h6M21 10v7h-6"/><circle cx="12" cy="17" r="4"/><path d="m11 15 3 2-3 2Z"/></>,
    secondary: <><path d="M5 21V8a7 7 0 0 1 14 0v13M5 9h14M8 21h8M9 13l6 3-6 3"/></>,
    electrical: <><path d="m13 2-9 12h7l-1 8 10-13h-7Z"/></>,
    auxiliary: <><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><circle cx="12" cy="12" r="4"/></>,
    thermometer: <><path d="M9 15V5a3 3 0 0 1 6 0v10a5 5 0 1 1-6 0Z"/><path d="M12 7v11M15 8h3M15 12h3"/></>,
    flame: <path d="M13 2c1 6-7 7-5 13-3-1-3-4-3-4-4 7 2 12 7 12s11-5 6-12c0 4-3 4-3 4 4-5 1-9-2-13Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    squarecheck: <><path d="M20 13v8H3V4h10M8 11l4 4L22 3"/></>,
    pulse: <path d="M2 12h4l3-8 4 16 3-12 3 4h3"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name] ?? shapes.auxiliary}</svg>;
}


const HOTSPOTS: { id: UnitEquipmentId; left: string; top: string; line: string }[] = [
  { id: "steam", left: "24%", top: "15%", line: "M345 82H390L482 154" },
  { id: "reactor", left: "47%", top: "1%", line: "M525 46V97L575 123" },
  { id: "pump", left: "27%", top: "59%", line: "M375 246H457L508 228" },
  { id: "turbine", left: "75%", top: "22%", line: "M753 118H721L676 171" },
  { id: "generator", left: "86%", top: "46%", line: "M866 201H833L784 233" },
];

export default function RealtimeUnits({ go, onOpenAgent }: { go: (view: Destination) => void; onOpenAgent: (agent: "safety" | "green" | "energy") => void }) {
  const record = useDecisionRecord();
  const event = useDemoEvent();
  const alarmMotion = useAlarmPresentation();
  const playback = useDemoPlayback();
  const motion = useDemoMotion();
  const dataRunning = !playback.active || playback.status === "playing";
  const [selectedEquipment, setSelectedEquipment] = useState<UnitEquipmentId | null>(null);
  const [drawerEquipment, setDrawerEquipment] = useState<UnitEquipmentId | null>(null);
  const [pulseSequence, setPulseSequence] = useState(0);
  const [trendMetric, setTrendMetric] = useState<UnitTrendMetric>("pumpPressure");
  const [alarmMarked, setAlarmMarked] = useState(false);
  const [alarmFocusVersion, setAlarmFocusVersion] = useState(0);
  const trend = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const toggleRefresh = () => setPlaying(value => !value);
  const [system, setSystem] = useState<UnitSystemId>("all");
  const [modal, setModal] = useState<Modal>(null);
  const dialog = useRef<HTMLElement>(null);
  const baselineSnapshot = getUnitSnapshot(tick);
  const snapshot: UnitSnapshot = { ...baselineSnapshot,
    pumpPressure: event.alarmTriggered ? getEventPressure(alarmMotion.seconds) : baselineSnapshot.pumpPressure,
    pumpSpeed: event.alarmTriggered ? alarmMotion.pumpSpeed : baselineSnapshot.pumpSpeed,
    steamLevel: event.alarmTriggered ? alarmMotion.steamLevel : baselineSnapshot.steamLevel,
    pumpVibration: event.alarmTriggered ? 3.8 : baselineSnapshot.pumpVibration,
    pumpHealth: event.alarmTriggered ? 82.6 : baselineSnapshot.pumpHealth,
  };
  const activeSystem = UNIT_SYSTEMS.find(item => item.id === system)!;
  const pending = record.status === "waiting";
  const open = modal !== null;
  const reviewLabel = record.status === "approved" ? "已确认 · 待验证" : record.status === "rejected" ? "已驳回 · 待修订" : "待值长确认";
  const selectedPlan = DECISION_PLANS.find(plan => plan.id === record.selected)!;
  const planAdjustment = record.adjustments[record.selected];
  const planDescription = planAdjustment ? `修改建议：${planAdjustment.note}` : selectedPlan.description;
  const planSummary = planDescription.length > 58 ? `${planDescription.slice(0, 58)}…` : planDescription;
  const planFocus = planAdjustment ? "结果待复核" : { A: "加强监测", B: "能效优化", C: "保守运行" }[record.selected];

  useEffect(() => {
    if (!playing || open || !dataRunning) return;
    const timer = window.setInterval(() => setTick(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing, open, dataRunning]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setModal(null); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, select, [tabindex="0"]') ?? []);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, [open, modal?.kind]);

  const showDetail = (detail: Detail) => setModal({ kind: "detail", detail });
  const showEquipment = (id: UnitEquipmentId) => {
    setModal(null); setSelectedEquipment(id); setDrawerEquipment(id); setPulseSequence(value => value + 1);
  };
  const triggerAlarm = () => {
    triggerDemoAlarm(); setSelectedEquipment("pump"); setSystem("all");
    setTrendMetric("pumpPressure"); setPulseSequence(value => value + 1);
  };
  const viewTrend = () => {
    setDrawerEquipment(null); setTrendMetric("pumpPressure"); setAlarmMarked(event.alarmTriggered); setAlarmFocusVersion(value=>value+1);
    window.requestAnimationFrame(() => { trend.current?.scrollIntoView({ block: "center", behavior: "auto" }); trend.current?.querySelector<SVGSVGElement>("svg[role=slider]")?.focus({preventScroll:true}); });
  };
  const analyze = () => {
    setDrawerEquipment(null); if (event.analysisStage !== "complete") startCollaborativeAnalysis(); onOpenAgent("safety");
  };
  const showTasks = () => showDetail({ title: "活动任务 · 03", description: "当前场景共 3 项任务，其中泵组状态复核需要持续关注。", items: [{ title: "进行中 · 泵组状态复核", text: "跟踪 P-201 压力趋势，补充就地振动与阀门反馈记录。" }, { title: "已完成 · 辅机能耗分析", text: "绿色增效智能体已形成方案 B，预估辅机能耗降低 3.4%。" }, { title: "已完成 · 新能源协同评估", text: "已生成候选消纳窗口，相关调整建议等待人工复核。" }], action: "decision" });
  const showMaintenance = () => showDetail({ title: "智能运维与预警智能体", description: UNIT_MAINTENANCE.summary, rows: [["分析进度", "91% · 设备状态复核中"], ["主泵健康度", `${snapshot.pumpHealth.toFixed(1)}%`], ["主泵转速", `${snapshot.pumpSpeed.toFixed(0)} rpm`], ["重点关注", "P-201 压力变化与泵组效率"], ["建议动作", "复核就地振动与出口阀门反馈，补充设备记录"], ["数据口径", "本地仿真数据，不代表真实设备诊断"]], action: "evidence" });
  const showTimeline = () => showDetail({ title: "决策时间线", description: "Event-021 从参数感知、智能分析到人工审核，所有阶段关联同一张决策卡。", rows: timeline.map(step => [step.title, `${step.time} · ${step.summary || reviewLabel}`] as [string,string]), action: "decision" });

  const selectSystem = (id: UnitSystemId) => setSystem(id);
  const systemNavigation = <div className="ru-system-nav" role="tablist" aria-label="机组系统视图" aria-orientation="vertical">{UNIT_SYSTEMS.map((item,index) => <button key={item.id} id={`ru-tab-${item.id}`} role="tab" aria-selected={system === item.id} aria-controls="ru-system-panel" tabIndex={system === item.id ? 0 : -1} onClick={() => selectSystem(item.id)} onKeyDown={event => {
    const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (index + 1) % UNIT_SYSTEMS.length : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (index + UNIT_SYSTEMS.length - 1) % UNIT_SYSTEMS.length : event.key === "Home" ? 0 : event.key === "End" ? UNIT_SYSTEMS.length - 1 : -1;
    if (next < 0) return; event.preventDefault(); selectSystem(UNIT_SYSTEMS[next].id); document.getElementById(`ru-tab-${UNIT_SYSTEMS[next].id}`)?.focus();
  }}><UnitIcon name={item.id === "all" ? "atom" : item.id} size={17}/><span>{item.label}</span></button>)}</div>;

  const renderScene = (expanded = false) => <div className={`ru-scene ${expanded ? "ru-scene-expanded" : ""}`} data-selected-equipment={selectedEquipment ?? "none"} data-system={system}>
    <div className="ru-camera-layer"><img className="ru-twin-image" src="/assets/overview-digital-twin.png" alt="青色全息核能机组数字孪生演示场景"/>
    <TwinOperatingLayer alarm={alarmMotion.warningPulse} alarmPulse={alarmMotion.pulseActive} highLoad={snapshot.reactorPower > 95.5} running={playing && dataRunning && motion.running} pumpSpeed={snapshot.pumpSpeed} turbineSpeed={snapshot.turbineSpeed} steamLevel={snapshot.steamLevel} selected={selectedEquipment} system={system} pulseKey={pulseSequence}/>
    <div className="um-twin-motion" aria-hidden="true"><i className="um-scan-band"/><i className="um-energy-ring"/><i className="um-energy-ring um-energy-ring-delayed"/><span className="um-particles"><i/><i/><i/><i/><i/></span></div><svg className="ru-hotspot-lines" viewBox="0 0 1000 340" preserveAspectRatio="none" aria-hidden="true">{HOTSPOTS.map(item => <g key={item.id} className={selectedEquipment && selectedEquipment !== item.id ? "ru-dimmed" : ""}><path d={item.line}/><path className="um-line-flow" pathLength="1000" d={item.line}/></g>)}</svg>
    {HOTSPOTS.map(item => { const equipment = UNIT_EQUIPMENT.find(equipment => equipment.id === item.id)!; return <button aria-pressed={selectedEquipment===item.id} className={`ru-hotspot ru-hotspot-${item.id} ${selectedEquipment===item.id ? "ru-device-selected" : selectedEquipment ? "ru-device-muted" : ""} ${alarmMotion.equipmentAlert && item.id==="pump" ? "ru-device-alert" : ""} ${system!=="all" ? activeSystem.equipmentIds.includes(item.id) ? "ru-system-target" : "ru-system-muted" : ""}`} key={item.id} style={{ left: item.left, top: item.top }} onClick={() => showEquipment(item.id)}>{selectedEquipment===item.id && <i key={pulseSequence} className="ru-selection-pulse" aria-hidden="true"/>}<strong>{alarmMotion.equipmentAlert && item.id==="pump" && "△ "}{equipment.label}</strong>{(item.id === "reactor" ? equipment.metrics.slice(1,3) : item.id === "pump" ? equipment.metrics.slice(0,2) : equipment.metrics.slice(0,2)).map(metric => <span key={metric.key}><AnimatedNumber value={snapshot[metric.key]} digits={metric.precision}/> {metric.unit}</span>)}</button>; })}</div>
    {system !== "all" && <div className="ru-system-context"><strong>{activeSystem.label}</strong><span>{activeSystem.description}</span></div>}
  </div>;

  const completeSteps = record.status === "approved" && event.alarmTriggered ? 6 : event.analysisStage === "complete" ? 4 : event.analysisStage === "processing" || event.analysisStage === "results" ? 2 : alarmMotion.alarmTimeline ? 1 : 0;
  const timeline = [
    { title: "参数感知", time: "T+00 s", summary: "400+ 监测点数据" },
    { title: "报警识别", time: alarmMotion.alarmTimeline ? "T+30 s" : "待触发", summary: alarmMotion.alarmTimeline ? "A317 · 关联 Event-021" : "等待模拟异常" },
    { title: "安全评估", time: event.analysisStage === "idle" ? "待分析" : "T+90 s", summary: event.analysisStage === "complete" ? "中低风险 · 安全边界内" : "运行边界待复核" },
    { title: "方案比较", time: event.analysisStage === "complete" ? "T+120 s" : "待分析", summary: event.analysisStage === "complete" ? `建议方案 ${event.recommendedPlan}` : "等待协同结果" },
    { title: "决策生成", time: event.analysisStage === "complete" ? "待复核" : "待生成", summary: DECISION_ID },
    { title: "人工确认", time: reviewLabel, summary: pending ? "" : "审核记录已保存" },
  ];
  const conditions: { icon:string; label:string; key:keyof UnitSnapshot; precision:number; unit:string; summary:string; range:string; equipment:UnitEquipmentId }[] = [
    { icon:"flame",label:"堆芯功率",key:"reactorPower",precision:1,unit:"%Pn",summary:"目标 100%",range:"",equipment:"reactor" },
    { icon:"thermometer",label:"一回路压力",key:"primaryPressure",precision:2,unit:"MPa",summary:"场景正常范围",range:"15.0 – 16.0",equipment:"reactor" },
    { icon:"thermometer",label:"主回路温度",key:"outletTemperature",precision:1,unit:"°C",summary:"场景正常范围",range:"300 – 320",equipment:"reactor" },
    { icon:"electrical",label:"发电机功率",key:"generatorPower",precision:0,unit:"MWe",summary:"演示额定值",range:"1400",equipment:"generator" },
  ];

  return <div className="ru-workspace">
    <section className={`ru-event-banner ${alarmMotion.alarmCard ? "is-triggered" : ""}`} data-alarm-card={alarmMotion.alarmCard} aria-label="Event-021 事件控制">
      <div className="ru-event-summary"><span className="ru-event-symbol" aria-hidden="true">{event.alarmTriggered ? "△" : "◇"}</span><div><strong>{alarmMotion.alarmCard ? "P-201 出口压力持续下降" : "Event-021 · 机组异常演示"}</strong><p>{alarmMotion.alarmCard ? <>异常趋势下降 <b><AnimatedNumber value={4.3 * alarmMotion.seconds / 180} digits={1}/>%</b> · <button onClick={viewTrend}>关联报警 A317</button> · {event.riskLevel === "medium-low" ? "中低风险" : "风险待分析"}</> : "点击设备查看详情，触发异常后启动多智能体协同分析。"}</p></div></div>
      <div className="ru-event-actions">{event.alarmTriggered ? <><span className="ru-event-tag">Event-021</span><button onClick={()=>{setSystem("all");showEquipment("pump");}}>定位设备</button><button onClick={viewTrend}>查看趋势</button><button className="ru-event-primary" onClick={analyze}>{event.analysisStage === "complete" ? "查看协同结果 →" : "启动协同分析 →"}</button></> : <button className="ru-event-primary" onClick={triggerAlarm}>模拟 P-201 异常</button>}</div>
    </section>
    <div className="ru-page" data-demo-playing={playing && dataRunning ? "true" : "false"}>
    <h1 className="ru-sr-only">实时机组</h1>
    <section className="ru-kpis" aria-label="机组状态指标">
      <button className="ru-kpi tone-cyan" onClick={() => showDetail({ title:"系统健康度",description:"系统健康度综合展示当前场景中的监测完整性与设备状态，本地演示每 1 秒刷新一次。+0.2% 为独立统计期对比的场景预设，不随当前采样变化。",rows:[["当前健康度",`${snapshot.systemHealth.toFixed(1)}%`],["统计期对比（预设）","+0.2%"],["可用率",`${snapshot.availability.toFixed(1)}%`],["数据状态",playing ? "演示更新中" : "演示已暂停"]] })}><span className="ru-kpi-icon"><UnitIcon name="heart" size={31}/></span><div className="ru-kpi-copy"><span>系统健康度</span><strong><AnimatedNumber value={snapshot.systemHealth} digits={1} firstFromZero identity="realtime-health"/><small>%</small></strong><p className="ru-positive" title="独立统计期对比的场景预设，不随当前采样变化">↑ +0.2% · 预设对比</p></div><svg className="ru-kpi-spark" viewBox="0 0 95 52" aria-hidden="true"><defs><linearGradient id="ru-spark-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#03e5d1" stopOpacity=".3"/><stop offset="1" stopColor="#03e5d1" stopOpacity="0"/></linearGradient></defs><path d="M0 48 6 44 15 46 22 41 28 32 34 30 40 31 46 41 53 39 58 30 64 33 70 27 76 28 83 24 94 8V52H0Z" fill="url(#ru-spark-fill)"/><path d="M0 48 6 44 15 46 22 41 28 32 34 30 40 31 46 41 53 39 58 30 64 33 70 27 76 28 83 24 94 8" fill="none" stroke="#00ecdc" strokeWidth="1.4"/></svg></button>
      <button className="ru-kpi tone-green" onClick={() => showDetail({ title:"安全状态 · 正常",description:"当前机组参数在演示场景设定范围内。待核查事件已进入决策流程，不等同于发生安全事件。",rows:[["一回路压力",`${snapshot.primaryPressure.toFixed(2)} MPa`],["主回路温度",`${snapshot.outletTemperature.toFixed(1)} °C`],["安全事件","当前场景无安全事件"],["人工复核","持续关注 P-201 关联趋势"]],action:"decision" })}><span className="ru-kpi-icon"><UnitIcon name="shield" size={31}/></span><div className="ru-kpi-copy"><span>安全状态</span><strong>正常</strong><p>· 无安全事件</p></div></button>
      <button className="ru-kpi tone-cyan" onClick={() => showDetail({ title:`Event-021 风险 · ${event.riskLevel === "medium-low" ? "中低" : "低"}`,description:"基于同一事件的协同分析结果。压力趋势与振动报警需要核查，风险状态随协同分析更新。",rows:[["当前事件风险",event.riskLevel === "medium-low" ? "中低" : "低"],["关联事件",event.eventId],["分析状态",event.analysisStage === "complete" ? "三方分析完成" : "待完成协同分析"],["评估依据","本地场景预设摘要"]],action:"decision" })}><span className="ru-kpi-icon"><UnitIcon name="warning" size={30}/></span><div className="ru-kpi-copy"><span>当前风险级别</span><strong>{event.riskLevel === "medium-low" ? "中低" : "低"}</strong><p><AnimatedNumber value={event.riskLevel === "medium-low" ? 32 : 12.4} digits={1}/> / 100</p></div><i className="ru-risk-bars" aria-hidden="true">{[1,2,3,4,5].map(value=><b key={value} style={{height:`${value*6}px`}}/>)}</i></button>
      <button className="ru-kpi tone-amber" onClick={showTasks}><span className="ru-kpi-icon"><UnitIcon name="clipboard" size={30}/></span><div className="ru-kpi-copy"><span>活动任务</span><strong><AnimatedNumber value={3} prefix="0" firstFromZero identity="realtime-tasks"/></strong><p>1 条需关注</p></div><span className="ru-kpi-arrow"><UnitIcon name="chevron" size={19}/></span></button>
      <button className="ru-kpi tone-purple" onClick={() => go("decision")}><span className="ru-kpi-icon"><UnitIcon name="document" size={30}/></span><div className="ru-kpi-copy"><span>待决策项</span><strong><AnimatedNumber value={pending ? 1 : 0} prefix="0"/></strong><p>{pending ? "等待人工确认" : "本轮审核已完成"}</p></div><span className="ru-kpi-arrow"><UnitIcon name="chevron" size={19}/></span></button>
    </section>
    <div className="ru-main-grid">
      <section className="ru-panel ru-twin" aria-label="机组数字孪生体">
        <header className="ru-panel-heading"><div><h2>机组数字孪生体</h2><p>星澜核能 S-01 · 实时运行状态 · Demo</p></div><div className="ru-heading-tools"><span className="ru-data-tick"><i key={tick}/>数据更新 1 s</span><span>三维视图</span><button className="ru-live-toggle" aria-pressed={playing} aria-label={playing ? "暂停演示数据更新" : "继续演示数据更新"} title="本地演示数据，每 1 秒更新" onClick={toggleRefresh}><i/>{playing ? "演示更新" : "已暂停"}</button><button className="ru-icon-button" aria-label="放大数字孪生视图" onClick={() => setModal({kind:"twin"})}><UnitIcon name="expand" size={18}/></button></div></header>
        <div className="ru-twin-stage">{systemNavigation}<div id="ru-system-panel" role="tabpanel" aria-labelledby={`ru-tab-${system}`}>
          {renderScene()}
        </div><div className="ru-twin-legend"><span><i className="ru-normal"/>正常</span><span><i className="ru-attention"/>关注</span><span><i className="ru-alarm"/>告警</span><small>本地仿真数据</small></div></div>
      </section>
      <section className="ru-panel ru-agents"><header className="ru-panel-heading"><div><h2>专业智能体</h2></div><button className="ru-text-button" onClick={()=>showDetail({title:"专业智能体 · 分析任务",description:"三个专业智能体基于同一组机组场景数据协同分析，运行调整通过统一决策卡进行人工审核。",items:[{title:"安全运行智能体 · 78%",text:"监测安全边界与运行限值，复核 P-201 关联趋势。"},{title:"绿色增效智能体 · 62%",text:"比较辅机组合与节能方案，预估能耗降低 3.4%。"},{title:"智能运维与预警智能体 · 91%",text:"整理设备健康状态与维护线索，形成设备核查建议。"}],action:"copilots"})}>查看全部<UnitIcon name="arrow" size={15}/></button></header><div className="ru-agent-list">{[
        {id:"safety",icon:"shield",title:"安全运行智能体",description:"监测安全边界与运行限值，识别潜在风险。",progress:event.agentResults.includes("safety") ? 100 : event.analysisProgress,task:event.agentResults.includes("safety") ? "当前仍处于安全边界内，综合风险为中低。" : "监测 P-201 出口压力，等待协同分析。",open:()=>onOpenAgent("safety")},
        {id:"green",icon:"leaf",title:"绿色增效智能体",description:"优化机组参数与能源分配，提升运行经济性。",progress:event.agentResults.includes("green") ? 100 : event.analysisProgress,task:event.agentResults.includes("green") ? "暂不建议因单一压力趋势立即降低机组负荷。" : "等待基于 Event-021 的综合效益评估。",open:()=>onOpenAgent("green")},
        {id:"maintenance",icon:"wrench",title:"智能运维与预警智能体",description:"设备健康诊断与寿命预测，提前识别异常。",progress:event.agentResults.includes("equipment") ? 100 : event.analysisProgress,task:event.agentResults.includes("equipment") ? "建议对 P-201 安排设备核查。" : "监测主泵转速、振动与健康度。",open:showMaintenance},
      ].map(agent=><article className={`ru-agent ru-agent-${agent.id}`} key={agent.id}><span className="ru-agent-icon"><UnitIcon name={agent.icon} size={30}/></span><div className="ru-agent-copy"><div className="ru-agent-title"><h3>{agent.title}</h3><span className="ru-running"><i/>{event.analysisStage === "idle" ? "待分析" : agent.progress === 100 ? "已完成" : "分析中"}</span></div><p>{agent.description}</p><div className="ru-agent-progress"><div><i style={{width:`${agent.progress}%`}}/></div><span>{agent.progress}%</span></div><small>{agent.task}</small></div><button className="ru-agent-open" aria-label={`查看${agent.title}`} onClick={agent.open}>查看</button></article>)}</div></section>
    </div>
    <div className="ru-middle-grid">
      <section className="ru-panel ru-timeline"><header className="ru-panel-heading"><div><h2>决策时间线</h2><p>从感知到执行 · 全流程闭环</p></div><button className="ru-text-button" onClick={showTimeline}>查看详情<UnitIcon name="arrow" size={15}/></button></header><div className="ru-timeline-track">{timeline.map((step,index)=><button key={step.title} className={`ru-step ${index<completeSteps ? "ru-done" : index===completeSteps ? "ru-current" : "ru-pending"}`} onClick={()=>showDetail({title:`${String(index+1).padStart(2,"0")} · ${step.title}`,description:step.summary || "方案等待人工审核，确认操作会保留本地审核记录。",rows:[["记录时间",step.time],["阶段状态",index<completeSteps ? "已完成" : index===completeSteps ? "当前阶段" : "待完成"],["关联决策",DECISION_ID]],action:index>=4 ? "decision" : "evidence"})}><span className="ru-step-dot">{index<completeSteps ? <UnitIcon name="check" size={17}/> : String(index + 1)}</span><strong>{step.title}</strong><time>{step.time}</time><small>{step.summary}</small></button>)}</div></section>
      <section className="ru-panel ru-recommendation"><header className="ru-panel-heading"><div><h2>当前推荐方案</h2><em>{planAdjustment ? "人工调整" : "AI 生成"}</em></div><button className="ru-text-button" onClick={()=>go("decision")}>查看详情<UnitIcon name="arrow" size={15}/></button></header><div className="ru-recommend-body"><span className="ru-recommend-icon"><UnitIcon name="document" size={32}/></span><div><h3>{selectedPlan.title}</h3><p title={planDescription}>{planSummary}</p></div></div><div className="ru-recommend-footer"><div className="ru-tags"><span><UnitIcon name="check" size={13}/>方案 {selectedPlan.id}</span><span><UnitIcon name="pulse" size={13}/>{planFocus}</span><span className="ru-review-tag">{pending ? "待人工确认" : reviewLabel}</span></div><button className="ru-primary" onClick={()=>go("decision")}>查看详情<UnitIcon name="arrow" size={16}/></button></div></section>
    </div>
    <div className="ru-bottom-grid">
      <section ref={trend} className="ru-panel ru-trend" aria-label="关键运行参数趋势"><UnitTrendChart snapshot={snapshot} tick={tick} selectedMetric={trendMetric} onSelectMetric={setTrendMetric} alarmMarked={alarmMarked} alarmFocusVersion={alarmFocusVersion} onSelectAlarm={()=>{setAlarmMarked(true);setAlarmFocusVersion(value=>value+1);}}/></section>
      <section className="ru-panel ru-conditions"><header className="ru-panel-heading"><div><h2>实时工况概览</h2></div></header><div className="ru-condition-grid">{conditions.map(item=><button key={item.key} onClick={()=>showEquipment(item.equipment)} aria-label={`查看${item.label}详情`}><UnitIcon name={item.icon} size={24}/><div><span>{item.label}</span><strong><AnimatedNumber value={snapshot[item.key]} digits={item.precision}/><small>{item.unit}</small></strong><p>{item.summary}{item.range && <small>{item.range}</small>}</p></div></button>)}</div></section>
      <section className="ru-panel ru-statistics"><header className="ru-panel-heading"><div><h2>运行统计（今日）</h2></div></header><div className="ru-stats-grid">{[
        {icon:"clock",label:"累计运行时长",value:"24.0",unit:"h",detail:"运行时长为该演示日的汇总值，不随页面开启时间累加。"},
        {icon:"clipboard",label:"处置事件数",value:"2",unit:"条",detail:"演示日内已完成 2 条记录的处置；P-201 关联事件仍在复核中。"},
        {icon:"squarecheck",label:"完成任务数",value:"3",unit:"项",detail:"本演示日累计完成 3 项任务，其中 2 项属于当前活动队列，另 1 项已归档。"},
        {icon:"pulse",label:"机组可用率",value:snapshot.availability.toFixed(1),unit:"%",detail:"机组可用率采用当日演示场景预设，用于呈现运行统计。"},
      ].map(item=><button key={item.label} onClick={()=>showDetail({title:item.label,description:item.detail,rows:[["当前统计",`${item.value} ${item.unit}`],["统计窗口","当前演示日 00:00 – 24:00"],["数据来源","S-01 本地仿真场景"]]})}><UnitIcon name={item.icon} size={23}/><div><span>{item.label}</span><strong>{item.value}<small>{item.unit}</small></strong></div></button>)}</div></section>
    </div>
    {drawerEquipment && <EquipmentDrawer equipmentId={drawerEquipment} snapshot={snapshot} onClose={()=>setDrawerEquipment(null)} onSelect={id=>{setDrawerEquipment(id);setSelectedEquipment(id);setPulseSequence(value=>value+1);}} onTriggerAlarm={triggerAlarm} onTrend={viewTrend} onAnalyze={analyze}/> }
    {modal && <div className="ru-modal-backdrop"><button className="ru-modal-scrim" aria-label="关闭机组详情背景" onClick={()=>setModal(null)}/><section ref={dialog} className={`ru-dialog ${modal.kind === "twin" ? "ru-expanded" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ru-dialog-heading"><header><div><small>S-01 仿真机组 · Demo</small><h2 id="ru-dialog-heading">{modal.kind === "twin" ? "机组数字孪生体 · 全景视图" : modal.detail.title}</h2></div><button className="ru-close" aria-label="关闭机组详情" onClick={()=>setModal(null)}><UnitIcon name="close"/></button></header>{modal.kind === "twin" ? <div className="ru-expanded-scene">{renderScene(true)}</div> : <div className="ru-dialog-content"><p>{modal.detail.description}</p>{modal.detail.rows && <dl className="ru-detail-list">{modal.detail.rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{modal.detail.items && <ul className="ru-detail-items">{modal.detail.items.map(item=><li key={item.title}><strong>{item.title}</strong><span>{item.text}</span></li>)}</ul>}</div>}<footer className="ru-dialog-actions"><button onClick={()=>setModal(null)}>返回实时机组</button>{modal.kind === "detail" && modal.detail.action && <button className="ru-primary" onClick={()=>{const destination=modal.detail.action!;setModal(null);if(destination==="copilots")onOpenAgent("safety");else go(destination);}}>{modal.detail.action === "decision" ? "查看决策卡" : modal.detail.action === "evidence" ? "查看证据与审计" : "打开智能体工作台"}<UnitIcon name="arrow" size={16}/></button>}</footer></section></div>}
  </div></div>;
}
