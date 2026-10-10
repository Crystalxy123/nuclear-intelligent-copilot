"use client";

import { useSyncExternalStore } from "react";

export type PlanId = "A" | "B" | "C";
export type ReviewStatus = "waiting" | "approved" | "rejected";
export type PlanAdjustment = { note: string; reviewWindow: string; monitorInterval: string };
export type HumanReviewRecord = { reason: string; evidenceReviewed: true; constraintsReviewed: true; confidence: number; recommendedPlan: PlanId; weights: { safety: number; economy: number; equipment: number; green: number } };
export type DecisionAudit = { id: string; timestamp: string; action: "approved" | "rejected" | "modified"; plan: PlanId; message: string; revision: number; humanReview?: HumanReviewRecord };
export type DecisionRecord = { version: 1; selected: PlanId; status: ReviewStatus; revision: number; adjustments: Partial<Record<PlanId, PlanAdjustment>>; audit: DecisionAudit[] };
export const DECISION_ID = "DC-2026-00821";
export const DECISION_PLANS = [
  { id: "A" as const, icon: "settings", title: "继续运行，加强监测", description: "维持当前工况，将监测频率提高至每 30 秒一次。", safety: 95, efficiency: 82, risk: "中低", energy: "0.0%", renewable: "+0 MWh", benefit: "+¥ 0.0 万/日", rationale: "保持运行参数，优先补齐设备核查记录。未安排节能调整与储能消纳，预估增量收益为零。" },
  { id: "B" as const, icon: "target", title: "调整策略并安排核查", description: "优化循环水泵流量，2 小时内完成 P-201 设备核查。", safety: 98, efficiency: 91, risk: "低", energy: "−3.4%", renewable: "+18 MWh", benefit: "+¥ 4.8 万/日", rationale: "在既定安全约束下优化辅机组合，安排设备核查，并采用 6 MW × 3 小时的储能消纳窗口。" },
  { id: "C" as const, icon: "shield", title: "进入保守运行模式", description: "切换备用机组，提高设备冗余，保留更多运行裕度。", safety: 100, efficiency: 68, risk: "低", energy: "−0.8%", renewable: "+0 MWh", benefit: "+¥ 1.3 万/日", rationale: "优先保障设备冗余，仅进行保守辅机调整。保留有限节能收益，不安排额外储能充电。" },
];

export const DECISION_EVIDENCE = [
  { id: "pressure", number: "01", category: "实时参数", title: "P101 - 压力趋势", icon: "trend", tone: "cyan", source: "P101 · 本地仿真测点快照", summary: "P-201 出口压力在 180 秒观察窗口内下降 4.3%，下降趋势需要持续关注。", items: [["压力趋势", "相对窗口起点 100%，当前为 95.7%"]] },
  { id: "alarms", number: "02", category: "设备状态", title: "A317 / A320 / A322", icon: "pulse", tone: "amber", source: "报警归并 · 本地场景记录", summary: "三条报警关联同一主泵，合并为一个待核查事件。报警关联不等于已经确定故障根因。", items: [["A317", "主泵振动异常 · 与压力趋势关联"], ["A320", "压力下降速率异常"], ["A322", "泵组效率偏移"]] },
  { id: "procedure", number: "03", category: "规程依据", title: "OP-12 § 4.3", icon: "document", tone: "purple", source: "OP-12 § 4.3 · 仿真训练摘要", summary: "当前页面展示本地核查流程摘要，用于演示证据与建议的关联。", items: [["01 · 测点复核", "核对压力测点与趋势记录"], ["02 · 设备核查", "检查主泵振动及出口阀门反馈"], ["03 · 持续监测", "跟踪压力、流量和温度变化"], ["04 · 人工审核", "运行调整建议由值长复核"]] },
  { id: "history", number: "04", category: "事件记录", title: "Event #021", icon: "document", tone: "cyan", source: "Event #021 · 本地历史场景", summary: "历史场景呈现主泵压力缓慢下降，推荐复核泵效率和阀门反馈。相似度用于检索参考，不代表根因已确认。", items: [["历史模式相似度", "82% · 结合当前设备记录进行复核"]] },
  { id: "model", number: "05", category: "模型分析", title: "Boundary Model v2.8", icon: "network", tone: "cyan", source: "Boundary Model v2.8 · 本地场景评估摘要", summary: "当前决策卡使用仿真场景中的安全评估摘要；建议与结果均为演示预设，确认操作不会下发设备指令。", items: [["风险等级", "中低风险"], ["安全边界", "当前场景未触及边界"], ["安全裕度", "充足，建议持续监测"]] },
];
export const EVIDENCE_COUNT = DECISION_EVIDENCE.reduce((sum, item) => sum + item.items.length, 0);

