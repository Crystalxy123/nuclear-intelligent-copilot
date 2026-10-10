"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SimulationMimic from "@/components/SimulationMimic";
import AnimatedNumber from "./AnimatedNumber";
import {
  PCTRAN, PCTRAN_SCENARIOS, createInitialState, getPlantCondition, historyPoint, stepPCTRAN,
  type EventLevel, type HistoryPoint, type PlantState, type ScenarioDefinition, type ScenarioId, type TransientEvent,
} from "@/lib/pctran-engine";

type Session = { plant: PlantState; history: HistoryPoint[]; events: TransientEvent[] };
type ManualKey = "scram" | "hpsi" | "lpi" | "afw" | "containmentSpray" | "porv";
type DialogView = "protection" | "actions" | "events" | null;
const speedOptions = [1, 5, 20, 60];
const actionDefinitions: { key: ManualKey; name: string; code: string; power: boolean }[] = [
  { key: "hpsi", name: "高压安注", code: "HPSI", power: true },
  { key: "lpi", name: "低压安注", code: "LPI / RHR", power: true },
  { key: "afw", name: "辅助给水", code: "AFW", power: false },
  { key: "containmentSpray", name: "安全壳喷淋", code: "CTMT SPRAY", power: true },
  { key: "scram", name: "反应堆手动停堆", code: "RX TRIP", power: false },
  { key: "porv", name: "稳压器卸压阀", code: "PORV", power: false },
];

function SimIcon({ name, size = 18 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    play: <path d="m8 5 11 7-11 7Z"/>, pause: <><path d="M8 5v14M16 5v14"/></>,
    reset: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>, close: <path d="m6 6 12 12M18 6 6 18"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    power: <><path d="M5 20v-6M10 20V9M15 20V5M20 20V2"/></>,
    pressure: <><circle cx="12" cy="11" r="8"/><path d="m12 11 4-4M8 22h8M12 19v3"/></>,
    temperature: <><path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v10"/></>,
    flow: <><path d="M3 7c4-5 5 5 9 0s5 5 9 0M3 12c4-5 5 5 9 0s5 5 9 0M3 17c4-5 5 5 9 0s5 5 9 0"/></>,
    inventory: <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="12" cy="20" r="2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}

function initialSession(scenario: ScenarioDefinition): Session {
  const plant = createInitialState();
  return { plant, history: [historyPoint(plant)], events: [
    { id: "initial", time: 0, level: "info", message: "IC-01 额定功率初始条件已装载" },
    { id: "scenario", time: 0, level: "info", message: `${scenario.code} ${scenario.name} 已选择${scenario.id === "steady" ? "" : `，T+${scenario.eventTime}s 触发`}` },
  ] };
}

const formatTime = (seconds: number) => [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), Math.floor(seconds % 60)].map(value => String(value).padStart(2, "0")).join(":");

function PanelHeader({ title, english, children }: { title: string; english: string; children?: ReactNode }) {
  return <header className="sim-panel-head"><div className="sim-panel-heading"><strong>{title}</strong><span>{english}</span></div>{children}</header>;
}
function StatusLamp({ on, alarm = false, children }: { on: boolean; alarm?: boolean; children: ReactNode }) {
  return <span className={`sim-lamp ${on ? "on" : ""} ${alarm ? "alarm" : ""}`}><i/>{children}</span>;
}
function Metric({ icon, label, value, unit, alarm = false }: { icon: string; label: string; value: string; unit: string; alarm?: boolean }) {
  return <article className={`sim-metric ${alarm ? "alarm" : ""}`}><span className="sim-metric-icon"><SimIcon name={icon} size={25}/></span><div><span>{label}</span><strong><AnimatedNumber value={Number(value)} digits={value.includes(".") ? value.split(".")[1].length : 0}/><small>{unit}</small></strong></div></article>;
}

type PlotSeries = { key: keyof HistoryPoint; label: string; color: string; unit: string; max: number };
function TrendPlot({ title, history, series, leftMax }: { title: string; history: HistoryPoint[]; series: PlotSeries[]; leftMax: number }) {
  const w = 600, h = 180, left = 37, top = 17, right = 33, bottom = 29;
  const chartW = w - left - right, chartH = h - top - bottom;
  const timeMin = history[0]?.time ?? 0;
  const timeMax = Math.max(timeMin + 60, history.at(-1)?.time ?? 0);
  const point = (item: PlotSeries, entry: HistoryPoint) => ({ x: left + (entry.time - timeMin) / (timeMax - timeMin) * chartW, y: top + (1 - Math.min(1, Math.max(0, Number(entry[item.key]) / item.max))) * chartH });
  return <div className="sim-plot"><div className="sim-plot-heading"><strong>{title}</strong><span>左轴 bar · 右轴 %</span></div><div className="sim-plot-legend">{series.map(item => <span key={item.key} style={{ color: item.color }}><i/>{item.label}<b>{Number(history.at(-1)?.[item.key] ?? 0).toFixed(item.key === "containment" ? 2 : 1)} {item.unit}</b></span>)}</div><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${title}实时趋势，横轴仿真秒数，压力使用左轴 bar，百分比使用右轴`}>{[0,1,2,3,4].map(index => <g key={index}><line className="sim-plot-gridline" x1={left} x2={w-right} y1={top + index * chartH / 4} y2={top + index * chartH / 4}/><text className="sim-axis" x={left-8} y={top+index*chartH/4+4} textAnchor="end">{leftMax-index*leftMax/4}</text><text className="sim-axis" x={w-right+8} y={top+index*chartH/4+4}>{120-index*30}</text></g>)}{[0,1,2,3,4,5].map(index => <g key={index}><line className="sim-plot-gridline" x1={left+index*chartW/5} x2={left+index*chartW/5} y1={top} y2={h-bottom}/><text className="sim-axis" x={left+index*chartW/5} y={h-9} textAnchor="middle">{Math.round(timeMin+index*(timeMax-timeMin)/5)}s</text></g>)}{series.map(item => <g key={item.key}><path d={history.map((entry,index) => { const p=point(item,entry); return `${index ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(" ")} fill="none" stroke={item.color} strokeWidth="1.7" vectorEffect="non-scaling-stroke"/><circle className="sim-motion-trend-halo" cx={point(item,history.at(-1)!).x} cy={point(item,history.at(-1)!).y} r="6" fill={item.color} opacity=".12" aria-hidden="true"/><circle className="sim-motion-trend-point" cx={point(item,history.at(-1)!).x} cy={point(item,history.at(-1)!).y} r="2.6" fill={item.color}/></g>)}{history.length === 1 && <text className="sim-chart-empty" x={w/2} y={h/2} textAnchor="middle">启动后实时记录仿真趋势</text>}</svg></div>;
}
function EventLog({ events }: { events: TransientEvent[] }) {
  const labels: Record<EventLevel,string> = { info: "信息", alarm: "报警", trip: "保护", safety: "安注" };
  return <div className="sim-event-list" aria-label="仿真事件记录">{events.slice().reverse().map(item => <div key={item.id} className={`sim-event-row ${item.level}`}><time>T+{formatTime(item.time)}</time><i aria-label={labels[item.level]}/><p>{item.message}</p></div>)}</div>;
}

