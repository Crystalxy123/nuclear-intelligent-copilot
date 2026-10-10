"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import "@/app/unit-trend-chart.css";
import { downloadDemoFile } from "@/lib/demo-downloads";
import { getEventPressure, useDemoEvent } from "@/lib/demo-event";
import { getUnitSnapshot } from "@/lib/unit-demo";
import { useAlarmPresentation } from "@/lib/use-alarm-presentation";
import AnimatedNumber from "./AnimatedNumber";

export interface UnitTrendSnapshot {
  reactorPower: number;
  primaryPressure: number;
  pumpPressure?: number;
  pumpSpeed: number;
  steamLevel: number;
  generatorPower: number;
}
export type UnitTrendMetric = keyof UnitTrendSnapshot;
export interface UnitTrendChartProps {
  snapshot?: UnitTrendSnapshot;
  tick?: number;
  currentHour?: number;
  selectedMetric?: UnitTrendMetric;
  onSelectMetric?: (metric: UnitTrendMetric) => void;
  alarmMarked?: boolean;
  alarmFocusVersion?: number;
  onSelectAlarm?: () => void;
}

type TrendPoint = { hour: number; value: number };
const DEFAULT_SNAPSHOT = { reactorPower: 95.3, primaryPressure: 15.61, pumpPressure: 4.5, pumpSpeed: 4320, steamLevel: 62, generatorPower: 1346 };
const METRICS: { id: UnitTrendMetric; label: string; unit: string; spokenUnit: string; digits: number; low: number; high: number; amplitude: number }[] = [
  { id: "pumpPressure", label: "P101 出口压力", unit: "MPa", spokenUnit: "兆帕", digits: 2, low: 4.2, high: 4.6, amplitude: .002 },
  { id: "reactorPower", label: "反应堆功率", unit: "%Pn", spokenUnit: "额定功率百分比", digits: 1, low: 0, high: 120, amplitude: .12 },
  { id: "primaryPressure", label: "一回路压力", unit: "MPa", spokenUnit: "兆帕", digits: 2, low: 15, high: 16, amplitude: .001 },
  { id: "pumpSpeed", label: "主泵转速", unit: "rpm", spokenUnit: "转每分钟", digits: 0, low: 0, high: 5000, amplitude: .018 },
  { id: "steamLevel", label: "蒸汽发生器水位", unit: "%", spokenUnit: "百分比", digits: 1, low: 0, high: 100, amplitude: .04 },
  { id: "generatorPower", label: "发电机功率", unit: "MWe", spokenUnit: "兆瓦电功率", digits: 0, low: 0, high: 1600, amplitude: .04 },
];
const H = 104, LEFT = 36, TOP = 12, BOTTOM = 80;
const clock = (hour: number) => {
  const seconds = Math.round(hour * 3600);
  return `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${(Math.floor(seconds / 60) % 60).toString().padStart(2, "0")}${seconds % 60 ? `:${(seconds % 60).toString().padStart(2,"0")}` : ""}`;
};
function valueAt(points: TrendPoint[], hour: number) {
  const next = points.findIndex(point => point.hour >= hour);
  if (next <= 0) return points[next < 0 ? points.length - 1 : 0].value;
  const a = points[next - 1], b = points[next];
  return a.value + (b.value - a.value) * (hour - a.hour) / Math.max(.000001,b.hour - a.hour);
}

