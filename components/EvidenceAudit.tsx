"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { DECISION_ID, useDecisionRecord } from "@/lib/decision-card";
import { archiveAuditSnapshot, auditReportMarkdown, createAuditPayload, getAuditSnapshot, getAuditScopeGeneration, isAuditScopeCurrent, hashAuditJson, logAuditAccess, requestAuditReview, useAuditRecords, verifyAuditHash, type AuditAccessLog, type AuditNodeId } from "@/lib/evidence-audit";

import { setDemoEventPhase } from "@/lib/demo-event";
import { usePresentationMotion } from "./AnimatedNumber";
import "@/app/motion-decision-enhanced.css";
import EventDrawer from "./EventDrawer";
import ReplayController from "./ReplayController";

type Destination = "decision" | "units";
type Modal = "export" | "signature" | "review" | "archive" | "history" | "access" | null;
type MetadataTab = "version" | "signature" | "source";

function AuditIcon({ name, size = 22 }: { name: string; size?: number }) {
  const icons: Record<string, ReactNode> = {
    audit: <><path d="M5 3h11l4 4v7M5 3v19h8M16 3v5h5M8 8h5M8 12h8M8 16h3"/><path d="m17 13 5 2v4c0 3-5 5-5 5s-5-2-5-5v-4Z"/><path d="m15 18 2 2 3-4"/></>,
    document: <><path d="M5 2h10l5 5v15H5ZM15 2v6h5M9 12h7M9 16h7"/></>,
    data: <><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M3 9V4h6M15 4h6v5M21 15v5h-6M9 20H3v-5M10 11h4M10 14h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    hash: <path d="M9 3 6 21M18 3l-3 18M3 9h19M2 15h19"/>,
    shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
    download: <><path d="M12 2v13m-5-5 5 5 5-5M4 15v6h16v-6"/></>,
    copy: <><rect x="8" y="7" width="12" height="15" rx="2"/><path d="M16 7V2H3v15h5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    back: <path d="M20 12H4m6-6-6 6 6 6"/>,
    graph: <><circle cx="12" cy="4" r="3"/><circle cx="4" cy="19" r="3"/><circle cx="20" cy="19" r="3"/><path d="m10 7-5 9M14 7l5 9M7 19h10"/></>,
    list: <><path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/></>,
    event: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 17h.01"/></>,
    analysis: <><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><circle cx="12" cy="12" r="4"/><path d="M12 8v4l3 2"/></>,
    procedure: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h2m4 0h2M8 17h2m4 0h2"/></>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M3 22v-3a9 9 0 0 1 18 0v3Z"/></>,
    users: <><circle cx="9" cy="7" r="4"/><path d="M2 22v-4a7 7 0 0 1 14 0v4M17 3a4 4 0 0 1 0 8M18 14a6 6 0 0 1 4 5v3"/></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/></>,
    pulse: <><circle cx="12" cy="12" r="10"/><path d="M4 12h4l2-5 3 11 3-8 2 2h3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] ?? icons.document}</svg>;
}

const seenAuditHashes = new Set<string>();
const nodeIcons: Record<AuditNodeId, string> = { raw: "data", event: "event", analysis: "analysis", procedure: "procedure", risk: "shield", plans: "document", review: "user", result: "check" };
const graphCaptions: Record<AuditNodeId, string> = { raw: "现场数据", event: "异常识别", analysis: "模型推理", procedure: "规程约束", risk: "风险评估", plans: "方案生成", review: "人工复核", result: "结果记录" };
function displayTime(value: string, date = true) {
  if (!value || Number.isNaN(Date.parse(value))) return value || "待形成记录";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", ...(date ? { year: "numeric", month: "2-digit", day: "2-digit" } as const : {}), hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)).replaceAll("/", "-");
}
function shortHash(hash: string) { return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : "正在计算本地摘要"; }
function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function EvidenceAudit({ go }: { go: (view: Destination) => void }) {
  const decision = useDecisionRecord();
  const motion = usePresentationMotion();
  const [selectedPath, setSelectedPath] = useState<AuditNodeId | null>(null);
  const records = useAuditRecords();
  const snapshot = useMemo(() => getAuditSnapshot(decision, records), [decision, records]);
  const [active, setActive] = useState<AuditNodeId>("raw");
  const [detailNode, setDetailNode] = useState<AuditNodeId | null>(null);
  const [hoveredNode, setHoveredNode] = useState<AuditNodeId | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [metadataTab, setMetadataTab] = useState<MetadataTab>("version");
  const [graphView, setGraphView] = useState<"graph" | "list">("graph");
  const [logFilter, setLogFilter] = useState<"all" | "local" | "demo">("all");
  const [modal, setModal] = useState<Modal>(null);
  const [accessDetail, setAccessDetail] = useState<AuditAccessLog | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [digest, setDigest] = useState({ source: "", value: "", error: false });
  const [verification, setVerification] = useState("");
  const dialog = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const operationEpoch = useRef(0);
  const node = snapshot.nodes.find(item => item.id === active) ?? snapshot.nodes[0];
  const nodeJson = JSON.stringify(node.payload, null, 2);
  const nodeHash = digest.source === nodeJson ? digest.value : "";
  const hashFailed = digest.source === nodeJson && digest.error;
  const currentArchive = snapshot.currentArchive;
  const filteredLogs = [...snapshot.logs].reverse().filter(item => logFilter === "all" || item.kind === logFilter);
  const reviewState = decision.status === "approved" ? "已批准 · 待验证" : decision.status === "rejected" ? "已驳回 · 待修订" : "待人工复核";
  const localReview = records.reviewRequests.findLast(item => item.revision === decision.revision && item.decisionStatus === decision.status && item.selectedPlan === decision.selected);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const delay = motion && !seenAuditHashes.has(nodeJson) ? 300 : 0;
    const reveal = new Promise<void>(resolve => { if (!delay) resolve(); else timer = window.setTimeout(resolve,delay); });
    Promise.all([reveal,hashAuditJson(JSON.parse(nodeJson))]).then(([,value]) => { seenAuditHashes.add(nodeJson); if (!cancelled) setDigest({ source: nodeJson, value, error: false }); }).catch(() => { if (!cancelled) setDigest({ source: nodeJson, value: "", error: true }); });
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [nodeJson, motion]);
  useEffect(() => { logAuditAccess("查看证据节点", node.title); }, [node.title]);
  useEffect(() => () => { operationEpoch.current += 1; if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const controls = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, select, a[href], [tabindex="0"]') ?? []);
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setModal(null); }
      if (event.key !== "Tab") return;
      const targets = controls(); const first = targets[0]; const last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, [modal]);

  function notify(message: string) { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 5500); }
  function selectNode(id: AuditNodeId) { setActive(id); setSelectedPath(id); }
  function openNode(id: AuditNodeId) { setActive(id); setSelectedPath(id); setDetailNode(id); }
  function onPath(id: AuditNodeId) { const target = hoveredNode ?? selectedPath; return target === null || snapshot.nodes.findIndex(item => item.id === id) <= snapshot.nodes.findIndex(item => item.id === target); }
  function openModal(kind: Modal) { setFormError(""); setVerification(""); setModal(kind); }
  function captureOperation() {
    const scope = getAuditScopeGeneration();
    const epoch = operationEpoch.current;
    return () => isAuditScopeCurrent(scope) && epoch === operationEpoch.current;
  }
  async function copyRecord() {
    const isCurrent = captureOperation();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(nodeJson);
      else { const field = document.createElement("textarea"); field.value = nodeJson; field.style.position = "fixed"; field.style.opacity = "0"; document.body.append(field); field.select(); const copied = document.execCommand("copy"); field.remove(); if (!copied) throw new Error("copy"); }
      if (!isCurrent()) return;
      logAuditAccess("复制节点记录", node.title); notify("审计记录 JSON 已复制");
    } catch { if (isCurrent()) notify("复制未完成，可下载 JSON 记录保存"); }
  }
  function exportReport(format: "json" | "md") {
    const exportedAt = new Date().toISOString();
    const content = format === "md" ? auditReportMarkdown(snapshot) : JSON.stringify({ exportedAt, scope: "local-demo", decision: createAuditPayload(decision), evidenceChain: snapshot.nodes, accessLogs: snapshot.logs, reviewRequests: snapshot.reviewRequests, archives: snapshot.archives }, null, 2);
    downloadFile(`${DECISION_ID}-audit-r${decision.revision}.${format}`, content, format === "md" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8");
    logAuditAccess("导出审计报告", `${DECISION_ID} · ${format.toUpperCase()}`); setModal(null); notify(`${format === "md" ? "Markdown 报告" : "JSON 审计记录"}已导出`);
  }
  function submitReview() {
    if (reviewNote.trim().length < 5) { setFormError("请填写至少 5 个字的复核原因。"); return; }
    try { requestAuditReview(decision, reviewNote.trim()); setReviewNote(""); setModal(null); notify("复核申请已保存到本地审计记录"); }
    catch (error) { setFormError(error instanceof Error ? error.message : "本地记录保存失败，请重试。"); }
  }
  async function archive() {
    const isCurrent = captureOperation();
    setBusy(true); setFormError("");
    try {
      await archiveAuditSnapshot(decision);
      if (!isCurrent()) return;
      setDemoEventPhase("archived"); setModal(null); notify("当前决策快照已归档，保留原审核状态");
    } catch (error) { if (isCurrent()) setFormError(error instanceof Error ? error.message : "归档未完成，请重试。"); }
    finally { if (isCurrent()) setBusy(false); }
  }
  async function verifyArchive() {
    if (!currentArchive) { setVerification("当前版本尚未归档，可先确认归档后重新校验。"); return; }
    const isCurrent = captureOperation();
    setBusy(true);
    try {
      const valid = await verifyAuditHash(currentArchive.payload, currentArchive.hash);
      if (!isCurrent()) return;
      setVerification(valid ? "本地归档内容与保存的 SHA-256 摘要一致。" : "本地归档摘要不一致，请发起复核。"); logAuditAccess("校验本地归档摘要", currentArchive.id);
    } catch { if (isCurrent()) setVerification("当前浏览器无法完成摘要校验，请稍后重试。"); }
    finally { if (isCurrent()) setBusy(false); }
  }
  const versionRows: [string, string][] = [["数据版本", `场景 v1 · 决策 r${decision.revision}`], ["采集系统", active === "raw" ? "DCS 仿真测点" : "本地证据链"], ["数据类型", active === "raw" ? "过程数据快照" : "节点结构化记录"], ["采样口径", "固定场景 · 非实时遥测"], ["存储位置", "浏览器本地 / 当前会话"], ["记录格式", "JSON · UTF-8"], ["关联证据", `${node.evidenceIds.length} 项`], ["节点状态", node.statusLabel]];
  const sourceRows: [string, string][] = [["来源对象", node.source], ["责任主体", node.actor], ["记录时间", displayTime(node.timestamp)], ["决策关联", `${DECISION_ID} / r${decision.revision}`], ["数据范围", "S-01 本地仿真场景"]];
  const modalTitles: Record<Exclude<Modal, null>, string> = { export: "导出审计报告", signature: "数据签名与完整性", review: "发起审计复核", archive: currentArchive ? "已归档的当前快照" : "确认归档当前快照", history: "访问与审计记录", access: "访问记录详情" };
  const accessRows = (logs: AuditAccessLog[]) => logs.map(log => <button className="ea-access-row" key={log.id} onClick={() => { setAccessDetail(log); openModal("access"); }} aria-label={`查看访问记录：${log.actor}，${log.action}，${log.target}`}><span><i className="ea-access-avatar">{log.actor.slice(0, 1)}</i><strong>{log.actor}</strong></span><span title={`${log.action} · ${log.target}`}>{log.action} · {log.target}</span><time dateTime={log.timestamp}>{displayTime(log.timestamp)}</time><small>{log.kind === "demo" ? "场景示例" : "本地记录"}</small></button>);
  const metadataRows = (rows: [string, string][]) => <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;

  return <div className="ea-page">
    <header className="ea-hero"><div className="ea-hero-title"><span className="ea-hero-icon"><AuditIcon name="audit"/></span><div><h1>证据与审计</h1><p>每个判断都有来源、版本和时间，便于复核。</p></div></div><div className="ea-hero-actions"><button className="ea-button ea-replay-entry" onClick={() => { setShowReplay(true); logAuditAccess("打开事件回放", "Event-021"); }}><AuditIcon name="clock"/>事件回放</button><p className="ea-motto">以数据为证<br/>以安全为本</p><button className="ea-button" onClick={() => openModal("export")}><AuditIcon name="download"/>导出审计报告</button><button className="ea-button" onClick={() => openModal("signature")}><AuditIcon name="shield"/>查看签名信息</button></div></header>
    <section className="ea-panel ea-chain-panel" aria-label="决策证据链"><header className="ea-chain-heading"><div><AuditIcon name="document"/><h2>{DECISION_ID} 决策记录</h2><span className={`ea-badge ${decision.status === "waiting" ? "ea-waiting" : decision.status === "rejected" ? "ea-rejected" : "ea-good"}`}><AuditIcon name="shield"/>{reviewState}</span><span className="ea-badge">本地可追溯</span></div><p>场景起始：{displayTime(snapshot.nodes[0].timestamp)} ｜ 当前版本 r{decision.revision}</p></header><div className="ea-chain" data-path-focus={hoveredNode !== null || selectedPath !== null} role="tablist" aria-label="选择证据链节点">{snapshot.nodes.map((item, index) => <button key={item.id} id={`ea-node-${item.id}`} data-path={onPath(item.id)} style={{"--chain-delay":`${index*120}ms`} as CSSProperties} className={`ea-chain-node ${item.status === "complete" ? "ea-complete" : "ea-pending"}`} role="tab" aria-selected={active === item.id} aria-controls="ea-node-snapshot" tabIndex={active === item.id ? 0 : -1} onClick={() => selectNode(item.id)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % snapshot.nodes.length : event.key === "ArrowLeft" ? (index + snapshot.nodes.length - 1) % snapshot.nodes.length : event.key === "Home" ? 0 : event.key === "End" ? snapshot.nodes.length - 1 : -1; if (next >= 0) { event.preventDefault(); selectNode(snapshot.nodes[next].id); document.getElementById(`ea-node-${snapshot.nodes[next].id}`)?.focus(); } }}><span className="ea-chain-dot">{index + 1}</span><strong>{item.title}</strong><small>{item.id === "review" ? item.statusLabel : item.id === "result" ? "未下发设备指令" : item.source}</small><time dateTime={item.timestamp || undefined}>{item.status === "pending" || item.status === "unverified" ? item.statusLabel : displayTime(item.timestamp, false)}</time></button>)}</div></section>
    <div className="ea-body"><div className="ea-left-column">
      <section key={active} className="ea-panel ea-snapshot ea-motion-detail" id="ea-node-snapshot" role="tabpanel" aria-labelledby={`ea-node-${active}`}><header className="ea-panel-heading"><div><AuditIcon name="document"/><h2>{node.title}与证据快照</h2><p>{node.summary}</p></div></header><div className="ea-snapshot-cards"><article className="ea-snapshot-card"><span><AuditIcon name="data"/></span><div><small>源数据编号</small><strong>{node.payload.source_id ? String(node.payload.source_id) : `${DECISION_ID}/${node.id}`}</strong><p>来源：{node.source}</p></div></article><article className="ea-snapshot-card"><span><AuditIcon name="clock"/></span><div><small>记录时间</small><strong>{displayTime(node.timestamp)}</strong><p>时区：UTC+8 · 场景 / 本地记录</p></div></article><article className="ea-snapshot-card ea-integrity"><span><AuditIcon name="hash"/></span><div><small>完整性摘要 · 本地计算</small><strong data-calculating={!hashFailed && !nodeHash}>{hashFailed ? "计算暂不可用" : nodeHash ? "SHA-256 已生成" : "VERIFYING…"}</strong><p title={nodeHash}>{shortHash(nodeHash)}</p></div></article></div><div className="ea-record-grid"><section className="ea-json"><header><h3>审计记录摘要</h3><button className="ea-copy" onClick={copyRecord}><AuditIcon name="copy"/>复制</button></header><div className="ea-json-lines" role="textbox" aria-readonly="true" aria-multiline="true" tabIndex={0} aria-label="当前节点 JSON 记录">{nodeJson.split("\n").map((line, index) => { const colon = line.indexOf(":"); return <span className="ea-json-line" key={index}><b aria-hidden="true">{index + 1}</b><code>{colon < 0 ? line : <>{line.slice(0, colon + 1)}<span>{line.slice(colon + 1)}</span></>}</code></span>; })}</div></section><section className="ea-metadata"><div className="ea-metadata-tabs" role="tablist" aria-label="证据元信息">{([{ id: "version", label: "版本信息" }, { id: "signature", label: "数据签名" }, { id: "source", label: "来源对象" }] as const).map((item,index,list) => <button key={item.id} role="tab" id={`ea-meta-${item.id}`} aria-selected={metadataTab === item.id} aria-controls="ea-metadata-panel" tabIndex={metadataTab === item.id ? 0 : -1} onClick={() => setMetadataTab(item.id)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index+1)%3 : event.key === "ArrowLeft" ? (index+2)%3 : -1; if (next >= 0) { event.preventDefault(); setMetadataTab(list[next].id); document.getElementById(`ea-meta-${list[next].id}`)?.focus(); } }}>{item.label}</button>)}</div><div className="ea-metadata-body" id="ea-metadata-panel" role="tabpanel" aria-labelledby={`ea-meta-${metadataTab}`}>{metadataTab === "version" ? metadataRows(versionRows) : metadataTab === "source" ? <>{metadataRows(sourceRows)}<button className="ea-text-button" onClick={() => go(active === "raw" ? "units" : "decision")}>查看来源页面<AuditIcon name="arrow"/></button></> : <><p>本地 Demo 摘要，不是机构数字签名或真实证书。</p>{metadataRows([["摘要算法", "SHA-256 / Web Crypto"], ["节点摘要", shortHash(nodeHash)], ["签名证书", "未接入证书服务"], ["归档状态", currentArchive ? "当前副本已归档" : "当前版本尚未归档"]])}<button className="ea-text-button" onClick={() => openModal("signature")}>查看完整摘要<AuditIcon name="arrow"/></button></>}</div></section></div></section>
      <section className="ea-panel ea-graph"><i className="ea-motion-scan" aria-hidden="true"/><header className="ea-panel-heading"><div><AuditIcon name="graph"/><h2>证据链关联图</h2><p>从数据到结论的全链路证据，支持追溯与定位</p></div><div className="ea-view-switch" aria-label="关联证据展示方式"><button aria-pressed={graphView === "graph"} onClick={() => setGraphView("graph")}><AuditIcon name="graph"/>图视图</button><button aria-pressed={graphView === "list"} onClick={() => setGraphView("list")}><AuditIcon name="list"/>列表视图</button></div></header>{graphView === "graph" ? <div className="ea-graph-flow" data-path-focus={hoveredNode !== null || selectedPath !== null}>{snapshot.nodes.map(item => <div key={item.id} data-path={onPath(item.id)} className={`ea-graph-item ${item.status !== "complete" ? "ea-pending" : item.id === "event" ? "ea-alert" : ""}`}><button aria-pressed={active === item.id} onMouseEnter={() => setHoveredNode(item.id)} onMouseLeave={() => setHoveredNode(null)} onFocus={() => setHoveredNode(item.id)} onBlur={() => setHoveredNode(null)} onClick={() => openNode(item.id)} aria-label={`定位${item.title}证据`}><AuditIcon name={nodeIcons[item.id]}/><span><strong>{item.title}</strong><small>{item.statusLabel}</small></span></button><p>{graphCaptions[item.id]}<br/>({item.status === "complete" ? "有记录" : "待复核"})</p></div>)}</div> : <div className="ea-graph-list" data-path-focus={hoveredNode !== null || selectedPath !== null}>{snapshot.nodes.map((item,index) => <button key={item.id} aria-pressed={active === item.id} data-path={onPath(item.id)} onMouseEnter={() => setHoveredNode(item.id)} onMouseLeave={() => setHoveredNode(null)} onFocus={() => setHoveredNode(item.id)} onBlur={() => setHoveredNode(null)} onClick={() => openNode(item.id)}><b>{String(index+1).padStart(2,"0")}</b>{item.title}<small>{item.statusLabel}</small></button>)}</div>}</section>
    </div><div className="ea-right-column">
      <section className="ea-panel ea-access"><header className="ea-panel-heading"><div><AuditIcon name="document"/><h2>最近访问</h2></div><div className="ea-access-tools"><select aria-label="筛选访问记录" value={logFilter} onChange={event => setLogFilter(event.target.value as typeof logFilter)}><option value="all">全部访问</option><option value="local">本地操作</option><option value="demo">场景示例</option></select><button className="ea-text-button" onClick={() => openModal("history")}>查看更多<AuditIcon name="arrow"/></button></div></header><div className="ea-access-head" aria-hidden="true"><span>用户 / 角色</span><span>访问内容</span><span>访问时间</span><span>记录类型</span></div><div className="ea-access-list">{filteredLogs.length ? accessRows(filteredLogs.slice(0,5)) : <p className="ea-empty">当前筛选下暂无访问记录</p>}</div></section>
      <section className="ea-panel ea-properties"><header className="ea-panel-heading"><div><AuditIcon name="document"/><h2>关键审计属性</h2></div></header><dl className="ea-property-grid"><div><dt>责任主体</dt><dd>林岳（值长）</dd></div><div><dt>复核状态</dt><dd className={`ea-property-status ${decision.status === "waiting" ? "ea-waiting" : ""}`}>{reviewState}</dd></div><div><dt>评估版本</dt><dd>Boundary Model v2.8</dd></div><div><dt>可追溯等级</dt><dd className="ea-property-status">本地全链记录</dd></div><div><dt>人工干预</dt><dd>{decision.audit.length ? `${decision.audit.length} 条审核记录` : "尚未形成审核"}</dd></div><div><dt>数据保留</dt><dd>当前浏览器本地</dd></div></dl><section className="ea-notice"><header><strong><AuditIcon name="shield"/>审计提示</strong><small>决策版本 r{decision.revision} · 本地 Demo</small></header><div className={`ea-notice-message ${decision.status !== "approved" ? "ea-notice-pending" : ""}`}><AuditIcon name={currentArchive ? "check" : "shield"}/><div><strong>{snapshot.storageWarning ? "本地存储提示" : currentArchive ? "当前决策快照已归档" : localReview ? "复核申请已记录" : "来源与审核状态可追溯"}</strong><p>{snapshot.storageWarning ? snapshot.storageWarning : currentArchive ? "已保存当前内容与 SHA-256 摘要；归档不代表方案已执行。" : localReview ? "本地复核申请已留痕，等待人工处理。记录不改变原决策状态。" : decision.status === "waiting" ? "当前方案等待人工审核，尚无执行结果；所有展示数据均来自本地仿真场景。" : decision.status === "rejected" ? "当前方案已驳回，等待修订；未生成设备执行记录。" : "人工批准已留痕，执行结果仍待验证；本 Demo 不下发设备控制指令。"}</p></div></div></section></section>
    </div></div>
    <footer className="ea-footer"><div className="ea-footer-summary"><span><AuditIcon name="pulse"/>证据链节点 <strong>{snapshot.nodes.length} / 8</strong></span><i/><span><AuditIcon name="database"/>访问日志<strong>{snapshot.logs.length} 条</strong></span><i/><small>数据有源 · 过程可溯 · 决策可证</small></div><div className="ea-footer-actions"><button className="ea-button" onClick={() => { const index = snapshot.nodes.findIndex(item => item.id === active); if (index > 0) selectNode(snapshot.nodes[index-1].id); else go("decision"); }}><AuditIcon name="back"/>回溯上一步</button><button className="ea-button" onClick={() => exportReport("json")}><AuditIcon name="download"/>下载记录</button><button className="ea-button" onClick={() => openModal("review")}><AuditIcon name="users"/>发起复核</button><button className="ea-button ea-primary" onClick={() => openModal("archive")}><AuditIcon name="check"/>{currentArchive ? "查看归档" : "确认归档"}</button></div></footer>
    {modal && <div className="ea-modal-backdrop"><button className="ea-modal-scrim" aria-label="关闭审计弹窗背景" onClick={() => setModal(null)}/><section className={`ea-dialog ${modal === "history" ? "ea-dialog-wide" : ""}`} ref={dialog} role="dialog" aria-modal="true" aria-labelledby="ea-dialog-title"><header><div><small>EVIDENCE & AUDIT · 本地仿真场景</small><h2 id="ea-dialog-title">{modalTitles[modal]}</h2></div><button className="ea-close" aria-label="关闭审计弹窗" onClick={() => setModal(null)}><AuditIcon name="close"/></button></header><div className="ea-dialog-content">
      {modal === "export" && <><p>导出当前决策版本、证据链、访问记录和本地复核 / 归档记录。报告保留真实审核状态，不包含设备执行证明。</p><div className="ea-export-choices"><button onClick={() => exportReport("md")}><AuditIcon name="document"/><span><strong>Markdown 审计报告</strong><small>适合阅读、复盘与共享，包含来源和状态说明。</small></span></button><button onClick={() => exportReport("json")}><AuditIcon name="data"/><span><strong>JSON 完整记录</strong><small>结构化数据，便于独立校验与后续分析。</small></span></button></div></>}
      {modal === "signature" && <><p>这里展示浏览器实际计算的 SHA-256 内容摘要，仅用于本地 Demo 一致性核对。未接入机构证书、可信时间戳或电子签章服务。</p><dl className="ea-detail-list"><div><dt>当前节点</dt><dd>{node.title}</dd></div><div><dt>摘要算法</dt><dd>SHA-256 · Web Crypto</dd></div><div><dt>节点完整摘要</dt><dd><code>{nodeHash || (hashFailed ? "摘要计算不可用" : "正在计算")}</code></dd></div><div><dt>归档摘要</dt><dd><code>{currentArchive?.hash ?? "当前内容尚未归档"}</code></dd></div><div><dt>证书状态</dt><dd>本地 Demo · 无真实证书</dd></div><div><dt>身份认证</dt><dd>当前用户为演示角色，未连接身份认证服务</dd></div></dl>{verification && <p className="ea-form-error" role="status">{verification}</p>}</>}
      {modal === "review" && <><p>复核请求将保存在当前浏览器，关联决策 r{decision.revision} 与方案 {decision.selected}。提交不会向外部发送消息，也不会改变原审核结果。</p><div className="ea-review-form"><label htmlFor="ea-review-note">复核原因</label><textarea id="ea-review-note" value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={500} placeholder="例如：请补充 P-201 出口压力测点的复核依据。" aria-describedby={formError ? "ea-review-error" : undefined}/><small>{reviewNote.length} / 500 字 · 至少填写 5 个字</small>{formError && <p className="ea-form-error" id="ea-review-error" role="alert">{formError}</p>}</div></>}
      {modal === "archive" && <><p>归档保存当前决策内容的本地副本及摘要。归档不会批准方案，不会触发执行，也不会将待验证结果标记为完成。</p><div className="ea-confirm-summary"><strong>{DECISION_ID} · r{decision.revision} · 方案 {decision.selected}</strong><p>当前审核：{reviewState}<br/>执行状态：无设备指令下发，待独立验证</p></div>{currentArchive ? <dl className="ea-detail-list"><div><dt>归档编号</dt><dd>{currentArchive.id}</dd></div><div><dt>归档时间</dt><dd>{displayTime(currentArchive.timestamp)}</dd></div><div><dt>内容摘要</dt><dd><code>{currentArchive.hash}</code></dd></div><div><dt>保存范围</dt><dd>当前浏览器本地；可下载记录留存</dd></div></dl> : <p>当前内容尚无匹配归档。确认后将生成一条记录，后续修改决策会形成需要重新归档的新内容。</p>}{formError && <p className="ea-form-error" role="alert">{formError}</p>}</>}
      {modal === "access" && accessDetail && <><p>此记录{accessDetail.kind === "demo" ? "为场景演示样例，不代表真实人员访问" : "由当前浏览器的实际操作产生"}。</p><dl className="ea-detail-list">{[["访问用户",accessDetail.actor],["操作类型",accessDetail.action],["访问对象",accessDetail.target],["访问时间",displayTime(accessDetail.timestamp)],["记录编号",accessDetail.id],["记录来源",accessDetail.kind === "demo" ? "预置场景示例" : "本地用户操作"]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></>}
      {modal === "history" && <><p>访问列表区分本地实际操作与场景示例。复核与归档仅保存在当前浏览器。</p><div className="ea-access-head" aria-hidden="true"><span>用户 / 角色</span><span>访问内容</span><span>访问时间</span><span>记录类型</span></div>{accessRows(filteredLogs)}{!filteredLogs.length && <p className="ea-empty">当前筛选下暂无记录</p>}<ul className="ea-audit-history">{records.reviewRequests.map(item => <li key={item.id}><strong>复核申请 · r{item.revision} · 本地已记录</strong><time>{displayTime(item.timestamp)}</time><p>{item.note}</p></li>)}{records.archives.map(item => <li key={item.id}><strong>快照归档 · r{item.revision} · 方案 {item.selectedPlan}</strong><time>{displayTime(item.timestamp)}</time><p>摘要：{shortHash(item.hash)}</p></li>)}</ul></>}
    </div><footer className="ea-dialog-actions"><button className="ea-button ea-subtle" onClick={() => setModal(null)}>关闭</button>{modal === "signature" && <button className="ea-button" disabled={busy || !currentArchive} onClick={verifyArchive}><AuditIcon name="shield"/>{busy ? "校验中…" : "核对归档摘要"}</button>}{modal === "review" && <button className="ea-button ea-primary" onClick={submitReview}><AuditIcon name="users"/>保存复核申请</button>}{modal === "archive" && <button className="ea-button ea-primary" disabled={busy} onClick={currentArchive ? () => exportReport("json") : archive}><AuditIcon name={currentArchive ? "download" : "check"}/>{busy ? "正在归档…" : currentArchive ? "下载归档记录" : "确认保存副本"}</button>}{modal === "access" && <button className="ea-button" onClick={() => setModal("history")}>返回访问记录<AuditIcon name="arrow"/></button>}</footer></section></div>}
    {detailNode && <EventDrawer title={`${node.title} · 节点详情`} onClose={() => setDetailNode(null)}><div key={node.id} className="event-node-detail ea-motion-detail"><span className="event-node-status">{node.statusLabel}</span><p>{node.summary}</p><dl>{[["关联事件","Event-021 · P-201"],["来源",node.source],["时间",displayTime(node.timestamp)],["输入",node.id === "raw" ? "P101 仿真测点快照" : `${snapshot.nodes[Math.max(0,snapshot.nodes.findIndex(item=>item.id===node.id)-1)].title}及关联证据`],["输出",node.statusLabel],["模型版本",node.id === "analysis" || node.id === "risk" ? "Boundary Model v2.8" : "不适用 · 结构化记录"],["可信度",node.id === "analysis" || node.id === "risk" ? "86% · 场景预设" : "保留来源与状态，不设推断评分"],["对决策的贡献",node.summary],["版本",`决策 r${decision.revision}`],...node.rows,["节点摘要",nodeHash || "计算中"]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div></EventDrawer>}
    {showReplay && <EventDrawer title="Event-021 事件回放" onClose={() => setShowReplay(false)}><ReplayController/></EventDrawer>}
    {toast && <div className="ea-toast" role="status"><AuditIcon name="check"/><span>{toast}</span><button aria-label="关闭提示" onClick={() => setToast("")}><AuditIcon name="close"/></button></div>}
  </div>;
}
