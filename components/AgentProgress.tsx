"use client";

import { useState } from "react";
import { useDemoEvent } from "@/lib/demo-event";
import "@/app/workbench-interaction.css";
import "@/app/motion-agents-enhanced.css";

const agents = [
  { id: "safety", name: "安全运行智能体", short: "安全", icon: "◈", result: "安全边界未越限", steps: ["读取运行数据", "检索 OP-12", "检查安全边界", "生成风险判断"] },
  { id: "green", name: "绿色增效智能体", short: "绿色", icon: "◇", result: "保持负荷，评估增效", steps: ["读取功率曲线", "检索调度约束", "比较能耗收益", "生成增效建议"] },
  { id: "equipment", name: "设备智能体", short: "设备", icon: "⌁", result: "建议核查 P-201", steps: ["读取 P-201 测点", "检索相似事件", "核对振动与阀位", "生成设备结论"] },
] as const;
const stages = ["reading", "retrieving", "reasoning", "generating"];

export default function AgentProgress() {
  const event = useDemoEvent();
  const [alreadyComplete] = useState(() => event.analysisStage === "complete");
  const busy = event.analysisStage === "processing" || event.analysisStage === "results";
  const complete = event.analysisStage === "complete";
  return <div className="ap-collaboration" data-complete={complete} data-restored={alreadyComplete}>
    <div className="ap-agents" aria-label="三个智能体的分析进度" aria-busy={busy}>
      {agents.map(agent => {
        const stage = event.agentStages?.[agent.id] ?? (event.agentResults.includes(agent.id) ? "complete" : busy ? "reading" : "waiting");
        const done = stage === "complete";
        const stageIndex = stages.indexOf(stage);
        const active = stage !== "waiting" && !done;
        const progress = done ? 100 : stageIndex < 0 ? 0 : (stageIndex + 1) * 22;
        return <section key={agent.id} className={`ap-agent ap-${agent.id} ${done ? "ap-result" : ""}`} data-stage={stage} data-active={active} aria-label={`${agent.name}：${done ? "完成" : stageIndex < 0 ? "等待" : agent.steps[stageIndex]}`}>
          <span className="ap-icon" aria-hidden="true">{done ? <span className="ap-check">✓</span> : agent.icon}</span>
          <div><header><strong>{agent.name}</strong><span>{done ? "完成" : active ? `${stageIndex + 1}/4` : "等待"}</span></header>
            <p className="ap-stage-copy" key={stage}>{done ? agent.result : stageIndex < 0 ? "等待事件数据" : `${agent.steps[stageIndex]}…`}</p>
            <div className="ap-track" role="progressbar" aria-label={`${agent.name}分析进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></div>
          </div>
        </section>;
      })}
      <span className="sr-only" role="status">{complete ? "三个智能体分析完成，协同判断为中低风险" : busy ? "正在进行协同分析" : "等待协同分析"}</span>
    </div>
    <div className="ap-convergence" aria-label="三智能体协同汇聚">
      <svg viewBox="0 0 120 216" preserveAspectRatio="none" aria-hidden="true">
        {["M0 34H15Q30 34 30 64V88Q30 108 48 108H56", "M0 108H56", "M0 182H15Q30 182 30 154V128Q30 108 48 108H56"].map((d, index) => <g key={d}><path d={d} className="ap-link-base"/><path d={d} pathLength="100" className="ap-result-link" data-connected={event.agentResults.includes(agents[index].id)}/></g>)}
      </svg>
      <div className="ap-hub" role="status"><span>{complete ? "✓" : "◈"}</span><small>协同汇聚</small><strong>{complete ? "中低风险" : busy ? "研判中" : "待分析"}</strong><em>{complete ? "进入 OP-12 §4.3" : `${event.agentResults.length} / 3 已完成`}</em></div>
    </div>
  </div>;
}