export default function UnitTrendChart({ snapshot = DEFAULT_SNAPSHOT, tick = 0, currentHour = 24, selectedMetric, onSelectMetric, alarmMarked = false, alarmFocusVersion = 0, onSelectAlarm }: UnitTrendChartProps) {
  const id = useId().replace(/:/g, "");
  const plot = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(470);
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setPlotWidth(Math.max(150, entries[0].contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const W = plotWidth, RIGHT = W - 12;
  const event = useDemoEvent();
  const alarmMotion = useAlarmPresentation();
  const [ownSelected, setOwnSelected] = useState<UnitTrendMetric>("pumpPressure");
  const [hours, setHours] = useState<1 | 6 | 24>(1);
  const [inspectedVersion, setInspectedVersion] = useState(0);
  const [inspectionHour, setInspectionHour] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = selectedMetric ?? ownSelected;
  const select = (metric: UnitTrendMetric) => { setOwnSelected(metric); onSelectMetric?.(metric); setPinned(false); setInspectionHour(null); };
  const metric = METRICS.find(item => item.id === selected)!;
  const isEvent = selected === "pumpPressure" && event.alarmTriggered;
  const supplied = snapshot[selected] ?? DEFAULT_SNAPSHOT[selected];
  const currentValue = isEvent ? getEventPressure(alarmMotion.seconds) : Number.isFinite(supplied) ? supplied : DEFAULT_SNAPSHOT[selected];
  const endHour = Number.isFinite(currentHour) ? Math.max(0, Math.min(24, currentHour)) : 24;
  const startHour = Math.max(0,endHour - hours);
  const span = Math.max(1 / 60,endHour - startHour);
  const anomalyStart = Math.max(startHour,endHour - 180 / 3600);
  const alarmHour = Math.max(startHour,endHour - 150 / 3600);
  // Historical samples stay fixed. Live samples occupy only the right-hand tail.
  const liveStart = isEvent ? anomalyStart : endHour - span * .09;
  const historicValue = DEFAULT_SNAPSHOT[selected];
  const history: TrendPoint[] = Array.from({ length: 49 }, (_, index) => {
    const hour = startHour + (liveStart - startHour) * index / 48;
    return { hour, value: isEvent ? 4.5 : historicValue * (1 - metric.amplitude * Math.sin((liveStart - hour) * 1.2) ** 2) };
  });
  const lastSample = Math.min(48, tick + 1);
  const livePoints: TrendPoint[] = isEvent
    ? Array.from({ length: Math.floor(alarmMotion.seconds / 6) + 1 }, (_, index) => ({ hour: anomalyStart + index * 6 / 3600, value: getEventPressure(index * 6) }))
    : Array.from({ length: lastSample + 1 }, (_, index) => ({ hour: liveStart + (endHour - liveStart) * index / 49, value: getUnitSnapshot(Math.max(0, tick - lastSample + index))[selected] }));
  const displayedHour = isEvent ? anomalyStart + alarmMotion.seconds / 3600 : liveStart + (endHour - liveStart) * (lastSample + 1) / 49;
  const points: TrendPoint[] = [...history, ...livePoints.filter(point => point.hour > liveStart && point.hour < displayedHour), { hour: displayedHour, value: currentValue }];
  const activeHour = Math.max(startHour, Math.min(displayedHour, (alarmMarked && isEvent && inspectedVersion !== alarmFocusVersion) ? alarmHour : inspectionHour ?? (alarmMarked && isEvent ? alarmHour : displayedHour)));
  const activeValue = valueAt(points, activeHour);
  const low = Math.min(metric.low,...points.map(point=>point.value));
  const high = Math.max(metric.high,...points.map(point=>point.value));
  const x = (hour: number) => LEFT + (hour - startHour) / span * (RIGHT - LEFT);
  const y = (value: number) => BOTTOM - (value - low) / (high - low) * (BOTTOM - TOP);
  const line = points.map((point,index)=>`${index ? "L" : "M"}${x(point.hour).toFixed(2)} ${y(point.value).toFixed(2)}`).join(" ");
  const segmentPath = (segment: TrendPoint[]) => segment.map((point,index)=>`${index ? "L" : "M"}${x(point.hour).toFixed(2)} ${y(point.value).toFixed(2)}`).join(" ");
  const baselineLine = segmentPath(points.filter(point=>point.hour <= anomalyStart));
  const eventLine = segmentPath(points.filter(point=>point.hour >= anomalyStart));
  const liveLine = segmentPath(points.slice(0, -1));
  const latestSegment = segmentPath(points.slice(-2));
  const tooltip = hovered || focused || pinned || (alarmMarked && isEvent);
  const change = currentValue - points[points.length - 2].value;
  const changeText = isEvent ? `↓ ${(4.3 * alarmMotion.seconds / 180).toFixed(1)}% / 180 s` : Math.abs(change) < .5 * 10 ** -metric.digits ? "趋势平稳" : `${change > 0 ? "↑ +" : "↓ −"}${Math.abs(change).toFixed(metric.digits)} ${metric.unit}`;
  const markAlarm = () => { select("pumpPressure"); setInspectionHour(alarmHour); setPinned(true); onSelectAlarm?.(); };

  function navigateTabs(key: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = key.key === "ArrowRight" ? (index + 1) % METRICS.length : key.key === "ArrowLeft" ? (index + METRICS.length - 1) % METRICS.length : key.key === "Home" ? 0 : key.key === "End" ? METRICS.length - 1 : -1;
    if (next < 0) return;
    key.preventDefault(); select(METRICS[next].id); tabs.current[next]?.focus();
  }
  function inspectPointer(pointer: PointerEvent<SVGSVGElement>) {
    const bounds = pointer.currentTarget.getBoundingClientRect();
    const svgX = (pointer.clientX - bounds.left) / bounds.width * W;
    setInspectionHour(Math.max(startHour,Math.min(endHour,startHour + (svgX - LEFT) / (RIGHT - LEFT) * span)));
    setInspectedVersion(alarmFocusVersion); setHovered(true);
  }
  function inspectKeyboard(key: KeyboardEvent<SVGSVGElement>) {
    const step = span / 60;
    const offsets: Record<string,number> = {ArrowLeft:-step,ArrowRight:step,ArrowDown:-step,ArrowUp:step,PageDown:-span/6,PageUp:span/6};
    if (!(key.key in offsets) && key.key !== "Home" && key.key !== "End") return;
    key.preventDefault(); setInspectedVersion(alarmFocusVersion); setInspectionHour(key.key === "Home" ? startHour : key.key === "End" ? endHour : Math.max(startHour,Math.min(endHour,activeHour + offsets[key.key]))); setPinned(true);
  }
  return <section className="utc-panel" aria-label="关键运行参数趋势">
    <header className="utc-header"><h3>关键运行参数趋势 <span className="utc-preset">Demo</span><span className="utc-live-tick"><i key={tick}/>数据更新 1 s</span></h3>
      <div className="utc-window" role="group" aria-label="趋势时间范围">{([1,6,24] as const).map(range=><button key={range} aria-pressed={hours===range} onClick={()=>{setHours(range);setInspectionHour(null);setPinned(false);}}>{range}h</button>)}{event.alarmTriggered && <button className="utc-alarm-button" aria-pressed={alarmMarked && selected==="pumpPressure"} onClick={markAlarm}>△ A317</button>}</div>
      <div className="utc-tabs" role="tablist" aria-label="选择运行参数">{METRICS.map((item,index)=><button key={item.id} ref={element=>{tabs.current[index]=element;}} type="button" id={`${id}-tab-${item.id}`} role="tab" aria-selected={selected===item.id} aria-controls={`${id}-panel`} tabIndex={selected===item.id?0:-1} className={selected===item.id?"utc-tab-active":undefined} onClick={()=>select(item.id)} onKeyDown={key=>navigateTabs(key,index)}>{item.label}</button>)}</div>
    </header>
    <div className="utc-body" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected}`}>
      <div ref={plot} className="utc-plot"><svg className="utc-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="slider" tabIndex={0} aria-label={`${metric.label}趋势，选择查看时间`} aria-valuemin={startHour} aria-valuemax={endHour} aria-valuenow={activeHour} aria-valuetext={`${clock(activeHour)}，${activeValue.toFixed(metric.digits)} ${metric.spokenUnit}`} aria-describedby={`${id}-description`} onPointerMove={inspectPointer} onPointerDown={pointer=>{inspectPointer(pointer);setPinned(true);pointer.currentTarget.focus();}} onPointerLeave={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onKeyDown={inspectKeyboard}>
        <title>{`${metric.label} ${hours} 小时场景趋势，单位 ${metric.unit}`}</title><desc id={`${id}-description`}>本地场景，非实际历史遥测。方向键选择时间，Home 和 End 跳到首末时刻；点击固定读数。黄色区域为最近 180 秒异常窗口。</desc>
        <defs><linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#03daca" stopOpacity=".16"/><stop offset="1" stopColor="#00bfff" stopOpacity=".01"/></linearGradient><clipPath id={`${id}-clip`}><rect x={LEFT-1} y={TOP-2} width={RIGHT-LEFT+4} height={BOTTOM-TOP+4}/></clipPath></defs>
        <text className="utc-axis-unit" x={LEFT} y="8">{metric.unit}</text>
        {[low,(low+high)/2,high].map(tick=><g key={tick}><line className="utc-grid" x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)}/><text className="utc-axis-text" x={LEFT-8} y={y(tick)+4} textAnchor="end">{tick%1===0?tick:tick.toFixed(1)}</text></g>)}
        {Array.from({length:5},(_,index)=>startHour+span*index/4).map((hour,index)=><g key={hour}><line className="utc-grid utc-grid-vertical" x1={x(hour)} x2={x(hour)} y1={TOP} y2={BOTTOM}/><text className={`utc-axis-text utc-time-label ${index%2?"utc-time-minor":""}`} x={x(hour)} y="99" textAnchor={index===0?"start":index===4?"end":"middle"}>{clock(hour)}</text></g>)}
        <path className="utc-axis" d={`M${LEFT} ${TOP}V${BOTTOM}H${RIGHT}`}/>
        <g clipPath={`url(#${id}-clip)`}>{isEvent && <rect className="utc-anomaly-window" x={Math.min(x(anomalyStart),RIGHT-7)} y={TOP} width={Math.max(7,RIGHT-x(anomalyStart))} height={BOTTOM-TOP}/>}<path d={`${line}L${x(displayedHour)} ${BOTTOM}H${LEFT}Z`} fill={`url(#${id}-area)`}/><path className="utc-trend-line utc-first-draw" pathLength="1000" d={isEvent ? baselineLine : liveLine}/>{!isEvent && <path key={`${selected}-${tick}`} className="utc-trend-line utc-new-segment" pathLength="100" d={latestSegment}/>}{isEvent && <path className="utc-trend-line utc-event-segment" pathLength="1000" d={eventLine}/> }<circle cx={x(displayedHour)} cy={y(currentValue)} r="2.2" fill="#2affe1"/>{alarmMarked && isEvent && <g className="utc-alarm-marker"><path d={`M${x(alarmHour)} ${TOP}V${BOTTOM}`}/><circle cx={x(alarmHour)} cy={y(valueAt(points,alarmHour))} r="3"/></g>}</g>
        {tooltip && <g aria-hidden="true"><path className="utc-selection-line" d={`M${x(activeHour)} ${TOP}V${BOTTOM}`}/><circle cx={x(activeHour)} cy={y(activeValue)} r="3.2" fill="#073048" stroke="#64fff0" strokeWidth="1.4"/></g>}
      </svg>{tooltip && <div className="utc-tooltip" style={{left:`clamp(4px, calc(${x(activeHour)/W*100}% ${x(activeHour)>W/2?"- 138px":"+ 8px"}), calc(100% - 138px))`}} aria-hidden="true"><span>{clock(activeHour)} · {metric.label}</span><strong>{activeValue.toFixed(metric.digits)} <small>{metric.unit}</small></strong>{alarmMarked && isEvent && <small>A317 · {clock(alarmHour)}</small>}</div>}</div>
      <aside className="utc-current" aria-label={`${metric.label}当前值`}><span>当前值</span><strong><AnimatedNumber value={currentValue} digits={metric.digits}/> <small>{metric.unit}</small></strong><em className={isEvent?"utc-alert-value":undefined}>{changeText}</em><time>{clock(displayedHour)} · {hours}h</time><button className="utc-export" title="下载当前参数的场景预设曲线" onClick={()=>downloadDemoFile(`S01-${metric.id}-${hours}h-demo.csv`,"\uFEFF"+["样本时刻,指标,数值,单位,数据口径",...points.map(point=>`${clock(point.hour)},${metric.label},${point.value.toFixed(metric.digits)},${metric.unit},本地场景预设（非历史遥测）`)].join("\r\n"),"text/csv;charset=utf-8")}>↓ 下载曲线</button></aside>
    </div>
  </section>;
}
