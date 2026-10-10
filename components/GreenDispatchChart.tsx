"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import "@/app/green-dispatch-chart.css";
import { useFirstViewMotion } from "@/lib/use-first-view-motion";

type PlanId = "A" | "B" | "C";
type Range = "day" | "midday" | "evening";
type SeriesId = "demand" | "htgr1" | "htgr2" | "renewable" | "additional";

export interface GreenDispatchChartProps {
  active?: boolean;
  planId: PlanId;
  range: Range;
  windowActive: boolean;
  onWindowChange: (active: boolean) => void;
}

type PowerPoint = { hour: number } & Record<SeriesId, number>;

const SERIES: { id: SeriesId; label: string; color: string; dashed?: boolean }[] = [
  { id: "demand", label: "总负荷需求", color: "#20bdfb", dashed: true },
  { id: "htgr1", label: "HTGR-1", color: "#19d9f1" },
  { id: "htgr2", label: "HTGR-2", color: "#d178f8" },
  { id: "renewable", label: "新能源出力", color: "#00d9a5" },
  { id: "additional", label: "建议增纳（右轴）", color: "#f3df65" },
];

const RANGES: Record<Range, { start: number; end: number; tick: number }> = {
  day: { start: 0, end: 24, tick: 4 },
  midday: { start: 8, end: 18, tick: 2 },
  evening: { start: 16, end: 24, tick: 2 },
};

// Hourly illustrative scenario presets, in MW. These are not live telemetry.
const DEMAND = [350, 355, 345, 340, 343, 347, 360, 390, 418, 456, 470, 457, 455, 450, 432, 413, 412, 416, 405, 419, 424, 417, 408, 390, 372];
const BASE_RENEWABLE = [45, 44, 42, 50, 67, 93, 98, 116, 137, 158, 172, 183, 195, 203, 199, 182, 158, 140, 124, 98, 74, 58, 48, 44, 43];
const PEAK_ADDITIONAL: Record<PlanId, number> = { A: 0, B: 6, C: 0 };
const H = 172;
const PAD = { left: 43, right: 35, top: 17, bottom: 24 };
const PLOT_H = H - PAD.top - PAD.bottom;
const BOTTOM = H - PAD.bottom;

function interpolate(values: number[], hour: number) {
  const lower = Math.min(23, Math.floor(hour));
  return values[lower] + (values[lower + 1] - values[lower]) * (hour - lower);
}

function powerAt(hour: number, planId: PlanId, windowActive: boolean): PowerPoint {
  const demand = interpolate(DEMAND, hour);
  const renewable = interpolate(BASE_RENEWABLE, hour);
  // 14–15 ramp up, 15–17 hold at 6 MW, 17–18 ramp down: 3 + 12 + 3 = 18 MWh.
  // Additional renewable acceptance displaces nuclear output, not demand.
  const additional = (windowActive ? PEAK_ADDITIONAL[planId] : 0) * Math.max(0, Math.min(1, hour - 14, 18 - hour));
  const nuclear = demand - renewable - additional;
  const htgr1 = nuclear * .58 + Math.sin(hour / 24 * Math.PI * 2) * 3;
  return { hour, demand, renewable, additional, htgr1, htgr2: nuclear - htgr1 };
}

