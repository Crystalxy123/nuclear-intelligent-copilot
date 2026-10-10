"use client";

import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";
import EnergyFlow from "./EnergyFlow";
import { useFirstViewMotion } from "@/lib/use-first-view-motion";
import "@/app/motion-agents-enhanced.css";
import { DECISION_ID, updateDecisionRecord, useDecisionRecord } from "@/lib/decision-card";
import { setDemoEventPhase } from "@/lib/demo-event";
import { downloadDemoFile } from "@/lib/demo-downloads";

type EnergyWorkspaceProps = { active?: boolean; go: (view: "decision" | "evidence") => void };

const forecast = [104, 90, 75, 63, 52, 61, 80, 112, 151, 186, 213, 237, 249, 244, 229, 201, 172, 141, 119, 108, 99, 89, 84, 80];
const demand = [516, 505, 495, 486, 490, 510, 544, 568, 589, 603, 611, 620, 619, 604, 586, 560, 576, 612, 649, 626, 596, 570, 548, 528];

function EnergyForecast({ hours, active }: { hours: 12 | 24; active: boolean }) {
  const reveal = useFirstViewMotion("energy-forecast", active);
  const start = hours === 12 ? 6 : 0;
  const solar = forecast.slice(start, start + hours);
  const load = demand.slice(start, start + hours);
  const x = (index: number) => 56 + index / (hours - 1) * 724;
  const y = (value: number) => 268 - value / 700 * 230;
  const line = (values: number[]) => values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return <div className="ew-forecast" data-reveal={reveal}><svg viewBox="0 0 820 310" role="img" aria-label={`未来${hours}小时核电、风光出力与区域负荷预测`}>
    <defs><clipPath id="ew-first-reveal"><rect className="energy-chart-reveal" x="56" y="32" width="724" height="236"/></clipPath><linearGradient id="ew-renewable-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#55e7c5" stopOpacity=".23"/><stop offset="1" stopColor="#55e7c5" stopOpacity="0"/></linearGradient><linearGradient id="ew-window-fill" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#9d81ff" stopOpacity=".03"/><stop offset=".5" stopColor="#9d81ff" stopOpacity=".14"/><stop offset="1" stopColor="#9d81ff" stopOpacity=".03"/></linearGradient></defs>
    {[0, 200, 400, 600].map(value => <g key={value}><line x1="56" x2="780" y1={y(value)} y2={y(value)} stroke="#124666" strokeDasharray="3 5"/><text x="41" y={y(value) + 4} fill="#7fa6c4" fontSize="12" textAnchor="end">{value}</text></g>)}
    <text x="18" y="22" fill="#8fb2cd" fontSize="12">MW</text>
    <rect x={x(13 - start)} y="32" width={x(16 - start) - x(13 - start)} height="236" fill="url(#ew-window-fill)" stroke="#8970d555" strokeDasharray="4 5"/>
    <text x={(x(13 - start) + x(16 - start)) / 2} y="23" fill="#c4b6ff" fontSize="12" textAnchor="middle">协同消纳窗口</text>
    <g clipPath="url(#ew-first-reveal)"><path d={`${line(solar)} L780,268 L56,268Z`} fill="url(#ew-renewable-area)"/>
    <path d={line(load)} fill="none" stroke="#b29bff" strokeWidth="2.5"/>
    <path d={`M56 ${y(400)}H780`} fill="none" stroke="#28d8ff" strokeWidth="2.5"/>
    <path d={line(solar)} fill="none" stroke="#5eebbd" strokeWidth="2.5"/>
    </g><g className="ew-energy-flow" aria-hidden="true">
      <path d={`M56 ${y(400)}H780`} pathLength="100" stroke="#b9f4ff"/>
      <path d={line(solar)} pathLength="100" stroke="#c4ffe9"/>
    </g>
    {solar.map((value, index) => index % (hours === 12 ? 2 : 4) === 0 ? <circle key={index} cx={x(index)} cy={y(value)} r="3" fill="#78ffd3"/> : null)}
    {Array.from({ length: hours === 12 ? 6 : 7 }, (_, index) => Math.round(index / (hours === 12 ? 5 : 6) * (hours - 1))).map(index => <text key={index} x={x(index)} y="295" fill="#90b5cf" fontSize="12" textAnchor="middle">{String(start + index).padStart(2, "0")}:00</text>)}
    <path d="M56 32V268H780" fill="none" stroke="#2b6080"/>
  </svg></div>;
}

