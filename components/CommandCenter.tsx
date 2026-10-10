"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import GreenWorkspace from "./GreenWorkspace";
import EnergyWorkspace from "./EnergyWorkspace";
import AgentProgress from "./AgentProgress";
import EvidenceDrawer from "./EvidenceDrawer";
import { useDemoEvent, startCollaborativeAnalysis, setDemoEventPhase, getEventPressure } from "@/lib/demo-event";
import "@/app/workbench-interaction.css";
import "@/app/motion-agents-enhanced.css";

type EvidenceId = "pressure" | "alarms" | "procedure" | "history" | "model";

type Destination = "overview" | "copilots" | "decision" | "simulation" | "evidence";
type Agent = "safety" | "green" | "energy";
type Message = { id: number; role: "user" | "safety" | "green" | "system"; text: string; time?: string; pending?: boolean; animated?: boolean };
type Detail = { title: string; description: string; rows: [string, string][]; action?: "decision" | "evidence" };

function Symbol({ name, size = 24 }: { name: string; size?: number }) {
  const icons: Record<string, ReactNode> = {
    shield: <><path d="M12 22S3.5 18 3.5 10V5L12 2l8.5 3v5c0 8-8.5 12-8.5 12Z"/><path d="m8 11 3 3 5-6"/></>,
    leaf: <><path d="M20 3C8 3 3 9 4 15c1 7 11 7 14-2 2-5 2-10 2-10Z"/><path d="M3 22c3-8 7-9 13-15"/></>,
    energy: <path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M1 12v4M23 12v4M8 12v2M16 12v2M9 17h6"/><circle cx="12" cy="2" r="1"/></>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3Z" fill="currentColor" stroke="none"/></>,
    chart: <><path d="M3 21h19M6 17v-5M11 17V7M16 17V3M21 17v-9"/></>,
    document: <><path d="M5 2h10l4 4v16H5Z"/><path d="M14 2v5h5M8 11h8M8 15h8M8 18h5"/></>,
    pressure: <><rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="10" r="3"/><path d="m12 10 2-2M10 17h4"/></>,
    network: <><circle cx="12" cy="4" r="2"/><circle cx="4" cy="19" r="2"/><circle cx="20" cy="19" r="2"/><path d="m11 6-6 11M13 6l6 11M6 19h12"/></>,
    alarm: <><path d="m12 2 10 19H2Z" fill="currentColor" stroke="none"/><path d="M12 8v6M12 17h.01" stroke="#05233a" strokeWidth="2.3"/></>,
    clear: <><path d="M9 2h6M12 2v3M19 5l2 2"/><circle cx="12" cy="14" r="8"/><path d="M12 10v4l2 2"/></>,
    send: <><path d="m3 10 19-8-6 20-4-9-9-3Z" fill="currentColor" stroke="none"/><path d="m12 13 6-7" stroke="#075184"/></>,
    valve: <><path d="M7 2h10v4H7ZM12 6v5M3 12l9 5-9 5ZM21 12l-9 5 9 5Z"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] ?? icons.document}</svg>;
}

const initialMessages: Message[] = [
  { id: 1, role: "system", text: "我是 Event-021 的本地演示助手。可以查看 P-201 的监测状态、解释分析结果，或打开对应证据。点击「启动协同分析」可查看三个智能体依次完成研判。" },
];

const quickQuestions = ["为什么是中低风险？", "如果压力继续下降会怎样？", "为什么不立即降功率？", "依据哪条规程？", "哪些证据支持这个判断？", "设备故障概率多大？"];

