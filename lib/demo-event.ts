"use client";

import { useSyncExternalStore } from "react";
import { DECISION_ID, getDecisionRecord, type PlanId } from "./decision-card";

export type EventPhase = "monitoring" | "alarm" | "analysis" | "comparison" | "human-review" | "archived";
export type WeightKey = "safety" | "economy" | "equipment" | "green";
export type EventWeights = Record<WeightKey, number>;
export type AnalysisAgent = "safety" | "green" | "equipment";
export type AgentStage = "waiting" | "reading" | "retrieving" | "reasoning" | "generating" | "complete";
const waitingAgents: Record<AnalysisAgent, AgentStage> = { safety: "waiting", green: "waiting", equipment: "waiting" };
const completeAgents: Record<AnalysisAgent, AgentStage> = { safety: "complete", green: "complete", equipment: "complete" };
export type DemoEvent = {
  eventId: "Event-021"; equipmentId: "P-201"; parameterId: "P101"; alarmId: "A317";
  pressureDrop: number; similarity: number; riskLevel: "low" | "medium-low";
  regulation: string; recommendedPlan: PlanId; confidence: number; decisionId: string;
  phase: EventPhase; alarmTriggered: boolean; alarmCount: number; triggeredAt: string | null;
  analysisStage: "idle" | "processing" | "results" | "complete";
  alarmStartedAt: number | null; presentationTime: number | null; agentStages: Record<AnalysisAgent, AgentStage>;
  analysisProgress: number; agentResults: AnalysisAgent[]; weights: EventWeights;
};

export const DEFAULT_EVENT_WEIGHTS: EventWeights = { safety: 40, economy: 25, equipment: 20, green: 15 };
export const DEMO_PLAN_METRICS: Record<PlanId, EventWeights> = {
  A: { safety: 95, economy: 74, equipment: 80, green: 77 },
  B: { safety: 98, economy: 89, equipment: 90, green: 92 },
  C: { safety: 100, economy: 60, equipment: 97, green: 63 },
};
export const EVENT_PHASE_LABELS: Record<EventPhase, string> = {
  monitoring: "运行监测", alarm: "异常已识别", analysis: "协同分析中", comparison: "方案比较",
  "human-review": "人工复核", archived: "副本已归档",
};
const INITIAL: DemoEvent = {
  eventId: "Event-021", equipmentId: "P-201", parameterId: "P101", alarmId: "A317",
  pressureDrop: 4.3, similarity: 82, riskLevel: "low", regulation: "OP-12 §4.3",
  recommendedPlan: "B", confidence: 86, decisionId: DECISION_ID, phase: "monitoring",
  alarmTriggered: false, alarmCount: 1, triggeredAt: null, analysisStage: "idle",
  alarmStartedAt: null, presentationTime: null, agentStages: waitingAgents,
  analysisProgress: 0, agentResults: [], weights: DEFAULT_EVENT_WEIGHTS,
};
const KEY = "nuclear-copilot:event-021:v1";
let state = INITIAL;
let loaded = false;
let demoBackup: DemoEvent | null = null;
const listeners = new Set<() => void>();
const timers = new Set<ReturnType<typeof setTimeout>>();
let analysisRun = 0;
let alarmTimer: ReturnType<typeof setTimeout> | null = null;

