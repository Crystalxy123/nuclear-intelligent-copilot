"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { getReplayFrame, useDemoEvent } from "@/lib/demo-event";
import { useDecisionRecord } from "@/lib/decision-card";
import { useDemoMotion } from "@/lib/use-demo-motion";
import AnimatedNumber from "./AnimatedNumber";
import EventTimeline from "./EventTimeline";
import "@/app/motion-decision-enhanced.css";

export default function ReplayController() {
  const event = useDemoEvent();
  const record = useDecisionRecord();
  const motion = useDemoMotion();
  const clipId = useId();
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frame = getReplayFrame(time);
  const running = playing && time < 180 && motion.dataRunning;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTime(value => Math.min(180, value + .1 * speed)), 100);
    return () => window.clearInterval(timer);
  }, [running, speed]);
  const seek = (value: number) => { setPlaying(false); setTime(value); };
  const reset = () => { setPlaying(false); setTime(0); setSpeed(1); };
  const points = Array.from({ length: 61 }, (_, index) => `${26 + index / 60 * 440},${25 + (4.5 - getReplayFrame(index * 3).pressure) * 400}`).join(" ");
  const x = 26 + time / 180 * 440;
  const y = 25 + (4.5 - frame.pressure) * 400;
  const rpm = Math.round(4320 - 670 * Math.min(1,Math.max(0,(time - 30)/90)));
  const agents = ["安全智能体", "绿色智能体", "设备智能体"];
  return <div className="event-replay" data-playing={running && motion.running} aria-label="Event-021 事件回放">
    <div className="event-replay-summary"><span>{event.equipmentId} · {event.parameterId}</span><strong>T+{time.toFixed(0).padStart(3, "0")} s</strong><span>{frame.phase}</span></div>
    <p className="event-replay-note">180 秒场景时间轴 · 历史演示，不更改当前审核记录</p>
    <div className="event-replay-chart"><svg viewBox="0 0 500 150" aria-label={`历史P101压力 ${frame.pressure.toFixed(2)} MPa`} role="img"><rect x="100" y="15" width="366" height="101" fill="#ffad3210"/>{[4.5,4.4,4.3].map(value => <g key={value}><path d={`M26 ${25 + (4.5-value)*400}H466`} stroke="#16536d" strokeDasharray="3 4"/><text x="0" y={29+(4.5-value)*400}>{value}</text></g>)}<polyline points={points} fill="none" stroke="#397589" strokeWidth="1.5"/><clipPath id={clipId}><rect x="25" y="0" width={x-25} height="150"/></clipPath><polyline clipPath={`url(#${clipId})`} points={points} fill="none" stroke="#00e4df" strokeWidth="2.5"/><path d={`M${x} 15V116`} stroke="#93dce8" strokeDasharray="3 4"/><circle cx={x} cy={y} r="4" fill="#8ffff0"/><text x="26" y="140">T+00</text><text x="220" y="140">T+90</text><text x="420" y="140">T+180 s</text></svg></div>
    <div className="event-replay-values"><article><small>P101 出口压力</small><strong><AnimatedNumber value={frame.pressure} digits={2} duration={200}/> <em>MPa</em></strong><span>下降 <AnimatedNumber value={frame.drop} digits={1} duration={200}/>%</span></article><article><small>关联报警</small><strong className={time >= 60 ? "attention" : ""}>{time >= 60 ? "⚠ 已触发" : "○ 未触发"}</strong><span>A317</span></article><article><small>风险等级</small><strong>{frame.risk}</strong><span>{frame.agents}</span></article><article><small>推荐方案</small><strong>{time >= 120 ? "方案 B" : "待生成"}</strong><span>{time >= 120 ? "调整策略并安排核查" : "等待协同结果"}</span></article></div>
    <div className="erp-equipment"><div className="erp-pump" data-warning={time>=60} style={{"--pump-duration":`${3*4320/rpm}s`} as CSSProperties}><svg viewBox="0 0 70 70" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 30H16M54 30H67M3 40H16M54 40H67M26 55V63H45V55"/><circle cx="35" cy="35" r="22"/><g className="erp-pump-rotor"><path d="M35 31C18 10 16 37 32 36M39 35C60 18 33 16 34 32M35 39C52 60 54 33 38 34M31 35C10 52 37 54 36 38"/><circle cx="35" cy="35" r="4" fill="currentColor"/></g></svg><div><strong>P-201 · {time>=60 ? "⚠ 异常待核查" : time>=30 ? "压力下降" : "正常运行"}</strong><small><AnimatedNumber value={rpm} duration={200}/> rpm · 历史场景</small></div></div><div className="erp-agents">{agents.map((name,index)=>{const started=90+index*8;const complete=100+index*10;const status=time>=complete ? "complete" : time>=started ? "analyzing" : "waiting";return <div className="erp-agent" key={name} data-status={status}><span>{name}</span><small>{status === "complete" ? "✓ 结论已形成" : status === "analyzing" ? "◌ 分析中" : "○ 等待"}</small></div>;})}</div></div>
    <label className="event-replay-slider">回放进度<input type="range" min="0" max="180" step="1" value={time} onChange={event => seek(Number(event.target.value))} aria-label="事件回放时间" aria-valuetext={`T+${time.toFixed(0)} 秒，${frame.phase}`}/></label>
    <div className="event-replay-controls"><button onClick={() => { if (time >= 180) setTime(0); setPlaying(!running); }}>{running ? "Ⅱ 暂停" : time >= 180 ? "↻ 重新播放" : "▶ 播放"}</button><button className="erp-reset" onClick={reset} aria-label="重置回放">↺ 重置</button><div role="group" aria-label="回放倍速">{[1,2,5].map(value => <button key={value} aria-pressed={value===speed} onClick={() => setSpeed(value)}>{value}×</button>)}</div><span role="status">{running ? "播放中" : time >= 180 ? "回放结束" : playing && !motion.dataRunning ? "全局动效已暂停" : "已暂停"}</span></div>
    <EventTimeline time={time} onSeek={seek}/>
    <section className="erp-historical-card" data-ready={time>=120} aria-label="历史决策卡"><small>历史场景 · {event.decisionId}</small><strong>{time>=120 ? "方案 B · 调整策略并安排核查" : "决策卡等待生成"}</strong><p data-confirmed={time>=180}>{time>=180 ? "✓ 到达人工复核节点 · 历史场景示例" : time>=120 ? "86% 场景置信度 · 等待人工复核" : "等待 P101 趋势、报警关联与三智能体评估结果"}</p></section>
    <div className="event-replay-current"><strong>当前决策记录 · {event.decisionId}</strong><p>r{record.revision} · 方案 {record.selected} · {record.status === "approved" ? "已人工确认，执行待验证" : record.status === "rejected" ? "已驳回，待修订" : "待人工确认"}</p><small>回放中的方案 B 为原始场景推荐；当前人工选择及审核历史保留在审计记录中。</small></div>
  </div>;
}