export default function EnergyWorkspace({ go, active = true }: EnergyWorkspaceProps) {
  const record = useDecisionRecord();
  const [hours, setHours] = useState<12 | 24>(24);
  const [power, setPower] = useState(6);
  const [plan, setPlan] = useState<{ power: number; energy: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const energy = power * 3;
  const changed = plan !== null && plan.power !== power;
  const submitPlan = () => {
    if (!plan || changed) return;
    const note = `维持核电 400 MW 基荷，13:00—16:00 储能按 ${plan.power} MW 充电，预计新增消纳 ${plan.energy} MWh；复核 P-201 状态与储能约束后实施。`;
    updateDecisionRecord(current => ({ ...current, selected: "B", status: "waiting", revision: current.revision + 1,
      adjustments: { ...current.adjustments, B: { note, reviewWindow: "2 小时内", monitorInterval: "30 秒" } },
      audit: [...current.audit, { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: "modified", plan: "B", revision: current.revision + 1, message: `新能源工作台提交协同计划：${note} 原演示收益需重新复核。` }],
    }));
    setDemoEventPhase("human-review"); setConfirming(false); go("decision");
  };
  return <div className="ew-workspace">
    <div className="ew-heading"><div><span className="ew-eyebrow">新能源协同分析</span><h2>让稳定基荷与清洁能源协同运行</h2></div><span className="ew-live"><i/>预测数据已同步 · 仿真场景</span></div>
    <div className="ew-kpis">
      <div><span>核电稳定出力</span><strong>{active ? <AnimatedNumber value={400} firstFromZero identity="energy-nuclear"/> : 400} <em>MW</em></strong><small><i/>双机组运行稳定</small></div>
      <div><span>当前风光出力</span><strong>{active ? <AnimatedNumber value={186} firstFromZero identity="energy-renewable" delay={150}/> : 186} <em>MW</em></strong><small>↗ 午后进入出力高峰</small></div>
      <div><span>储能荷电状态</span><strong>{active ? <AnimatedNumber value={68} firstFromZero identity="energy-soc" delay={300}/> : 68} <em>%</em></strong><small>可用充电空间 180 MWh</small></div>
      <div><span>计划新增消纳</span><strong>{active ? <AnimatedNumber value={energy} firstFromZero identity="energy-planned"/> : energy} <em>MWh</em></strong><small>{power} MW × 3 小时协同窗口</small></div>
    </div>
    <div className="ew-columns">
      <section className="ew-panel ew-forecast-panel">
        <header className="ew-panel-head"><div><span>01</span><h3>源荷协同预测</h3></div><div className="ew-range">{([12, 24] as const).map(value => <button key={value} aria-pressed={hours === value} onClick={() => setHours(value)}>{value} 小时</button>)}</div></header>
        <div className="ew-chart-legend"><span><i className="ew-nuclear"/>核电出力</span><span><i className="ew-renewable"/>风光出力</span><span><i className="ew-load"/>区域负荷</span><span className="ew-forecast-note">日前预测 · 每小时采样</span></div>
        <EnergyForecast hours={hours} active={active}/><EnergyFlow optimized={Boolean(plan)}/>
        <div className="ew-analysis"><span className="ew-analysis-icon">↗</span><div><strong>13:00—16:00，优先利用储能增加消纳</strong><p>风光出力在午后达到峰值。保持核电基荷稳定，通过储能充电吸收富余清洁电力，降低出力波动对协同运行的影响。</p></div></div>
        <div className="ew-source-footer"><span>依据：风光预测 · 区域负荷 · 储能可用容量</span><button onClick={() => go("evidence")}>查看数据证据 <span>→</span></button></div>
      </section>
      <aside className="ew-planning">
        <section className="ew-panel ew-window"><header className="ew-panel-head"><div><span>02</span><h3>协同运行窗口</h3></div><b>可规划</b></header><div className="ew-window-time"><span>推荐充电时段</span><strong>13:00 <em>—</em> 16:00</strong></div><div className="ew-window-facts"><div><span>窗口时长</span><strong>3 小时</strong></div><div><span>风光峰值</span><strong>249 MW</strong></div><div><span>核电运行策略</span><strong>维持基荷</strong></div></div></section>
        <section className="ew-panel ew-plan"><header className="ew-panel-head"><div><span>03</span><h3>储能协同计划</h3></div><b className="ew-plan-label">人工审核</b></header><div className="ew-plan-content"><label className="ew-power-label" htmlFor="ew-charge-power"><span>计划充电功率</span><strong>{power} <small>MW</small></strong></label><input id="ew-charge-power" aria-label="计划充电功率" type="range" min="6" max="18" step="1" value={power} onChange={event => { setPower(Number(event.target.value)); setConfirming(false); }}/><div className="ew-range-labels"><span>6 MW</span><span>18 MW</span></div><div className="ew-plan-result"><span>预计新增消纳</span><strong>{active ? <AnimatedNumber value={energy}/> : energy} <small>MWh</small></strong><p>按 {power} MW 连续充电 3 小时估算</p></div><button className="ew-create-plan" onClick={() => { setPlan({ power, energy }); setConfirming(false); }}>{plan && !changed ? "重新生成协同计划" : "生成协同计划"}<span>→</span></button><div className={`ew-plan-state ${plan ? "ew-generated" : ""}`} role="status">{plan ? <><strong>{changed ? "参数已调整 · 待重新生成" : "计划已生成 · 待人工审核"}</strong><p>13:00—16:00 储能以 {plan.power} MW 充电，预计新增消纳 {plan.energy} MWh。核电维持 400 MW 稳定出力。</p></> : <p>基于当前仿真场景生成本地计划，审核通过后再执行运行调整。</p>}</div>{plan && <div className="ew-generated-actions"><button disabled={changed} onClick={() => downloadDemoFile(`S01-energy-plan-${plan.power}MW.json`, JSON.stringify({ decision_id: DECISION_ID, source: "本地演示协同计划", window: "13:00—16:00", power_MW: plan.power, duration_hours: 3, energy_MWh: plan.energy, nuclear_MW: 400, status: "待人工复核" }, null, 2), "application/json;charset=utf-8")}>下载计划</button><button disabled={changed} onClick={() => setConfirming(true)}>提交决策复核 →</button></div>}{confirming && <div className="ew-submit-confirm" role="region" aria-label="确认提交协同计划"><strong>作为决策卡的新修订提交</strong><p>将采用本计划更新方案 B，保留既有记录并恢复待确认状态。{record.adjustments.B && "当前方案 B 的人工建议会由本计划替换。"}</p><div><button onClick={() => setConfirming(false)}>取消</button><button onClick={submitPlan}>确认更新并前往</button></div></div>}</div></section>
      </aside>
    </div>
  </div>;
}