export function normalizeWeights(weights: EventWeights): EventWeights {
  const safe = Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Number.isFinite(value) ? Math.max(0, value) : 0])) as EventWeights;
  const sum = Object.values(safe).reduce((total, value) => total + value, 0);
  if (sum === 0) return { safety: .25, economy: .25, equipment: .25, green: .25 };
  return Object.fromEntries(Object.entries(safe).map(([key, value]) => [key, value / sum])) as EventWeights;
}
export function getPlanScores(weights: EventWeights): { plan: PlanId; score: number }[] {
  const normalized = normalizeWeights(weights);
  return (["A", "B", "C"] as PlanId[]).map(plan => ({ plan, score: Number((Object.keys(normalized) as WeightKey[]).reduce((total, key) => total + DEMO_PLAN_METRICS[plan][key] * normalized[key], 0).toFixed(2)) }));
}
function recommendation(weights: EventWeights): PlanId {
  return [...getPlanScores(weights)].sort((a, b) => b.score - a.score || (a.plan === "B" ? -1 : 1))[0].plan;
}
function read(): DemoEvent {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const decision = getDecisionRecord();
      const approvedReview = decision.status === "approved" ? [...decision.audit].reverse().find(item => item.action === "approved" && item.revision === decision.revision)?.humanReview : undefined;
      const raw = window.sessionStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DemoEvent>;
        const weights = approvedReview?.weights ?? (saved.weights && Object.keys(DEFAULT_EVENT_WEIGHTS).every(key => typeof saved.weights?.[key as WeightKey] === "number" && Number.isFinite(saved.weights[key as WeightKey])) ? saved.weights : DEFAULT_EVENT_WEIGHTS);
        const alarmTriggered = saved.alarmTriggered === true;
        const complete = alarmTriggered && saved.analysisStage === "complete";
        state = { ...INITIAL, weights, recommendedPlan: recommendation(weights), alarmTriggered, alarmCount: alarmTriggered ? 2 : 1,
          triggeredAt: typeof saved.triggeredAt === "string" ? saved.triggeredAt : null,
          alarmStartedAt: typeof saved.alarmStartedAt === "number" ? saved.alarmStartedAt : alarmTriggered ? 0 : null, presentationTime: null, agentStages: complete ? completeAgents : waitingAgents,
          analysisStage: complete ? "complete" : "idle", analysisProgress: complete ? 100 : 0,
          agentResults: complete ? ["safety", "green", "equipment"] : [], riskLevel: complete ? "medium-low" : "low",
          phase: saved.phase === "archived" || saved.phase === "human-review" ? saved.phase : complete ? "comparison" : alarmTriggered ? "alarm" : "monitoring" };
      } else if (decision.audit.length) {
        const weights = approvedReview?.weights ?? DEFAULT_EVENT_WEIGHTS;
        state = { ...INITIAL, weights, recommendedPlan: recommendation(weights), alarmStartedAt: 0, agentStages: completeAgents, alarmTriggered: true, alarmCount: 2, analysisStage: "complete", analysisProgress: 100, agentResults: ["safety", "green", "equipment"], riskLevel: "medium-low", phase: decision.status === "waiting" ? "comparison" : "human-review" };
      }
    } catch { /* This demo also works for the current session without browser storage. */ }
  }
  return state;
}
function publish(patch: Partial<DemoEvent>) {
  state = { ...read(), ...patch };
  try { if (!demoBackup) window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Session-only fallback. */ }
  listeners.forEach(notify => notify());
}
function subscribe(notify: () => void) { listeners.add(notify); return () => { listeners.delete(notify); }; }
export function useDemoEvent(): DemoEvent { return useSyncExternalStore(subscribe, read, () => INITIAL); }
export function getDemoEvent(): DemoEvent { return read(); }
export function triggerDemoAlarm() {
  if (read().alarmTriggered) return;
  publish({ alarmTriggered: true, alarmCount: 1, phase: "alarm", alarmStartedAt: Date.now(), presentationTime: null, triggeredAt: new Date().toISOString() });
  if (alarmTimer) clearTimeout(alarmTimer);
  alarmTimer = setTimeout(() => { alarmTimer = null; publish({ alarmCount: 2 }); }, 600);
}
export function setDemoEventPhase(phase: EventPhase) { publish({ phase }); }
export function updateEventWeight(key: WeightKey, value: number) {
  if (!Number.isFinite(value)) return;
  const weights = { ...read().weights, [key]: Math.min(100, Math.max(0, value)) };
  publish({ weights, recommendedPlan: recommendation(weights) });
}
export function cancelCollaborativeAnalysis() {
  analysisRun += 1;
  timers.forEach(clearTimeout); timers.clear();
  if (["processing", "results"].includes(read().analysisStage)) publish({ analysisStage: "idle", analysisProgress: 0, agentResults: [], agentStages: waitingAgents, phase: read().phase === "analysis" ? "alarm" : read().phase });
}
export function startCollaborativeAnalysis() {
  if (["processing", "results"].includes(read().analysisStage)) return;
  cancelCollaborativeAnalysis(); triggerDemoAlarm();
  const run = analysisRun;
  publish({ phase: "analysis", analysisStage: "processing", analysisProgress: 0, agentResults: [], agentStages: waitingAgents, riskLevel: "low" });
  const schedule = (delay: number, action: () => void) => {
    const timer = setTimeout(() => { timers.delete(timer); if (run === analysisRun) action(); }, delay);
    timers.add(timer);
  };
  for (let step = 1; step <= 10; step++) schedule(step * 220, () => publish({ analysisProgress: Math.min(78, step * 8) }));
  (["safety", "green", "equipment"] as AnalysisAgent[]).forEach((agent, index) => {
    (["reading", "retrieving", "reasoning", "generating", "complete"] as AgentStage[]).forEach((stage, phaseIndex) => schedule(phaseIndex * 550 + index * 120, () => {
      publish({ agentStages: { ...read().agentStages, [agent]: stage }, ...(stage === "complete" ? { analysisStage: "results" as const, analysisProgress: 84 + index * 5, agentResults: [...read().agentResults, agent] } : {}) });
    }));
  });
  schedule(3100, () => publish({ analysisStage: "complete", phase: read().phase === "analysis" ? "comparison" : read().phase, analysisProgress: 100, riskLevel: "medium-low", alarmCount: 2 }));
}