const INITIAL_RECORD: DecisionRecord = { version: 1, selected: "B", status: "waiting", revision: 1, adjustments: {}, audit: [] };
const STORAGE_KEY = "nuclear-copilot:decision-card:DC-2026-00821:v1";
let cache = INITIAL_RECORD;
let loaded = false;
let demoBackup: DecisionRecord | null = null;
const listeners = new Set<() => void>();
const planIds: string[] = ["A", "B", "C"];
function readSavedRecord(value: string | null): DecisionRecord {
  if (!value) return INITIAL_RECORD;
  try {
    const parsed = JSON.parse(value) as DecisionRecord;
    if (parsed.version !== 1 || !planIds.includes(parsed.selected) || !["waiting", "approved", "rejected"].includes(parsed.status) || !Number.isInteger(parsed.revision) || parsed.revision < 1 || !parsed.adjustments || !Array.isArray(parsed.audit)) return INITIAL_RECORD;
    for (const [plan, draft] of Object.entries(parsed.adjustments)) {
      if (!planIds.includes(plan) || !draft || typeof draft.note !== "string" || typeof draft.reviewWindow !== "string" || typeof draft.monitorInterval !== "string") return INITIAL_RECORD;
    }
    if (parsed.audit.some(item => !item || typeof item.id !== "string" || typeof item.timestamp !== "string" || Number.isNaN(Date.parse(item.timestamp)) || !planIds.includes(item.plan) || !["approved", "rejected", "modified"].includes(item.action) || typeof item.message !== "string")) return INITIAL_RECORD;
    if (parsed.audit.some(item => item.humanReview && (typeof item.humanReview.reason !== "string" || item.humanReview.reason.trim().length < 8 || item.humanReview.evidenceReviewed !== true || item.humanReview.constraintsReviewed !== true || !Number.isFinite(item.humanReview.confidence) || !planIds.includes(item.humanReview.recommendedPlan) || !item.humanReview.weights || ["safety", "economy", "equipment", "green"].some(key => typeof item.humanReview!.weights[key as keyof HumanReviewRecord["weights"]] !== "number" || !Number.isFinite(item.humanReview!.weights[key as keyof HumanReviewRecord["weights"]]))))) return INITIAL_RECORD;
    return parsed;
  } catch { return INITIAL_RECORD; }
}
function getSnapshot() {
  if (!loaded && typeof window !== "undefined") {
    try { cache = readSavedRecord(window.localStorage.getItem(STORAGE_KEY)); } catch { cache = INITIAL_RECORD; }
    loaded = true;
  }
  return cache;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (demoBackup) return;
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cache = readSavedRecord(event.key === null ? null : event.newValue); loaded = true;
    listeners.forEach(notify => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
export function updateDecisionRecord(update: (current: DecisionRecord) => DecisionRecord) {
  cache = update(getSnapshot()); loaded = true;
  try { if (!demoBackup) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch { /* The in-memory review stays available if storage is unavailable. */ }
  listeners.forEach(notify => notify());
}
export function useDecisionRecord() {
  return useSyncExternalStore(subscribe, getSnapshot, () => INITIAL_RECORD);
}
export function getDecisionRecord(): DecisionRecord {
  return getSnapshot();
}

/** Automated presentations use an isolated in-memory record, preserving user reviews. */
export function beginDecisionPresentation() {
  if (!demoBackup) demoBackup = getSnapshot();
  cache = { ...INITIAL_RECORD, adjustments: {}, audit: [] }; loaded = true;
  listeners.forEach(notify => notify());
}
export function endDecisionPresentation() {
  if (!demoBackup) return;
  cache = demoBackup; demoBackup = null;
  try { cache = readSavedRecord(window.localStorage.getItem(STORAGE_KEY)); } catch { /* Restore captured record. */ }
  listeners.forEach(notify => notify());
}
