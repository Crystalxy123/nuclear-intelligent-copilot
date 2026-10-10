"use client";

import { useSyncExternalStore } from "react";
import { DECISION_ID, DECISION_PLANS, DECISION_EVIDENCE, type DecisionRecord, type PlanId, type ReviewStatus } from "./decision-card";

export type AuditNodeId = "raw" | "event" | "analysis" | "procedure" | "risk" | "plans" | "review" | "result";
export type AuditNode = {
  id: AuditNodeId;
  index: number;
  title: string;
  icon: string;
  status: "complete" | "pending" | "rejected" | "unverified";
  statusLabel: string;
  summary: string;
  timestamp: string;
  actor: string;
  source: string;
  rows: [string, string][];
  evidenceIds: string[];
  payload: Record<string, unknown>;
};
export type AuditAccessLog = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  kind: "demo" | "local";
  revision?: number;
  decisionStatus?: ReviewStatus;
  contextKey?: string;
};
export type AuditReviewRequest = {
  id: string;
  timestamp: string;
  revision: number;
  decisionStatus: ReviewStatus;
  selectedPlan: PlanId;
  note: string;
  status: "recorded";
  scope: "local";
  decision: DecisionRecord;
};
export type AuditPayload = {
  schemaVersion: 1;
  mode: "local-demo";
  decisionId: string;
  decision: DecisionRecord;
  nodes: AuditNode[];
  evidence: typeof DECISION_EVIDENCE;
  execution: { connected: false; issued: false; verified: false };
  integrityNotice: string;
};
export type AuditArchive = {
  id: string;
  timestamp: string;
  revision: number;
  decisionStatus: ReviewStatus;
  selectedPlan: PlanId;
  hash: string;
  algorithm: "SHA-256";
  payload: AuditPayload;
};
export type AuditRecords = {
  version: 1;
  logs: AuditAccessLog[];
  reviewRequests: AuditReviewRequest[];
  archives: AuditArchive[];
  storageWarning: string | null;
};
export type AuditSnapshot = {
  decisionId: string;
  revision: number;
  decisionStatus: ReviewStatus;
  selectedPlan: PlanId;
  nodes: AuditNode[];
  evidence: typeof DECISION_EVIDENCE;
  logs: AuditAccessLog[];
  reviewRequests: AuditReviewRequest[];
  archives: AuditArchive[];
  currentArchive: AuditArchive | null;
  payload: AuditPayload;
  storageWarning: string | null;
};

const STORAGE_KEY = `nuclear-copilot:evidence-audit:${DECISION_ID}:v1`;
const GENERATED_AT = "2026-10-04T18:28:16+08:00";
const MAX_ACCESS_LOGS = 200;
const DEDUPE_WINDOW_MS = 15_000;
export const AUDIT_INTEGRITY_NOTICE = "使用当前浏览器 Web Crypto 计算 SHA-256 内容摘要，用于本地副本一致性校验；未接入机构数字证书、真实 PKI 或外部可信时间戳服务。";

const DEMO_LOGS: AuditAccessLog[] = [
  { id: "demo-access-01", timestamp: "2026-10-04T18:23:10+08:00", actor: "仿真采集器（演示）", action: "汇集场景记录", target: "原始数据与报警", kind: "demo" },
  { id: "demo-access-02", timestamp: "2026-10-04T18:26:20+08:00", actor: "智能分析器（演示）", action: "关联证据摘要", target: "OP-12 / Event #021", kind: "demo" },
  { id: "demo-access-03", timestamp: GENERATED_AT, actor: "决策生成器（演示）", action: "生成候选方案", target: DECISION_ID, kind: "demo" },
];
const INITIAL_RECORDS: AuditRecords = { version: 1, logs: DEMO_LOGS, reviewRequests: [], archives: [], storageWarning: null };
let cached = INITIAL_RECORDS;
let loaded = false;
let demoBackup: AuditRecords | null = null;
let scopeGeneration = 0;

/** Async audit work may only finish in the presentation/storage scope where it began. */
export function getAuditScopeGeneration(): number { return scopeGeneration; }
export function isAuditScopeCurrent(generation: number): boolean { return generation === scopeGeneration; }
const listeners = new Set<() => void>();