export function disposeDemoEventTimers() {
  cancelCollaborativeAnalysis();
  if (alarmTimer) { clearTimeout(alarmTimer); alarmTimer = null; }
}

export function beginEventPresentation() {
  if (!demoBackup) demoBackup = { ...read(), alarmCount: read().alarmTriggered ? 2 : 1 };
  disposeDemoEventTimers();
  state = { ...INITIAL, agentStages: { ...waitingAgents }, weights: { ...DEFAULT_EVENT_WEIGHTS } }; loaded = true;
  listeners.forEach(notify => notify());
}
export function endEventPresentation() {
  if (!demoBackup) return;
  disposeDemoEventTimers(); state = demoBackup; demoBackup = null;
  // An interrupted analysis has no active timer after leaving the presentation.
  if (["processing", "results"].includes(state.analysisStage)) state = { ...state, analysisStage: "idle", agentStages: waitingAgents, analysisProgress: 0, agentResults: [], phase: "alarm" };
  listeners.forEach(notify => notify());
}
/** Time is owned by the playback controller, not by visual animation callbacks. */
export function presentDemoFrame(elapsed: number) {
  const current = read();
  const alarm = elapsed >= 3;
  const complete = elapsed >= 13.5;
  const stages = Object.fromEntries((["safety", "green", "equipment"] as AnalysisAgent[]).map((agent, index) => {
    const since = elapsed - (7 + index * 2);
    const stage: AgentStage = since < 0 ? "waiting" : since >= 1.8 ? "complete" : (["reading", "retrieving", "reasoning", "generating"] as AgentStage[])[Math.min(3, Math.floor(since / .45))];
    return [agent, stage];
  })) as Record<AnalysisAgent, AgentStage>;
  publish({ alarmTriggered: alarm, alarmCount: elapsed >= 5 ? 2 : 1,
    alarmStartedAt: alarm ? current.alarmStartedAt ?? Date.now() : null, presentationTime: alarm ? elapsed - 3 : 0,
    triggeredAt: alarm ? current.triggeredAt ?? new Date().toISOString() : null,
    phase: elapsed >= 21 ? "human-review" : elapsed >= 15 ? "comparison" : elapsed >= 7 ? "analysis" : alarm ? "alarm" : "monitoring",
    agentStages: stages, agentResults: (["safety", "green", "equipment"] as AnalysisAgent[]).filter(agent => stages[agent] === "complete"),
    analysisStage: complete ? "complete" : elapsed >= 7 ? "processing" : "idle", analysisProgress: Math.min(100, Math.max(0, (elapsed - 7) / 6.5 * 100)), riskLevel: complete ? "medium-low" : "low" });
}

export function getEventPressure(seconds: number): number {
  return 4.5 * (1 - .043 * Math.min(1, Math.max(0, seconds / 180)));
}
export function getReplayFrame(seconds: number) {
  const time = Math.min(180, Math.max(0, seconds));
  const pressureTime = Math.max(0, (time - 30) / 150 * 180);
  return {
    time, pressure: getEventPressure(pressureTime), drop: 4.3 * pressureTime / 180,
    alarm: time >= 60 ? "A317 · 已触发" : "A317 · 未触发",
    risk: time >= 120 ? "中低风险" : "低风险",
    agents: time < 90 ? "等待分析" : time < 120 ? "三智能体协同分析" : "协同分析完成",
    plan: time >= 120 ? "B · 调整策略并安排核查" : "待生成",
    phase: time < 30 ? "参数监测" : time < 60 ? "压力下降" : time < 90 ? "报警识别" : time < 120 ? "智能分析" : time < 180 ? "方案比较" : "人工复核节点",
  };
}