export default function PctranSimulator() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("sb-loca");
  const scenario = PCTRAN_SCENARIOS.find(item => item.id === scenarioId)!;
  const [session, setSession] = useState<Session>(() => initialSession(PCTRAN_SCENARIOS.find(item => item.id === "sb-loca")!));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (switchTimer.current) clearTimeout(switchTimer.current); }, []);
  const [dialog, setDialog] = useState<DialogView>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const manualSequence = useRef(0);
  const complete = session.plant.time >= scenario.duration;
  const running = playing && !complete;
  const condition = getPlantCondition(session.plant);
  const plant = session.plant;
  const shownScenarios = PCTRAN_SCENARIOS.filter(item => `${item.code} ${item.name} ${item.short}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  useEffect(() => {
    if (!running) return;
    let budget = 0;
    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      budget += (now - lastTick) / 1000 * speed;
      lastTick = now;
      const steps = Math.floor(budget);
      if (steps < 1) return;
      budget -= steps;
      setSession(previous => {
        const remaining = Math.max(0, scenario.duration - previous.plant.time);
        if (!remaining) return previous;
        let current = previous.plant;
        const events: TransientEvent[] = [], points: HistoryPoint[] = [];
        for (let index = 0; index < Math.min(steps, remaining); index += 1) {
          const result = stepPCTRAN(current, scenario, 1);
          current = result.state;
          events.push(...result.events);
          points.push(historyPoint(current));
        }
        if (current.time >= scenario.duration) events.push({ id: `complete-${scenario.id}`, time: current.time, level: "info", message: `${scenario.name} 已完成，仿真自动停止` });
        return { plant: current, history: [...previous.history,...points].slice(-300), events: [...previous.events,...events].slice(-300) };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, scenario, speed]);

  useEffect(() => {
    if (!dialog) return;
    const trigger = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') ?? []);
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    document.addEventListener("keydown",handleKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown",handleKey); if(trigger?.isConnected) trigger.focus(); };
  }, [dialog]);

  const selectScenario = (id: ScenarioId) => {
    if (switchTimer.current) clearTimeout(switchTimer.current);
    setPlaying(false); setSwitching(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector('.app-shell[data-motion="paused"]');
    switchTimer.current = setTimeout(() => {
      setScenarioId(id); setSession(initialSession(PCTRAN_SCENARIOS.find(item => item.id === id)!));
      setSwitching(false); setPlaying(true);
    }, reduced ? 0 : 140);
  };
  const reset = (id: ScenarioId = scenarioId) => {
    if (switchTimer.current) clearTimeout(switchTimer.current);
    setSwitching(false); setPlaying(false); setScenarioId(id);
    setSession(initialSession(PCTRAN_SCENARIOS.find(item => item.id === id)!));
  };
  const start = () => { if (complete) setSession(initialSession(scenario)); setPlaying(true); };
  const manualAction = (key: ManualKey) => {
    const id = `manual-${++manualSequence.current}`;
    setSession(previous => {
      const current = { ...previous.plant };
      const action = actionDefinitions.find(item => item.key === key)!;
      if (action.power && !current.acPower || key === "scram" && current.scram) return previous;
      let message: string;
      if (key === "scram") { current.scram = true; current.scramTime = current.time; current.turbineTrip = true; message = "操纵员执行反应堆手动停堆"; }
      else { current[key] = !current[key]; message = `操纵员${current[key] ? key === "porv" ? "开启" : "启动" : key === "porv" ? "关闭" : "停止"}${action.name}（${action.code}）`; }
      return { ...previous, plant: current, events: [...previous.events,{ id, time: current.time, level: key === "scram" ? "trip" as const : "info" as const, message }].slice(-300) };
    });
  };
  const actionButton = (action: typeof actionDefinitions[number]) => {
    const active = plant[action.key];
    const disabled = action.power && !plant.acPower || action.key === "scram" && plant.scram || complete;
    const next = action.key === "scram" ? "执行" : active ? "停止" : "启动";
    return <button key={action.key} className={active ? "active" : ""} aria-pressed={active} aria-label={`${next}${action.name}`} disabled={disabled} title={action.power && !plant.acPower ? "交流电源失去，无法执行该动作" : `${action.name} · ${active ? "已投入" : "待命"}`} onClick={() => manualAction(action.key)}><SimIcon name={active ? "pause" : "play"} size={17}/><span><strong>{action.name}</strong><small>{action.code}{active ? " · 已投入" : ""}</small></span></button>;
  };
  const protectionRows = [
    { label: "RX TRIP", active: plant.scram, available: true, setpoint: `一回路压力 ≤ ${PCTRAN.lowPressureScramBar} bar，或流量 < 66% 等保护条件`, description: "触发后联动汽轮机跳闸" },
    { label: "HPSI", active: plant.hpsi, available: plant.acPower, setpoint: `一回路压力 ≤ ${PCTRAN.hpsiStartBar} bar 等安注条件`, description: "3 台高压安注泵 · 需交流电源" },
    { label: "ACCUM", active: plant.accumulator, available: true, setpoint: `一回路压力 ≤ ${PCTRAN.accumulatorStartBar} bar`, description: "蓄压箱被动注入" },
    { label: "LPI / RHR", active: plant.lpi, available: plant.acPower, setpoint: `一回路压力 ≤ ${PCTRAN.lpiStartBar} bar`, description: "2 台低压安注泵 · 需交流电源" },
    { label: "CTMT SPRAY", active: plant.containmentSpray, available: plant.acPower, setpoint: `安全壳压力 ≥ ${PCTRAN.containmentSprayStartBar} bar`, description: "安全壳喷淋 · 需交流电源" },
  ];

  return <div className="sim-page" data-sim-running={running} data-switching={switching}>
    <div className="sim-heading"><div><div className="sim-title-row"><h1>PCTRAN 在线热工水力仿真</h1><span className="sim-badge">PCTRAN 7.0.2</span><span className="sim-badge">PWR · 3 LOOP</span><span className="sim-badge">实时模拟</span></div><p>基于热工水力模型观察机组瞬态、事故响应与保护动作 · 本地训练仿真</p></div><div className="sim-run-status"><div className="sim-clock"><SimIcon name="clock" size={24}/><div><small>仿真时钟</small><strong>T+ {formatTime(plant.time)}</strong></div></div><button className={`sim-run-button ${running ? "active" : ""}`} aria-label={running ? "暂停仿真" : complete ? "重新运行仿真" : "启动仿真"} onClick={() => running ? setPlaying(false) : start()}><SimIcon name={running ? "pause" : "play"} size={16}/>{running ? "运行中" : complete ? "重新运行" : plant.time ? "继续运行" : "开始运行"}</button><small className="sim-solver">Δt = 1.0 s · Euler transient solver</small></div></div>
    <div className="sim-layout">
      <aside className="sim-left-column"><section className="sim-panel sim-scenarios"><PanelHeader title="事故工况库" english="SCENARIO LIBRARY"><button className="sim-icon-button" aria-label="搜索事故工况" aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); if(searchOpen) setQuery(""); }}><SimIcon name="search"/></button></PanelHeader>{searchOpen && <div className="sim-search"><input ref={searchRef} aria-label="搜索工况名称或编号" placeholder="搜索名称 / 编号" value={query} onChange={event => setQuery(event.target.value)}/></div>}<div className="sim-scenario-list">{shownScenarios.map(item => <button key={item.id} aria-pressed={scenarioId === item.id} className={scenarioId === item.id ? "active" : ""} onClick={() => selectScenario(item.id)}><span className="sim-case-code">{item.code}</span><div><strong>{item.name}</strong><small>{item.short}</small></div>{scenarioId === item.id ? <i/> : <SimIcon name="chevron" size={14}/>}</button>)}{!shownScenarios.length && <p className="sim-empty">没有匹配的工况</p>}</div></section><section className="sim-panel sim-case-info"><PanelHeader title="场景信息" english="SCENARIO INFO"><StatusLamp on alarm={condition.tone !== "normal"}>{condition.label}</StatusLamp></PanelHeader><div className="sim-case-copy"><h3>{scenario.name}<span>{scenario.code}</span></h3><p>{scenario.description}</p><dl><div><dt>事故触发</dt><dd>{scenario.id === "steady" ? "无事故 · 稳态基准" : `T+ ${scenario.eventTime} s`}</dd></div><div><dt>仿真时长</dt><dd>{scenario.duration / 60} 分钟</dd></div><div><dt>破口面积</dt><dd>{scenario.breakAreaCm2 ? `${scenario.breakAreaCm2} cm²` : "—"}</dd></div></dl></div></section></aside>
      <div className="sim-center-column"><section className="sim-panel sim-board" data-switching={switching}><PanelHeader title="一回路系统状态" english="PRIMARY SYSTEM"><div className="sim-board-lamps"><StatusLamp on={plant.acPower}>AC 电源</StatusLamp><StatusLamp on={plant.rcpRunning}>RCP</StatusLamp><StatusLamp on={plant.scram} alarm>{plant.scram ? "已停堆" : "未停堆"}</StatusLamp></div></PanelHeader><SimulationMimic key={scenarioId} plant={plant} running={running} speed={speed}/></section><div className="sim-metrics"><Metric icon="power" label="堆芯热功率" value={plant.reactorPower.toFixed(2)} unit="%" alarm={plant.scram}/><Metric icon="pressure" label="一回路压力" value={plant.rcsPressure.toFixed(2)} unit="bar" alarm={plant.rcsPressure < PCTRAN.lowPressureScramBar}/><Metric icon="temperature" label="一回路平均温度" value={plant.rcsTemperature.toFixed(1)} unit="°C"/><Metric icon="flow" label="主回路流量" value={plant.rcsFlow.toFixed(1)} unit="%" alarm={plant.rcsFlow < 66}/><Metric icon="inventory" label="RCS 装量" value={plant.rcsInventory.toFixed(1)} unit="%" alarm={plant.rcsInventory < 70}/><Metric icon="temperature" label="最高燃料温度" value={plant.fuelTemperature.toFixed(0)} unit="°C" alarm={plant.fuelTemperature >= 1200}/></div><section className="sim-panel sim-trends"><PanelHeader title="实时趋势曲线" english="REAL-TIME TRENDS"><small>1 s 采样 · 最近 300 点</small></PanelHeader><div className="sim-plots"><TrendPlot title="RCS / 堆芯" history={session.history} leftMax={200} series={[{ key:"pressure",label:"RCS 压力",color:"#ffa92f",unit:"bar",max:200 },{ key:"power",label:"堆功率",color:"#21c7ff",unit:"%",max:120 },{ key:"inventory",label:"RCS 装量",color:"#03e5bb",unit:"%",max:120 }]}/><TrendPlot title="二次侧 / 安全壳" history={session.history} leftMax={100} series={[{ key:"sgPressure",label:"SG 压力",color:"#23cfff",unit:"bar",max:100 },{ key:"sgLevel",label:"SG 水位",color:"#05e9b3",unit:"%",max:120 },{ key:"containment",label:"安全壳",color:"#ff776c",unit:"bar",max:100 }]}/></div></section></div>
      <aside className="sim-right-column"><section className="sim-panel sim-protection"><PanelHeader title="保护与安注" english="REACTOR PROTECTION"><button className="sim-text-button" onClick={() => setDialog("protection")}>查看定值 ›</button></PanelHeader><div className="sim-protection-table">{protectionRows.map(item => <div key={item.label} className={!item.available ? "unavailable" : item.active ? "actuated" : "armed"}><i/><strong>{item.label}</strong><span>{!item.available ? "电源失去" : item.active ? "已动作" : item.label === "RX TRIP" ? "未触发" : "待命"}</span></div>)}</div><div className="sim-flow-summary"><div><span>破口流量</span><strong>{plant.breakFlow.toFixed(1)}<small>t/h</small></strong></div><div><span>HPSI 流量</span><strong>{plant.hpsiFlow.toFixed(1)}<small>t/h</small></strong></div><div><span>蓄压箱 / LPI</span><strong>{plant.accumulatorFlow.toFixed(1)} / {plant.lpiFlow.toFixed(1)}<small>t/h</small></strong></div><div><span>安全壳压力</span><strong>{plant.containmentPressure.toFixed(3)}<small>bar</small></strong></div></div></section><section className="sim-panel sim-actions"><PanelHeader title="操纵员动作" english="OPERATOR ACTIONS"><button className="sim-text-button" onClick={() => setDialog("actions")}>更多操作 ›</button></PanelHeader><div className="sim-action-grid">{actionDefinitions.slice(0,4).map(actionButton)}</div></section><section className="sim-panel sim-events"><PanelHeader title="事件序列" english="EVENT SEQUENCE"><button className="sim-text-button" onClick={() => setDialog("events")}>全部事件 {session.events.length} ›</button></PanelHeader><EventLog events={session.events}/></section></aside>
    </div>
    <div className="sim-transport"><button className={`sim-start ${running ? "active" : ""}`} disabled={running} onClick={start}><SimIcon name="play" size={15}/>{running ? "运行中" : complete ? "重新运行" : "运行"}</button><button className="sim-pause" disabled={!running} onClick={() => setPlaying(false)}><SimIcon name="pause" size={15}/>暂停</button><button onClick={() => reset()}><SimIcon name="reset" size={15}/>重置</button><span className="sim-speed-label">仿真倍速</span><div className="sim-speed-options" role="group" aria-label="仿真倍速">{speedOptions.map(item => <button key={item} className={speed === item ? "active" : ""} aria-pressed={speed === item} onClick={() => setSpeed(item)}>{item}×</button>)}</div><div className="sim-model-status"><span role="status">{complete ? "本轮仿真已完成" : running ? "仿真计算中" : plant.time ? "仿真已暂停" : "仿真就绪"}</span><code>PCTRAN 7.0.2 · PWR-3 LOOP · Δt = 1.0 s</code><span>训练演示</span></div></div>
    {dialog && <div className="sim-modal-backdrop"><button className="sim-modal-scrim" aria-label="关闭仿真详情背景" onClick={() => setDialog(null)}/><section className="sim-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sim-dialog-heading"><header><div><span>仿真实验室 · {scenario.code}</span><h2 id="sim-dialog-heading">{dialog === "protection" ? "保护与安注定值" : dialog === "actions" ? "操纵员动作" : "完整事件序列"}</h2></div><button className="sim-icon-button" aria-label="关闭仿真详情" onClick={() => setDialog(null)}><SimIcon name="close"/></button></header><p>{dialog === "protection" ? "当前本地训练模型使用的动作定值与系统条件。" : dialog === "actions" ? "动作将应用于当前仿真，并在事件序列中留存。自动保护条件仍生效。" : `${scenario.name} · T+${formatTime(plant.time)} · 最近 ${session.events.length} 条记录`}</p><div className="sim-dialog-body">{dialog === "protection" ? <div className="sim-setpoint-table">{protectionRows.map(item => <div key={item.label}><strong>{item.label}</strong><span>{item.setpoint}</span><small>{item.description}</small></div>)}</div> : dialog === "actions" ? <div className="sim-action-grid">{actionDefinitions.map(actionButton)}</div> : <EventLog events={session.events}/>}</div><footer className="sim-dialog-footer"><span>本地训练仿真</span><button onClick={() => setDialog(null)}>返回仿真</button></footer></section></div>}
  </div>;
}