function formatHour(hour: number) {
  const totalMinutes = Math.round(hour * 60);
  return `${Math.floor(totalMinutes / 60).toString().padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
}

export default function GreenDispatchChart({ planId, range, windowActive, onWindowChange, active: isActive = true }: GreenDispatchChartProps) {
  const reveal = useFirstViewMotion("green-dispatch", isActive);
  const plot = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(740);
  useEffect(() => {
    if (!plot.current) return;
    const observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      if (width > 0) setPlotWidth(Math.max(230, Math.min(740, width)));
    });
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const W = plotWidth;
  const PLOT_W = W - PAD.left - PAD.right;
  const id = useId().replace(/:/g, "");
  const [visible, setVisible] = useState<Record<SeriesId, boolean>>({ demand: true, htgr1: true, htgr2: true, renewable: true, additional: true });
  const [selectedHour, setSelectedHour] = useState(16);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { start, end, tick: baseTick } = RANGES[range];
  const tick = W < 420 ? range === "day" ? 8 : range === "midday" ? 5 : 4 : baseTick;
  const visibleCount = Object.values(visible).filter(Boolean).length;
  const activeHour = Math.max(start, Math.min(end, selectedHour));
  const active = powerAt(activeHour, planId, windowActive);
  const current = powerAt(16, planId, windowActive);
  const points = useMemo(() => Array.from({ length: (end - start) * 4 + 1 }, (_, index) => powerAt(start + index / 4, planId, windowActive)), [start, end, planId, windowActive]);
  const x = (hour: number) => PAD.left + (hour - start) / (end - start) * PLOT_W;
  const y = (power: number, key: SeriesId) => BOTTOM - power / (key === "additional" ? 6 : 600) * PLOT_H;
  const line = (key: SeriesId) => points.map((point, index) => `${index ? "L" : "M"}${x(point.hour).toFixed(2)} ${y(point[key], key).toFixed(2)}`).join(" ");
  const ticks = Array.from({ length: Math.floor((end - start) / tick) + 1 }, (_, index) => start + index * tick);
  const tooltip = hovered || focused;
  const screenReaderValue = `${formatHour(activeHour)}，${SERIES.filter(series => visible[series.id]).map(series => `${series.label} ${active[series.id].toFixed(1)} 兆瓦`).join("，")}`;

  function selectFromPointer(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = (event.clientX - bounds.left) / bounds.width * W;
    const hour = start + (svgX - PAD.left) / PLOT_W * (end - start);
    setSelectedHour(Math.max(start, Math.min(end, Math.round(hour * 4) / 4)));
    setHovered(true);
    return Math.max(start, Math.min(end, hour));
  }

  function selectFromKeyboard(event: KeyboardEvent<SVGSVGElement>) {
    if ((event.key === "Enter" || event.key === " ") && activeHour >= 14 && activeHour <= 18) { event.preventDefault(); onWindowChange(!windowActive); return; }
    const offsets: Record<string, number> = { ArrowLeft: -.25, ArrowRight: .25, ArrowDown: -.25, ArrowUp: .25, PageDown: -1, PageUp: 1 };
    if (event.key === "Home" || event.key === "End" || event.key in offsets) {
      event.preventDefault();
      setSelectedHour(event.key === "Home" ? start : event.key === "End" ? end : Math.max(start, Math.min(end, activeHour + offsets[event.key])));
    }
  }

  return <div className="gdc-chart" data-reveal={reveal}>
    <div className="gdc-legend" aria-label="显示或隐藏功率曲线">
      <span className="gdc-power-unit">功率（MW）</span>
      {SERIES.map(series => <button
        key={series.id}
        type="button"
        className={`gdc-legend-button ${visible[series.id] ? "gdc-is-visible" : ""}`}
        aria-pressed={visible[series.id]}
        aria-label={`${series.label}，${visible[series.id] ? "当前显示" : "当前隐藏"}${visible[series.id] && visibleCount === 1 ? "，至少保留一条曲线" : ""}`}
        disabled={visible[series.id] && visibleCount === 1}
        title={visible[series.id] && visibleCount === 1 ? "至少保留一条曲线" : `点击${visible[series.id] ? "隐藏" : "显示"}${series.label}`}
        onClick={() => setVisible(previous => ({ ...previous, [series.id]: !previous[series.id] }))}
      >
        <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden="true"><path d="M1 4H17" stroke={series.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={series.dashed ? "4 3" : undefined}/></svg>
        <span>{series.label}</span>
      </button>)}
    </div>

    <div className={`gdc-window-control ${windowActive ? "gdc-window-selected" : ""}`}><button aria-pressed={windowActive} onClick={() => onWindowChange(!windowActive)}><span aria-hidden="true">{windowActive ? "✓" : "+"}</span>14:00–18:00 新能源出力窗口</button><span role="status">{windowActive ? "建议提升机组匹配度" : "点击高亮区间，评估窗口收益"}</span></div>
    <div className="gdc-plot" ref={plot}>
      <svg
        className="gdc-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="slider"
        tabIndex={0}
        aria-label="选择功率图表的查看时间"
        aria-valuemin={start}
        aria-valuemax={end}
        aria-valuenow={activeHour}
        aria-valuetext={screenReaderValue}
        aria-describedby={`${id}-description`}
        onPointerMove={selectFromPointer}
        onPointerDown={event => { const hour = selectFromPointer(event); event.currentTarget.focus(); if (hour >= 14 && hour <= 18) onWindowChange(!windowActive); }}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={selectFromKeyboard}
      >
        <title>{`系统功率与新能源增纳调度：方案 ${planId}`}</title>
        <desc id={`${id}-description`}>24 小时场景预设。左轴为 0 至 600 兆瓦；黄色增纳曲线单独使用右轴 0 至 6 兆瓦。总需求等于两台机组、基准新能源及新增消纳功率之和。使用左右方向键每次移动 15 分钟，Home 和 End 跳至当前范围两端。在 14:00 至 18:00 按回车或空格切换新能源窗口，或使用上方窗口按钮。</desc>
        <defs>
          <clipPath id={`${id}-reveal`}><rect className="green-chart-reveal" x={PAD.left} y={PAD.top - 1} width={PLOT_W} height={PLOT_H + 2}/></clipPath>
          <linearGradient id={`${id}-window-highlight`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#25ce9c" stopOpacity=".025"/><stop offset=".5" stopColor="#25ce9c" stopOpacity=".22"/><stop offset="1" stopColor="#25ce9c" stopOpacity=".025"/></linearGradient>
          <clipPath id={`${id}-clip`}><rect x={PAD.left} y={PAD.top - 1} width={PLOT_W} height={PLOT_H + 2}/></clipPath>
          <linearGradient id={`${id}-renewable-fill`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00d9a5" stopOpacity=".18"/><stop offset="1" stopColor="#00d9a5" stopOpacity=".015"/></linearGradient>
          <linearGradient id={`${id}-additional-fill`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f3df65" stopOpacity=".15"/><stop offset="1" stopColor="#f3df65" stopOpacity="0"/></linearGradient>
        </defs>
        {[0, 150, 300, 450, 600].map(value => <g key={value}>
          <line className="gdc-grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(value, "demand")} y2={y(value, "demand")}/>
          <text className="gdc-axis-text" x={PAD.left - 10} y={y(value, "demand") + 4} textAnchor="end">{value}</text>
          {visible.additional && <text className="gdc-axis-text gdc-right-axis" x={W - PAD.right + 8} y={y(value, "demand") + 4}>{value / 100}</text>}
        </g>)}
        {ticks.map(hour => <g key={hour}>
          <line className="gdc-grid-line" x1={x(hour)} x2={x(hour)} y1={PAD.top} y2={BOTTOM}/>
          <line className="gdc-axis-line" x1={x(hour)} x2={x(hour)} y1={BOTTOM} y2={BOTTOM + 4}/>
          <text className="gdc-axis-text" x={x(hour)} y={H - 4} textAnchor={hour === start ? "start" : hour === end ? "end" : "middle"}>{formatHour(hour)}</text>
        </g>)}
        <path className="gdc-axis-line" d={`M${PAD.left} ${PAD.top}V${BOTTOM}H${W - PAD.right}`}/>
        {visible.additional && <text className="gdc-axis-text gdc-right-axis gdc-axis-caption" x={W - PAD.right + 1} y="9">MW</text>}
        <g clipPath={`url(#${id}-clip)`}>
          <rect className={`gdc-window-region ${windowActive ? "gdc-window-active" : ""}`} x={x(Math.max(start,14))} y={PAD.top} width={Math.max(0,x(Math.min(end,18))-x(Math.max(start,14)))} height={PLOT_H} style={windowActive ? { fill: `url(#${id}-window-highlight)` } : undefined}/>

          <g clipPath={`url(#${id}-reveal)`}>{(["renewable", "additional"] as SeriesId[]).map(key => visible[key] && <path key={key} d={`${line(key)}L${x(end)} ${BOTTOM}H${x(start)}Z`} fill={`url(#${id}-${key}-fill)`}/>)}
          {SERIES.map(series => visible[series.id] && <path key={series.id} d={line(series.id)} className="gdc-series-line" fill="none" stroke={series.color} strokeWidth={series.id === "demand" ? 2 : 1.8} strokeDasharray={series.dashed ? "7 5" : undefined}/>)}</g>
        </g>
        {16 >= start && 16 <= end && <g>
          <line x1={x(16)} x2={x(16)} y1="7" y2={BOTTOM} className="gdc-current-line"/>
          <text x={x(16) + 7} y="12" className="gdc-current-label">16:00 当前</text>
          {visible.htgr1 && <circle cx={x(16)} cy={y(current.htgr1, "htgr1")} r="3.5" fill="#35e9c2" stroke="#cffdf6" strokeWidth="1.3"/>}
        </g>}
        {tooltip && <g aria-hidden="true">
          <line x1={x(activeHour)} x2={x(activeHour)} y1={PAD.top} y2={BOTTOM} className="gdc-selection-line"/>
          {SERIES.map(series => visible[series.id] && <circle key={series.id} cx={x(activeHour)} cy={y(active[series.id], series.id)} r="3" fill="#062236" stroke={series.color} strokeWidth="1.5"/>)}
        </g>}
      </svg>
      {tooltip && <div
        className="gdc-tooltip"
        style={{ left: `clamp(8px, calc(${x(activeHour) / W * 100}% ${x(activeHour) > W / 2 ? "- 218px" : "+ 10px"}), calc(100% - 216px))` }}
        aria-hidden="true"
      >
        <strong>{formatHour(activeHour)} <span>方案 {planId}</span></strong>
        {SERIES.filter(series => visible[series.id]).map(series => <div key={series.id}><span><i style={{ background: series.color }}/>{series.label}</span><b>{active[series.id].toFixed(1)} <small>MW</small></b></div>)}
      </div>}
    </div>
    <p className="gdc-caption"><span>场景预设 · 绿线为基准出力，黄线为新增消纳（右轴）</span><span>方案 {planId}：+{((windowActive ? PEAK_ADDITIONAL[planId] : 0) * 3).toFixed(1)} MWh / 日</span></p>
  </div>;
}