const details: Record<string, Detail> = {
  units: { title: "机组运行详情", description: "星澜核能仿真基地 · 双机组运行快照。以下为演示场景数据。", rows: [["HTGR-1 / HTGR-2", "运行中 / 运行中"], ["机组电功率", "198 MW / 202 MW"], ["出口温度", "749 °C / 752 °C"], ["出口压力", "7.1 MPa / 7.2 MPa"], ["当前关注设备", "主泵 P-201 · 出口压力下降"]] },
  pressure: { title: "压力参数 P101", description: "P-201 出口压力在观测窗口内呈下降趋势。单一参数的偏移需要结合关联报警、设备状态和其他运行参数复核。", rows: [["当前压力", "4.3 MPa"], ["短时变化", "↓ 4.3%"], ["趋势窗口", "最近 1 小时"], ["数据来源", "仿真测点 P101"], ["关联设备", "主泵 P-201"]], action: "evidence" },
  alarm: { title: "关联报警 A317", description: "演示场景将同一设备的三条关联报警归并，供值长集中复核。", rows: [["A317", "出口压力偏低"], ["A320", "压力下降速率异常"], ["A322", "泵组效率偏移"], ["报警数量", "3 条 · 较上一时段 +2"]], action: "evidence" },
  pump: { title: "泵组 P-201", description: "泵组健康度为场景中的综合指标。建议查看振动趋势与出口阀门反馈，核对压力下降原因。", rows: [["设备状态", "运行中 · 需关注"], ["健康度", "82.6%"], ["出口压力", "4.3 MPa"], ["建议核查", "就地振动 / 阀门反馈"]], action: "evidence" },
  procedure: { title: "OP-12 §4.3 核查流程", description: "仿真场景规程摘要。涉及运行调整的建议，由值长在决策中心审核确认。", rows: [["01 · 参数复核", "确认 P101 压力与关联测点"], ["02 · 设备核查", "检查 P-201 振动及出口阀门反馈"], ["03 · 趋势监测", "持续跟踪压力、温度与流量"], ["04 · 人工审核", "结合核查结果确认处置方案"]], action: "decision" },
  history: { title: "历史事件 #021", description: "历史场景出现过相似的压力缓慢下降模式，用于辅助比较当前事件。相似度不代表根因已经确认。", rows: [["相似度", "82%"], ["历史现象", "出口压力持续下降"], ["关联设备", "同类主泵"], ["核查方向", "泵组效率与阀门反馈"]], action: "evidence" },
  confidence: { title: "模型置信度", description: "91% 是当前演示场景给出的分析置信度，用于展示不确定性，仍需结合设备核查结果进行人工判断。", rows: [["分析置信度", "91%"], ["数据完整性", "98.7%"], ["复核依据", "实时参数 / 关联报警 / 历史场景"], ["人工确认", "待值长审核"]] },
  margin: { title: "安全裕度", description: "本场景综合判断为裕度充足。持续监测关键参数是后续核查的一部分。", rows: [["当前状态", "充足"], ["场景指标变化", "+12%"], ["安全边界", "未触及"], ["关注事项", "出口压力下降趋势"]] },
};

function PressureChart({ range, alarmTriggered }: { range: number; alarmTriggered: boolean }) {
  const base = getEventPressure(0);
  const windowSeconds = range * 3600;
  const samples = [...Array.from({ length: 25 }, (_, i) => -windowSeconds + i / 24 * (windowSeconds - 180)), ...Array.from({ length: 13 }, (_, i) => -180 + (i + 1) / 13 * 180)];
  const values = samples.map(second => alarmTriggered && second >= -180 ? getEventPressure(second + 180) : base * (1 - .0008 * Math.sin(second / 140)));
  const current = alarmTriggered ? getEventPressure(180) : getEventPressure(0);
  const points = values.map((v, i) => [40 + (samples[i] + windowSeconds) / windowSeconds * 346, 22 + (4.55 - v) / .35 * 91]);
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const labels = range === 1 ? ["−60分", "−45分", "−30分", "−15分", "当前"] : range === 6 ? ["−6时", "−4.5时", "−3时", "−1.5时", "当前"] : ["−24时", "−18时", "−12时", "−6时", "当前"];
  return <div className="cc-pressure-chart"><svg viewBox="0 0 424 148" role="img" aria-label={`P-201 最近${range}小时压力参考趋势，当前${current.toFixed(2)} MPa${alarmTriggered ? "，异常窗口180秒下降4.3%" : "，监测中"}`}>
    <defs><linearGradient id="cc-pressure-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00bdf4" stopOpacity=".3"/><stop offset="1" stopColor="#00bdf4" stopOpacity="0"/></linearGradient></defs>
    <text x="4" y="15" fill="#96c4e8" fontSize="11">MPa</text>
    {[4.5, 4.4, 4.3, 4.2].map(v => { const y = 22 + (4.55 - v) / .35 * 91; return <g key={v}><line x1="40" x2="408" y1={y} y2={y} stroke="#0a5374" strokeDasharray="2 3"/><text x="31" y={y + 4} textAnchor="end" fill="#9dc5e5" fontSize="11">{v.toFixed(1)}</text></g>; })}
    {labels.map((label, i) => <text key={label} x={40 + i * 86.5} y="140" textAnchor="middle" fill="#a6d1ef" fontSize="10">{label}</text>)}
    {alarmTriggered && <rect x={40 + (windowSeconds - 180) / windowSeconds * 346} y="22" width={Math.max(3, 180 / windowSeconds * 346)} height="96" fill="#efb64528"/>}
    <path d={`${path} L386,118 L40,118Z`} fill="url(#cc-pressure-fill)"/><path d={path} fill="none" stroke="#00dcff" strokeWidth="2"/>
    {points.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3 : .8} fill={i === points.length - 1 ? "#fff" : "#00e2ff"}/>)}
    <path d="M40 25V118H408" fill="none" stroke="#367ca5"/>
    <g transform="translate(309 9)"><rect width="103" height="47" rx="5" fill="#032840" stroke="#0a87b8"/><text x="9" y="17" fill="#a9d6f3" fontSize="11">{alarmTriggered ? "异常快照" : "当前值"}</text><text x="9" y="37" fill="#eff7ff" fontSize="17">{current.toFixed(2)} MPa</text></g>
  </svg></div>;
}

