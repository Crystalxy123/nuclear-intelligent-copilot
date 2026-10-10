"use client";

import { useEffect, useRef } from "react";
import { beginEventPresentation, disposeDemoEventTimers, endEventPresentation, getDemoEvent, presentDemoFrame } from "@/lib/demo-event";
import { beginDecisionPresentation, endDecisionPresentation, getDecisionRecord, updateDecisionRecord } from "@/lib/decision-card";
import { beginAuditPresentation, endAuditPresentation } from "@/lib/evidence-audit";
import { closeDemoPlayback, getDemoPlayback, pauseDemoPlayback, updateDemoPlayback, useDemoPlayback } from "@/lib/demo-playback";

type DemoView = "overview" | "units" | "copilots" | "decision" | "evidence";
const stages = [{time:0,name:"正常运行",view:"overview"},{time:1,name:"设备感知",view:"units"},{time:3,name:"压力下降",view:"units"},{time:5,name:"A317 告警",view:"units"},{time:7,name:"安全分析",view:"copilots"},{time:9,name:"绿色分析",view:"copilots"},{time:11,name:"设备分析",view:"copilots"},{time:13.5,name:"协同判断",view:"copilots"},{time:15,name:"生成方案",view:"decision"},{time:18,name:"推荐方案 B",view:"decision"},{time:21,name:"人工复核示例",view:"decision"},{time:24,name:"确认样例",view:"decision"},{time:25,name:"审计证据链",view:"evidence"}] as const;
const currentStage = (time: number) => [...stages].reverse().find(stage => time >= stage.time) ?? stages[0];

export default function DemoPlaybackControls({ onNavigate }: { onNavigate: (view: DemoView) => void }) {
  const demo = useDemoPlayback();
  const navigate = useRef(onNavigate);
  const lastView = useRef<DemoView | null>(null);
  useEffect(() => { navigate.current = onNavigate; }, [onNavigate]);
  const applyFrame = (time: number, forceNavigation = false) => {
    // A resumed or stepped presentation takes ownership back from manual analysis.
    if (forceNavigation) disposeDemoEventTimers();
    presentDemoFrame(time);
    if (time >= 24 && getDecisionRecord().status === "waiting") updateDecisionRecord(record => record.status === "waiting" && !record.audit.some(item => item.id === "demo-playback-approval") ? { ...record, selected: "B", status: "approved", audit: [...record.audit, { id: "demo-playback-approval", timestamp: new Date().toISOString(), revision: record.revision, action: "approved", plan: "B", message: "自动演示确认样例：展示已查看证据、核对约束后的方案 B 流程。此条不是人工签名，仅存于临时演示内存；未下发设备指令。" }] } : record);
    const stage = currentStage(time);
    if (forceNavigation || lastView.current !== stage.view) { lastView.current = stage.view; navigate.current(stage.view); }
  };
  const apply = useRef(applyFrame);
  useEffect(() => { apply.current = applyFrame; });
  const initialize = (mode: "auto" | "step", play: boolean) => {
    beginEventPresentation(); beginDecisionPresentation(); beginAuditPresentation();
    updateDemoPlayback({ active: true, elapsed: 0, mode, status: play ? "playing" : "paused", interruption: "" });
    apply.current(0, true);
  };
  const exit = () => {
    pauseDemoPlayback(); endEventPresentation(); endDecisionPresentation(); endAuditPresentation(); closeDemoPlayback(); lastView.current = null;
    navigate.current("overview");
  };
  useEffect(() => {
    if (!demo.active || demo.status !== "playing") return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const current = getDemoPlayback();
      if (current.status !== "playing") return;
      const now = performance.now();
      const elapsed = Math.min(25, current.elapsed + Math.min(.5, (now - previous) / 1000)); previous = now;
      updateDemoPlayback({ elapsed, ...(elapsed >= 25 ? { status: "complete" as const } : {}) });
      apply.current(elapsed);
    }, 150);
    return () => window.clearInterval(timer);
  }, [demo.active, demo.status]);
  useEffect(() => {
    const manual = (event: Event) => {
      if ((event.target as HTMLElement)?.closest?.('.demo-playback-controls')) return;
      pauseDemoPlayback("已因手动操作暂停，可继续或退出演示");
    };
    const visibility = () => { if (document.hidden) pauseDemoPlayback("页面离开前台，演示已暂停"); };
    document.addEventListener("pointerdown", manual, true); document.addEventListener("keydown", manual, true); document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("pointerdown", manual, true); document.removeEventListener("keydown", manual, true); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => () => { if (getDemoPlayback().active) { pauseDemoPlayback(); endEventPresentation(); endDecisionPresentation(); endAuditPresentation(); closeDemoPlayback(); } }, []);
  const next = () => {
    pauseDemoPlayback();
    const time = stages.find(stage => stage.time > demo.elapsed + .01)?.time ?? 25;
    updateDemoPlayback({ elapsed: time, mode: "step", status: time >= 25 ? "complete" : "paused", interruption: "" }); apply.current(time, true);
  };
  return <section className={`demo-playback-controls ${demo.active ? "dp-active" : ""}`} aria-label="完整事故流程演示" data-demo-active={demo.active} data-demo-status={demo.status} data-demo-time={demo.elapsed.toFixed(2)}>
    {!demo.active ? <><button className="dp-start" onClick={() => initialize("auto", true)}><span aria-hidden="true">▶</span> 演示一次完整事故流程 <small>25s</small></button><button className="dp-step-entry" onClick={() => initialize("step", false)}>单步演示</button></> : <>
      <div className="dp-status"><span className="dp-demo-label">DEMO MODE</span><strong>{currentStage(demo.elapsed).name}</strong><span>{demo.elapsed.toFixed(0).padStart(2,"0")} / 25s</span></div>
      <div className="dp-progress" role="progressbar" aria-label="完整演示进度" aria-valuemin={0} aria-valuemax={25} aria-valuenow={Number(demo.elapsed.toFixed(1))}><i style={{transform:`scaleX(${demo.elapsed/25})`}}/>{stages.filter(s=>[3,7,15,21,25].includes(s.time)).map(stage=><b key={stage.time} className={demo.elapsed>=stage.time?"done":""} style={{left:`${stage.time/25*100}%`}} title={stage.name}/>)}</div>
      <div className="dp-actions"><button onClick={() => { if (demo.status === "playing") pauseDemoPlayback(); else if (demo.elapsed >= 25) initialize("auto", true); else { updateDemoPlayback({status:"playing",mode:"auto",interruption:""}); apply.current(demo.elapsed,true); } }}>{demo.status === "playing" ? "Ⅱ 暂停演示" : demo.elapsed >=25 ? "↻ 再演示一次" : "▶ 继续演示"}</button><button onClick={next} disabled={demo.elapsed>=25}>下一步</button><button onClick={() => initialize(demo.mode, false)}>重置演示</button><button onClick={exit}>退出演示</button></div>
      <small className="dp-note" role="status">{demo.interruption || (demo.status === "complete" ? "演示完成 · 可打开审计中的事件回放" : "临时演示数据 · 自动确认样例非人工签名 · 退出恢复原记录")}</small>
    </>}
    {demo.active && <span className="sr-only">当前事件 {getDemoEvent().eventId}</span>}
  </section>;
}