function cloneJson<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

/** Stable JSON with sorted object keys; arrays retain their semantic order. */
export function canonicalAuditJson(value: unknown): string {
  const ancestors = new Set<object>();
  const normalize = (item: unknown): unknown => {
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object" || item === null) throw new TypeError("摘要内容必须为有效 JSON，不能包含非有限数值或函数。");
    if (ancestors.has(item)) throw new TypeError("摘要内容不能包含循环引用。");
    ancestors.add(item);
    const result = Array.isArray(item)
      ? item.map(value => value === undefined ? null : normalize(value))
      : Object.fromEntries(Object.keys(item).sort().filter(key => (item as Record<string, unknown>)[key] !== undefined).map(key => [key, normalize((item as Record<string, unknown>)[key])]));
    ancestors.delete(item);
    return result;
  };
  return JSON.stringify(normalize(value));
}

export async function hashAuditJson(value: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("当前浏览器无法使用 Web Crypto，请在 localhost 或 HTTPS 页面进行摘要校验。");
  const bytes = new TextEncoder().encode(canonicalAuditJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyAuditHash(value: unknown, expectedHash: string): Promise<boolean> {
  if (!/^[a-f\d]{64}$/i.test(expectedHash)) return false;
  return (await hashAuditJson(value)) === expectedHash.toLowerCase();
}

function createNodes(decision: DecisionRecord): AuditNode[] {
  const plan = DECISION_PLANS.find(item => item.id === decision.selected)!;
  const adjustment = decision.adjustments[decision.selected];
  const lastAudit = decision.audit.at(-1);
  const reviewTimestamp = lastAudit?.timestamp ?? GENERATED_AT;
  const selection = `方案 ${decision.selected} · ${plan.title}`;
  const statusText = decision.status === "approved" ? "已人工确认 · 待执行验证" : decision.status === "rejected" ? "已驳回 · 待修订" : "待人工确认";
  const definitions: Omit<AuditNode, "index" | "payload">[] = [
    { id: "raw", title: "原始数据", icon: "database", status: "complete", statusLabel: "场景数据已汇集", summary: "汇集 P101 压力趋势与三条关联报警，保留测点与采样窗口口径。", timestamp: "2026-10-04T18:21:00+08:00", actor: "本地仿真采集器", source: "P101 / A317 / A320 / A322 · 演示记录", rows: [["观察窗口", "180 秒"], ["压力变化", "相对窗口起点下降 4.3%"], ["归一化压力", "100.0% → 95.7%"], ["数据性质", "本地场景预设，并非实时生产测点"]], evidenceIds: ["pressure", "alarms"] },
    { id: "event", title: "事件识别", icon: "alert", status: "complete", statusLabel: "已形成待核查事件", summary: "将 A317、A320、A322 归并为主泵 P-201 出口压力趋势事件，尚未确认故障根因。", timestamp: "2026-10-04T18:23:00+08:00", actor: "报警归并演示", source: "关联报警与设备场景记录", rows: [["关联设备", "主泵 P-201"], ["报警数量", "3 条"], ["归并结果", "1 项待核查事件"], ["根因结论", "尚待核查"]], evidenceIds: ["alarms", "pressure"] },
    { id: "analysis", title: "智能分析", icon: "network", status: "complete", statusLabel: "演示分析已形成", summary: "关联压力变化、设备核查信息与 Event #021，形成需要进一步验证的分析线索。", timestamp: "2026-10-04T18:24:00+08:00", actor: "专业智能体演示", source: "Event #021 / Boundary Model v2.8", rows: [["历史场景相似度", "82% · 检索参考"], ["核查线索", "泵效率与出口阀门反馈"], ["模型性质", "本地预设摘要，非工程验证结果"]], evidenceIds: ["history", "model", "pressure"] },
    { id: "procedure", title: "规程约束", icon: "document", status: "complete", statusLabel: "约束摘要已关联", summary: "关联 OP-12 § 4.3 的测点复核、设备核查、持续监测与人工审核流程摘要。", timestamp: "2026-10-04T18:25:00+08:00", actor: "规程摘要演示", source: "OP-12 § 4.3 · 仿真训练摘要", rows: [["流程依据", "OP-12 § 4.3"], ["核查内容", "测点、振动与阀门反馈"], ["决策要求", "运行调整需人工复核"], ["资料性质", "本地演示摘要，非受控生产规程"]], evidenceIds: ["procedure"] },
    { id: "risk", title: "风险判断", icon: "shield", status: "complete", statusLabel: "风险摘要已形成", summary: "当前局部事件采用中低风险演示判断；安全边界稳定与裕度充足均为场景预设。", timestamp: "2026-10-04T18:25:30+08:00", actor: "安全边界评估演示", source: "Boundary Model v2.8 · 本地摘要", rows: [["事件风险", "中低风险"], ["场景安全边界", "未触及边界"], ["场景安全裕度", "充足，建议持续监测"], ["适用范围", "演示判断，不能代替真实安全评估"]], evidenceIds: ["model", "procedure"] },
    { id: "plans", title: "候选方案", icon: "layers", status: "complete", statusLabel: adjustment ? "人工修改建议已保存" : "候选方案已生成", summary: adjustment ? `当前选择${selection}；已保存人工修改，修改后的预期结果待复核。` : `A / B / C 三种候选方案已生成，当前选择${selection}。`, timestamp: reviewTimestamp, actor: adjustment ? "当前浏览器人工修改" : "统一决策卡演示", source: `${DECISION_ID} · 修订 ${decision.revision}`, rows: [["当前选择", selection], ["建议内容", adjustment?.note ?? plan.description], ["核查时限", adjustment?.reviewWindow ?? "以候选方案内容为准"], ["监测间隔", adjustment?.monitorInterval ?? "以候选方案内容为准"], ["预期结果", adjustment ? "修改后待重新评估" : `${plan.energy} 辅机能耗 / ${plan.renewable} 消纳 / ${plan.benefit}`]], evidenceIds: ["pressure", "procedure", "model"] },
    { id: "review", title: "人工复核", icon: "user", status: decision.status === "waiting" ? "pending" : decision.status === "rejected" ? "rejected" : "complete", statusLabel: statusText, summary: decision.status === "approved" ? "当前修订已在本地记录人工确认；确认结果尚未下发设备操作。" : decision.status === "rejected" ? "当前修订已被驳回，保留审核记录，需修订后再次提交确认。" : "当前修订正在等待人工确认；此前版本的审核记录仍可追溯。", timestamp: reviewTimestamp, actor: decision.status === "waiting" ? "待值长复核" : "林岳 · 当前浏览器操作", source: "本地决策审核记录", rows: [["审核状态", statusText], ["当前修订", String(decision.revision)], ["当前方案", selection], ["最近记录", lastAudit?.message ?? "暂无人工审核记录"], ["历史记录数", String(decision.audit.length)]], evidenceIds: ["procedure", "model"] },
    { id: "result", title: "结果确认", icon: "check", status: decision.status === "approved" ? "unverified" : "pending", statusLabel: decision.status === "approved" ? "待执行验证" : decision.status === "rejected" ? "等待修订后重审" : "等待人工确认", summary: "本演示尚未连接设备执行系统，也未获得执行回执与效果验证；归档仅保存证据副本。", timestamp: reviewTimestamp, actor: "本地演示 · 无执行回执", source: "结果状态占位记录", rows: [["设备指令", "未下发"], ["执行回执", "未接入"], ["效果验证", "尚未验证"], ["归档作用", "保存本地证据副本，不执行设备操作"]], evidenceIds: [] },
  ];
  return definitions.map((node, index) => ({ ...node, index: index + 1, payload: { schemaVersion: 1, mode: "local-demo", decisionId: DECISION_ID, nodeId: node.id, title: node.title, status: node.status, statusLabel: node.statusLabel, summary: node.summary, timestamp: node.timestamp, actor: node.actor, source: node.source, metadata: Object.fromEntries(node.rows), evidenceIds: [...node.evidenceIds], ...(["plans", "review", "result"].includes(node.id) ? { decision: cloneJson(decision) } : {}) } }));
}

export function createAuditPayload(decision: DecisionRecord): AuditPayload {
  return { schemaVersion: 1, mode: "local-demo", decisionId: DECISION_ID, decision: cloneJson(decision), nodes: createNodes(decision), evidence: cloneJson(DECISION_EVIDENCE), execution: { connected: false, issued: false, verified: false }, integrityNotice: AUDIT_INTEGRITY_NOTICE };
}

export function getAuditSnapshot(decision: DecisionRecord, records: AuditRecords = getAuditRecords()): AuditSnapshot {
  const payload = createAuditPayload(decision);
  const currentJson = canonicalAuditJson(payload);
  const currentArchive = [...records.archives].reverse().find(item => canonicalAuditJson(item.payload) === currentJson) ?? null;
  return { decisionId: DECISION_ID, revision: decision.revision, decisionStatus: decision.status, selectedPlan: decision.selected, nodes: payload.nodes, evidence: payload.evidence, logs: records.logs, reviewRequests: records.reviewRequests, archives: records.archives, currentArchive, payload, storageWarning: records.storageWarning };
}

function isObject(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function hasTime(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function isDecision(value: unknown): value is DecisionRecord {
  if (!isObject(value) || value.version !== 1 || !Number.isInteger(value.revision) || Number(value.revision) < 1 || !["A", "B", "C"].includes(String(value.selected)) || !["waiting", "approved", "rejected"].includes(String(value.status)) || !isObject(value.adjustments) || !Array.isArray(value.audit)) return false;
  if (!Object.entries(value.adjustments).every(([id, item]) => ["A", "B", "C"].includes(id) && isObject(item) && ["note", "reviewWindow", "monitorInterval"].every(key => typeof item[key] === "string"))) return false;
  return value.audit.every(item => isObject(item) && typeof item.id === "string" && hasTime(item.timestamp) && ["approved", "rejected", "modified"].includes(String(item.action)) && ["A", "B", "C"].includes(String(item.plan)) && typeof item.message === "string");
}
function parseRecords(raw: string | null): AuditRecords {
  if (!raw) return INITIAL_RECORDS;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isObject(value) || value.version !== 1 || !Array.isArray(value.logs) || !Array.isArray(value.reviewRequests) || !Array.isArray(value.archives)) return INITIAL_RECORDS;
    const logs = value.logs.filter(item => isObject(item) && typeof item.id === "string" && hasTime(item.timestamp) && ["actor", "action", "target"].every(key => typeof item[key] === "string") && ["demo", "local"].includes(String(item.kind))) as AuditAccessLog[];
    const reviewRequests = value.reviewRequests.filter(item => isObject(item) && typeof item.id === "string" && hasTime(item.timestamp) && typeof item.note === "string" && item.status === "recorded" && item.scope === "local" && isDecision(item.decision) && item.revision === item.decision.revision && item.decisionStatus === item.decision.status && item.selectedPlan === item.decision.selected) as AuditReviewRequest[];
    const archives = value.archives.filter(item => isObject(item) && typeof item.id === "string" && hasTime(item.timestamp) && typeof item.hash === "string" && /^[a-f\d]{64}$/i.test(item.hash) && item.algorithm === "SHA-256" && isObject(item.payload) && item.payload.schemaVersion === 1 && item.payload.mode === "local-demo" && item.payload.decisionId === DECISION_ID && isDecision(item.payload.decision) && Array.isArray(item.payload.nodes) && Array.isArray(item.payload.evidence) && item.revision === item.payload.decision.revision && item.decisionStatus === item.payload.decision.status && item.selectedPlan === item.payload.decision.selected) as AuditArchive[];
    return { version: 1, logs: logs.slice(-MAX_ACCESS_LOGS), reviewRequests, archives, storageWarning: null };
  } catch { return INITIAL_RECORDS; }
}

export function getAuditRecords(): AuditRecords {
  if (!loaded && typeof window !== "undefined") {
    try { cached = parseRecords(window.localStorage.getItem(STORAGE_KEY)); }
    catch { cached = { ...INITIAL_RECORDS, storageWarning: "浏览器本地存储不可用；当前访问日志仅保留在本次页面会话。" }; }
    loaded = true;
  }
  return cached;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (demoBackup) return;
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cached = parseRecords(event.key === null ? null : event.newValue);
    loaded = true;
    listeners.forEach(notify => notify());
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
export function useAuditRecords(): AuditRecords { return useSyncExternalStore(subscribe, getAuditRecords, () => INITIAL_RECORDS); }

function updateRecords(update: (current: AuditRecords) => AuditRecords, requirePersistence = false): AuditRecords {
  let latest = getAuditRecords();
  // Read before writes so a previous tab's completed write is not overwritten.
  if (!demoBackup && !latest.storageWarning) {
    try { latest = parseRecords(window.localStorage.getItem(STORAGE_KEY)); } catch { /* Persistence is checked below. */ }
  }
  const next: AuditRecords = { ...update(latest), storageWarning: null };
  try { if (!demoBackup) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch {
    if (requirePersistence) throw new Error("无法保存本地审计记录，请检查浏览器存储权限或剩余空间。此次操作尚未保存。");
    next.storageWarning = "访问日志仅保留在本次页面会话，浏览器本地存储暂不可用。";
  }
  cached = next;
  loaded = true;
  listeners.forEach(notify => notify());
  return cached;
}

export function beginAuditPresentation() {
  scopeGeneration += 1;
  if (!demoBackup) demoBackup = getAuditRecords();
  cached = { ...INITIAL_RECORDS, logs: [...DEMO_LOGS], reviewRequests: [], archives: [] }; loaded = true;
  listeners.forEach(notify => notify());
}
export function endAuditPresentation() {
  if (!demoBackup) return;
  scopeGeneration += 1;
  cached = demoBackup; demoBackup = null;
  try { cached = parseRecords(window.localStorage.getItem(STORAGE_KEY)); } catch { /* Restore captured record. */ }
  listeners.forEach(notify => notify());
}
function newLog(action: string, target: string, decision?: DecisionRecord): AuditAccessLog {
  return { id: globalThis.crypto.randomUUID(), timestamp: new Date().toISOString(), actor: "林岳 · 值长（演示角色）", action, target, kind: "local", ...(decision ? { revision: decision.revision, decisionStatus: decision.status, contextKey: canonicalAuditJson(decision) } : {}) };
}
function appendLog(records: AuditRecords, log: AuditAccessLog): AuditRecords { return { ...records, logs: [...records.logs, log].slice(-MAX_ACCESS_LOGS) }; }

export function recordAuditAccess(target: string, decision?: DecisionRecord, action = "查看页面"): void {
  const cleanTarget = target.trim().slice(0, 200);
  const cleanAction = action.trim().slice(0, 80);
  if (!cleanTarget || !cleanAction) return;
  const contextKey = decision ? canonicalAuditJson(decision) : undefined;
  const now = Date.now();
  const recent = getAuditRecords().logs.findLast(item => item.kind === "local" && item.target === cleanTarget && item.action === cleanAction && item.contextKey === contextKey);
  if (recent && now - Date.parse(recent.timestamp) >= 0 && now - Date.parse(recent.timestamp) < DEDUPE_WINDOW_MS) return;
  const log = newLog(cleanAction, cleanTarget, decision);
  updateRecords(current => {
    const duplicate = current.logs.findLast(item => item.kind === "local" && item.target === cleanTarget && item.action === cleanAction && item.contextKey === contextKey);
    return duplicate && now - Date.parse(duplicate.timestamp) >= 0 && now - Date.parse(duplicate.timestamp) < DEDUPE_WINDOW_MS ? current : appendLog(current, log);
  });
}
export function logAuditAccess(action: string, target: string): void { recordAuditAccess(target, undefined, action); }

export function requestAuditReview(decision: DecisionRecord, note: string): AuditReviewRequest {
  const cleanNote = note.trim();
  if (!cleanNote) throw new Error("请填写需要复核的内容。");
  if (cleanNote.length > 1000) throw new Error("复核说明请控制在 1000 字以内。");
  let request: AuditReviewRequest = { id: globalThis.crypto.randomUUID(), timestamp: new Date().toISOString(), revision: decision.revision, decisionStatus: decision.status, selectedPlan: decision.selected, note: cleanNote, status: "recorded", scope: "local", decision: cloneJson(decision) };
  updateRecords(current => {
    const existing = current.reviewRequests.findLast(item => item.note === cleanNote && canonicalAuditJson(item.decision) === canonicalAuditJson(decision) && Date.parse(request.timestamp) - Date.parse(item.timestamp) >= 0 && Date.parse(request.timestamp) - Date.parse(item.timestamp) < DEDUPE_WINDOW_MS);
    if (existing) { request = existing; return current; }
    return appendLog({ ...current, reviewRequests: [...current.reviewRequests, request] }, newLog("记录本地复核请求（未发送）", `修订 ${decision.revision} · ${cleanNote.slice(0, 80)}`, decision));
  }, true);
  return request;
}

export async function archiveAuditSnapshot(decision: DecisionRecord): Promise<AuditArchive> {
  const scope = getAuditScopeGeneration();
  const payload = createAuditPayload(decision);
  const hash = await hashAuditJson(payload);
  if (!isAuditScopeCurrent(scope)) {
    const cancelled = new Error("审计范围已切换，此次归档已取消。");
    cancelled.name = "AbortError";
    throw cancelled;
  }
  let archive: AuditArchive = { id: globalThis.crypto.randomUUID(), timestamp: new Date().toISOString(), revision: payload.decision.revision, decisionStatus: payload.decision.status, selectedPlan: payload.decision.selected, hash, algorithm: "SHA-256", payload };
  updateRecords(current => {
    const existing = current.archives.find(item => item.hash === hash && canonicalAuditJson(item.payload) === canonicalAuditJson(payload));
    if (existing) { archive = existing; return current; }
    return appendLog({ ...current, archives: [...current.archives, archive] }, newLog("归档本地证据副本（未执行设备）", `${DECISION_ID} · 修订 ${payload.decision.revision} · ${payload.decision.status}`, payload.decision));
  }, true);
  return archive;
}

export function auditReportMarkdown(snapshot: AuditSnapshot): string {
  const clean = (value: string) => value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  const status = snapshot.decisionStatus === "waiting" ? "待人工确认" : snapshot.decisionStatus === "approved" ? "已人工确认，待执行验证" : "已驳回，待修订";
  const rows = snapshot.nodes.map(node => `| ${node.index} | ${node.title} | ${node.statusLabel} | ${clean(node.summary)} |`).join("\n");
  const history = snapshot.archives.map(archive => `- ${archive.timestamp} · 修订 ${archive.revision} · 方案 ${archive.selectedPlan} · ${archive.decisionStatus} · ${snapshot.currentArchive?.id === archive.id ? "当前内容副本" : "历史内容副本"} · SHA-256: \`${archive.hash}\``).join("\n") || "- 暂无本地归档副本。";
  const reviews = snapshot.reviewRequests.map(item => `- ${item.timestamp} · 修订 ${item.revision} · 本地记录，未发送：${clean(item.note)}`).join("\n") || "- 暂无本地复核请求。";
  const logs = snapshot.logs.slice(-20).reverse().map(log => `- ${log.timestamp} · ${log.kind === "demo" ? "演示种子记录" : "实际本地交互"} · ${clean(log.actor)} · ${clean(log.action)} · ${clean(log.target)}`).join("\n");
  return `# ${DECISION_ID} 证据与审计报告\n\n本报告为当前浏览器中的本地演示快照。\n\n- 决策修订：${snapshot.revision}\n- 当前方案：${snapshot.selectedPlan}\n- 审核状态：${status}\n- 设备执行：未接入、未下发、尚未验证。\n\n## 证据链\n\n| 序号 | 节点 | 状态 | 摘要 |\n| --- | --- | --- | --- |\n${rows}\n\n## 完整性校验\n\n${AUDIT_INTEGRITY_NOTICE}\n\n${snapshot.currentArchive ? `当前内容已有本地副本，摘要为 \`${snapshot.currentArchive.hash}\`。需重新计算摘要后判定完整性；归档状态本身不代表校验成功。` : "当前决策内容尚未归档；历史副本不能代表当前状态。"}\n\n## 归档副本\n\n${history}\n\n## 本地复核记录\n\n${reviews}\n\n## 最近访问记录\n\n${logs}\n${snapshot.storageWarning ? `\n存储提示：${snapshot.storageWarning}\n` : ""}`;
}