function getReply(question: string, event: ReturnType<typeof useDemoEvent>): string {
  const subject = `${event.eventId} · ${event.equipmentId}`;
  if (/故障概率|概率多大/.test(question)) return `${subject} 当前没有经校准的设备故障概率。历史相似度 ${event.similarity}% 和综合置信度 ${event.confidence}% 都不等于故障概率。必须结合振动、阀位与检修记录核查；本地 Demo 不据此推算失效概率。`;
  if (/继续下降/.test(question)) return `${subject}：若 P101 压力继续下降，应重新复核压力、流量、温度和安全裕度，按 ${event.regulation} 核查并交由值长复核。是否降负荷或进入保守方案取决于约束是否触及，不会自动下发控制指令。${event.alarmTriggered ? `当前事件窗口下降 ${event.pressureDrop}%。` : "当前尚未触发本次异常，以上为假设分析。"}`;
  if (/规程|OP-12|流程/i.test(question)) return `${subject} 对应的演示规程为 ${event.regulation}：先复核 P101 测点，再检查泵组振动与出口阀门反馈，持续监测温度、流量和压力，最后由值长审核处置方案。点击规程可以查看来源与版本。`;
  if (/证据|依据/.test(question)) return `${subject} 的证据包括 P101 压力趋势、${event.alarmId} / A320 / A322 关联报警、${event.regulation} 规程、相似度 ${event.similarity}% 的历史事件，以及 Boundary Model v2.8。${event.alarmTriggered ? `压力下降 ${event.pressureDrop}% 已进入当前事件快照。` : "当前仍在监测，尚未触发压力下降事件。"}证据可逐项打开，核对来源、时间与版本。`;
  if (/降功率|降负荷/.test(question)) return `${subject}：${event.alarmTriggered ? `P101 出口压力下降 ${event.pressureDrop}%，但演示场景中的温度、流量和反应性保持稳定。` : "当前仍处于监测阶段，未出现本次异常。"}不建议仅凭单一压力趋势立即降低机组负荷；应先依据 ${event.regulation} 完成核查，再由值长判断是否调整。`;
  if (/振动|阀门|阀位/.test(question)) return `${subject} 尚未接入真实就地振动或阀位测点。需核对振动记录、出口阀门指令和反馈，并与 P101 交叉复核，不能仅凭压力趋势确认设备根因。`;
  if (/能耗|绿色|经济|效率|节能|新能源/.test(question)) return `${subject}：绿色增效建议在安全约束满足后，评估 14:00—18:00 新能源出力窗口。方案 B 的本地场景预估为辅机节能 3.4%、增纳 18 MWh；先完成 ${event.regulation} 核查，再提交人工审核，以上并非实际执行收益。`;
  if (!event.alarmTriggered) return `${subject} 当前处于监测阶段，风险为低，尚未触发 P101 压力下降。启动协同分析会载入异常场景，再由三个智能体依次分析；当前不能声称已经出现中低风险。`;
  if (event.analysisStage !== "complete") return `${subject} 已记录 P101 在过去 180 秒下降 ${event.pressureDrop}%，关联报警 ${event.alarmId}。${event.analysisStage === "idle" ? "请启动协同分析。" : "三个智能体正在分析，综合判断尚未完成。"}依据 ${event.regulation} 继续核查。`;
  return `${subject} 的 P101 出口压力下降 ${event.pressureDrop}%，但尚未越过场景安全边界，同时一回路温度稳定、RCS 流量稳定、反应性未异常，因此综合判断为中低风险。历史相似度 ${event.similarity}%，综合置信度 ${event.confidence}%。建议进入 ${event.regulation} 核查流程。`;
}

export default function CommandCenter({ go, initialAgent = "safety" }: { go: (view: Destination) => void; initialAgent?: Agent }) {
  const event = useDemoEvent();
  const [evidence, setEvidence] = useState<EvidenceId | null>(null);
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [range, setRange] = useState(1);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinking = messages.some(message => message.pending);
  const [detail, setDetail] = useState<Detail | null>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const messageId = useRef(5);
  const dialog = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (replyTimer.current) clearTimeout(replyTimer.current); }, []);

  useEffect(() => {
    if (messages !== initialMessages && messages.length > 0 && messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!detail) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = dialog.current;
    panel?.querySelector<HTMLButtonElement>("button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
      if (event.key !== "Tab" || !panel) return;
      const buttons = Array.from(panel.querySelectorAll<HTMLElement>('button, [href], input, [tabindex="0"]'));
      const first = buttons[0]; const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("keydown", handle); previous?.focus(); };
  }, [detail]);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || thinking) return;
    const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const id = messageId.current; messageId.current += 2;
    const answer = getReply(text, event);
    setMessages(current => [...current, { id, role: "user", text }, { id: id + 1, role: "system", text: "", pending: true, time }]);
    setInput("");
    replyTimer.current = setTimeout(() => {
      setMessages(current => current.map(message => message.id === id + 1 ? { ...message, text: answer, pending: false, animated: true } : message));
      replyTimer.current = null;
    }, 450);
  };
  const open = (key: string) => {
    const evidenceIds: Record<string, EvidenceId> = { pressure: "pressure", alarm: "alarms", procedure: "procedure", history: "history", pump: "model" };
    if (evidenceIds[key]) { setEvidence(evidenceIds[key]); return; }
    if (key === "confidence") { setDetail({ ...details.confidence, description: "当前 Event-021 的本地演示置信度，供人工复核参考，不是设备故障概率。", rows: [["综合置信度", `${event.confidence}%`], ["分析状态", event.analysisStage === "complete" ? "已完成" : "尚未完成"], ["人工确认", "以决策中心审核状态为准"]] }); return; }
    if (key === "units" || key === "margin") { setDetail({ ...details[key], rows: details[key].rows.map(([label,value]) => [label, label === "当前关注设备" || label === "关注事项" ? event.alarmTriggered ? "P-201 · 压力下降待核查" : "P-201 · 常规监测" : value]) }); return; }
    setDetail(details[key]);
  };
  const complete = event.analysisStage === "complete";
  const analyzing = event.analysisStage === "processing" || event.analysisStage === "results";
  const summary = complete ? <>当前处于<strong>中低风险</strong>，建议进入 <button className="cc-evidence-token" onClick={() => setEvidence("procedure")}>{event.regulation}</button> 核查流程，并持续监测关键参数变化。</> : <>{analyzing ? "三个智能体正在分别核查安全边界、运行效率与设备状态，综合结果将在分析结束后汇合。" : "当前风险为低。启动协同分析，载入 Event-021 异常快照并生成协同判断。"}</>;
  const enterDecision = () => { setDemoEventPhase("human-review"); go("decision"); };
  const renderReply = (message: Message) => {
    if (message.role === "user") return message.text;
    if (message.pending) return <span className="cc-thinking" role="status"><span>正在整理当前事件证据</span><i/><i/><i/></span>;
    const sentences = message.text.match(/[^。]+。?/g) ?? [message.text];
    const paragraphs = sentences.length > 3 ? [sentences.slice(0, 2).join(""), ...sentences.slice(2)] : sentences;
    return paragraphs.map((paragraph, paragraphIndex) => <p className={message.animated ? "cc-reply-paragraph cc-reply-new" : "cc-reply-paragraph"} key={paragraphIndex} style={{ animationDelay: `${paragraphIndex * 140}ms` }}>{paragraph.split(/(Event-021|P-201|4\.3%|OP-12 §4\.3|P101|A317|82%)/g).map((part, index) => {
      const targets: Record<string, EvidenceId> = { "Event-021": "history", "P-201": "pressure", "4.3%": "pressure", "P101": "pressure", "A317": "alarms", "OP-12 §4.3": "procedure", "82%": "history" };
      const token = `${message.id}-${paragraphIndex}-${index}`;
      return targets[part] ? <button key={index} className={`cc-evidence-token ${highlightedToken === token ? "cc-token-highlight" : ""}`} onClick={() => { setHighlightedToken(token); setEvidence(targets[part]); }} aria-label={`查看 ${part} 对应证据`}>{part}</button> : part;
    })}</p>);
  };
  const tabItems = [
    { id: "safety", icon: "shield", name: "安全运行智能体" },
    { id: "green", icon: "leaf", name: "绿色增效智能体" },
    { id: "energy", icon: "energy", name: "新能源协同智能体" },
  ] as const;
  const heroTitle = { safety: "智能体协同决策中心", green: "绿色增效工作台", energy: "新能源协同调度中心" }[agent];
  const heroSubtitle = {
    safety: <>同源数据 <span>·</span> 多智能体研判 <span>·</span> 人工最终授权</>,
    green: <>在安全约束下优化负荷分配、辅机能耗与综合收益</>,
    energy: <>出力预测 <span>·</span> 风光储协同 <span>·</span> 消纳计划编排</>,
  }[agent];
  const selectAgent = (next: Agent) => { setAgent(next); setDetail(null); };


  return <div className={`cc-page ${agent === "green" ? "cc-green-mode" : ""}`}>
    <section className="cc-hero">
      <img className="cc-hero-image" src="/assets/command-plant-banner.png" alt="夜色中的核电站与水面倒影"/>
      <div className="cc-hero-copy"><span className="cc-sync">运行数据已同步</span><h1>{heroTitle}</h1><p>{heroSubtitle}</p></div>
      <p className="cc-tagline">{agent === "green" ? <>以智慧平衡安全与绿色<br/>让清洁能源创造更大价值</> : <>更安全的核能<br/>创造更清洁的未来</>}</p>{agent === "green" && <button className="cc-green-hero-action" onClick={enterDecision}>查看决策卡<Symbol name="arrow" size={18}/></button>}
    </section>

    <div className="cc-agent-tabs" role="tablist" aria-label="专业智能体">
      {tabItems.map((item, index) => <button key={item.id} id={`cc-tab-${item.id}`} role="tab" aria-selected={agent === item.id} aria-controls={`cc-panel-${item.id}`} tabIndex={agent === item.id ? 0 : -1} className={`cc-agent-tab cc-${item.id} ${agent === item.id ? "cc-active" : ""}`} onClick={() => selectAgent(item.id)} onKeyDown={event => {
        const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabItems.length : event.key === "ArrowLeft" ? (index + tabItems.length - 1) % tabItems.length : event.key === "Home" ? 0 : event.key === "End" ? tabItems.length - 1 : -1;
        if (nextIndex < 0) return;
        event.preventDefault();
        selectAgent(tabItems[nextIndex].id);
        document.getElementById(`cc-tab-${tabItems[nextIndex].id}`)?.focus();
      }}><Symbol name={item.icon} size={34}/><>{agent === "green" ? <div className="cc-agent-label"><strong>{item.name}</strong><small>{{ safety: "安全分析 · 风险预警", green: "能效优化 · 绿色收益", energy: "协同分析 · 资源优化" }[item.id]}</small></div> : <strong>{item.name}</strong>}</><span className="cc-agent-status">{agent === item.id ? "工作台已打开" : item.id === "energy" ? "就绪" : analyzing ? "协同分析中" : complete ? "分析已完成" : "就绪"}</span></button>)}
    </div>


    <section id="cc-panel-safety" className="cc-tabpanel" role="tabpanel" aria-labelledby="cc-tab-safety" hidden={agent !== "safety"}>
    <div className="cc-workspace">
      <section className="cc-panel cc-situation" aria-label="机组态势">
        <header className="cc-panel-head"><h2><b>01</b>机组态势</h2><button onClick={() => open("units")}>查看详情<Symbol name="arrow" size={17}/></button></header>
        <div className="cc-units">{[{ name: "HTGR-1", power: 198, temperature: 749, pressure: "7.1" }, { name: "HTGR-2", power: 202, temperature: 752, pressure: "7.2" }].map(unit => <button className="cc-unit" key={unit.name} onClick={() => open("units")} aria-label={`查看${unit.name}运行详情`}><header><strong>{unit.name}</strong><span className="cc-running"><i/>运行中</span></header><div className="cc-unit-body"><img src="/assets/command-reactor.png" alt={`${unit.name}反应堆压力容器`}/><dl><div><dt>电功率</dt><dd>{unit.power} MW</dd></div><div><dt>出口温度</dt><dd>{unit.temperature} °C</dd></div><div><dt>出口压力</dt><dd>{unit.pressure} MPa</dd></div></dl></div></button>)}</div>
        <div className="cc-trend"><div className="cc-trend-head"><h3><Symbol name="pressure" size={24}/>P-201 出口压力趋势</h3><div className="cc-range" aria-label="压力趋势时间范围">{[1, 6, 24].map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value}小时</button>)}</div></div><PressureChart range={range} alarmTriggered={event.alarmTriggered}/></div>
        <div className="cc-metrics">
          <button className="cc-metric-alarm" onClick={() => open("alarm")}><Symbol name="alarm"/><div><span>关键报警</span><strong>{event.alarmTriggered ? 3 : 0} <em>条</em></strong><small>{event.alarmTriggered ? "A317 · 待核查" : "本事件未触发"}</small></div></button>
          <button className="cc-metric-confidence" onClick={() => open("confidence")}><Symbol name="network"/><div><span>模型置信度</span><strong>{complete ? `${event.confidence}%` : "—"}</strong><small>{complete ? "场景分析完成" : "待协同分析"}</small></div></button>
          <button className="cc-metric-margin" onClick={() => open("margin")}><Symbol name="shield"/><div><span>安全裕度</span><strong>充足</strong><small>↑ +12%</small></div></button>
        </div>
      </section>

      <section className="cc-panel cc-judgment" aria-label="智能体协同判断">
        <header className="cc-panel-head"><h2><b>02</b>智能体协同判断</h2><button onClick={() => setEvidence("pressure")}>查看证据<Symbol name="arrow" size={17}/></button></header>
        <div className="cc-analysis-toolbar"><div><strong>{event.eventId}</strong><span>{event.equipmentId} · {event.alarmTriggered ? "异常已触发" : "监测中"}</span></div><button onClick={startCollaborativeAnalysis} disabled={analyzing || complete}>{complete ? "协同分析完成" : analyzing ? "分析中…" : "启动协同分析"}</button></div>
        <AgentProgress/>
        <div className={`cc-evidence-graph ${complete ? "cc-analysis-complete" : ""}`}>
          <svg className="cc-edges" viewBox="0 0 400 332" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="cc-edge-glow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#00dcff"/><stop offset="1" stopColor="#4affb8"/></linearGradient></defs>{["M200 72V166", "M107 132L163 187", "M297 132L239 187", "M155 219L87 282", "M243 219L308 282"].map(d => <path key={d} d={d} stroke="url(#cc-edge-glow)" strokeWidth="1.2" fill="none"/>)}{["M200 72V166", "M107 132L163 187", "M297 132L239 187", "M155 219L87 282", "M243 219L308 282"].map((d,index) => <path className="cc-edge-flow" key={`flow-${d}`} d={d} pathLength="100" style={{animationDelay:`-${index * .8}s`}}/>)}{[[200, 83], [113, 139], [290, 139], [92, 278], [303, 277]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#67eaff"/>)}</svg>
          <button className="cc-node cc-history" onClick={() => open("history")}><strong>历史事件 #021</strong><small>相似度 {event.similarity}%</small></button>
          <button className="cc-node cc-pressure" onClick={() => open("pressure")}><strong>压力 P101</strong><small>{event.alarmTriggered ? `↓ ${event.pressureDrop}%` : "监测中"}</small></button>
          <button className="cc-node cc-alarm" onClick={() => open("alarm")}><strong>报警 {event.alarmId}</strong><small>{event.alarmTriggered ? "已触发 · 待核查" : "未触发"}</small></button>
          <button className="cc-node cc-center" onClick={() => ask("为什么系统将当前状态判定为中低风险？")}><Symbol name="chart" size={32}/><span><small>协同判断</small><strong>{complete ? "中低风险" : analyzing ? "分析中" : "低风险"}</strong></span></button>
          <button className="cc-node cc-pump" onClick={() => open("pump")}><strong>泵组 P-201</strong><small>{event.alarmTriggered ? "需安排核查" : "常规监测"}</small></button>
          <button className="cc-node cc-procedure" onClick={() => open("procedure")}><strong>规程 OP-12</strong><small>§ 4.3</small></button>
        </div>
        <div className="cc-conclusion"><h3><Symbol name="document" size={26}/>综合结论</h3><p>{summary}</p><div className="cc-analysis-outcome"><span>智能体综合置信度 <strong>{complete ? `${event.confidence}%` : "待分析"}</strong></span><button onClick={enterDecision} disabled={!complete}>生成方案 · 进入决策中心<Symbol name="arrow" size={16}/></button></div></div>
      </section>

      <section className="cc-panel cc-chat" aria-label="对话式决策助手">
        <header className="cc-panel-head"><h2><b>03</b>对话式决策助手</h2><button className="cc-clear" onClick={() => { if (replyTimer.current) clearTimeout(replyTimer.current); replyTimer.current = null; setMessages([]); inputRef.current?.focus(); }}><Symbol name="clear" size={17}/>清空对话</button></header>
        <div className="cc-messages" ref={messageList} role="log" aria-label="决策对话记录" aria-live="polite">
          {messages.length === 0 && <div className="cc-chat-empty"><Symbol name="bot" size={44}/><strong>开始新的研判对话</strong><p>基于当前仿真场景，询问风险原因、查看设备状态，或选择下方核查问题。</p></div>}
          {messages.map(message => <div className={`cc-message cc-${message.role}`} key={message.id}><div className="cc-message-avatar"><Symbol name={message.role === "user" ? "user" : message.role === "safety" ? "shield" : message.role === "green" ? "leaf" : "bot"} size={26}/></div><div className="cc-message-main"><div className="cc-message-meta"><strong>{message.role === "user" ? "林岳" : message.role === "safety" ? "安全运行智能体" : message.role === "green" ? "绿色增效智能体" : "系统助手（综合结论）"}</strong>{message.time && <time>{message.time}</time>}</div><div className="cc-bubble">{renderReply(message)}</div></div></div>)}
        </div>
        <div className="cc-quick-actions cc-context-questions">{quickQuestions.map(question => <button key={question} disabled={thinking} onClick={() => ask(question)}>{question}</button>)}</div>
        <form className="cc-composer" onSubmit={event => { event.preventDefault(); ask(input); }}><input ref={inputRef} aria-label="向决策助手提问" value={input} onChange={event => setInput(event.target.value)} placeholder="输入问题，获取场景解释、规程或建议…" maxLength={1000}/><button type="submit" aria-label="发送问题" disabled={!input.trim() || thinking}><Symbol name="send" size={26}/></button></form>
      </section>
    </div>
    </section>
    <section id="cc-panel-green" className="cc-tabpanel" role="tabpanel" aria-labelledby="cc-tab-green" hidden={agent !== "green"}><GreenWorkspace go={go} active={agent === "green"}/></section>
    <section id="cc-panel-energy" className="cc-tabpanel" role="tabpanel" aria-labelledby="cc-tab-energy" hidden={agent !== "energy"}><EnergyWorkspace go={go} active={agent === "energy"}/></section>
    {evidence && <EvidenceDrawer initialEvidence={evidence} onClose={() => { setEvidence(null); setHighlightedToken(null); }}/>}
    {detail && <div className="cc-modal-backdrop"><button className="cc-modal-scrim" aria-label="关闭详情背景" onClick={() => setDetail(null)}/><section ref={dialog} className="cc-detail" role="dialog" aria-modal="true" aria-labelledby="cc-detail-title"><button className="cc-detail-close" aria-label="关闭详情" onClick={() => setDetail(null)}><Symbol name="close"/></button><span className="cc-sync">仿真场景 · 证据详情</span><h2 id="cc-detail-title">{detail.title}</h2><p>{detail.description}</p><dl>{detail.rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><div className="cc-detail-actions"><button onClick={() => setDetail(null)}>返回工作台</button>{detail.action && <button onClick={() => { go(detail.action!); setDetail(null); }}>{detail.action === "decision" ? "前往决策中心" : "查看完整证据链"}<Symbol name="arrow" size={18}/></button>}</div></section></div>}
  </div>;
}
