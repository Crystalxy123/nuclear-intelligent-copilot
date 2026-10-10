"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import MotionLifecycle from "@/components/MotionLifecycle";
import DemoPlaybackControls from "@/components/DemoPlaybackControls";
import AnimatedNumber from "@/components/AnimatedNumber";
import PctranSimulator from "@/components/PctranSimulator";
import CommandCenter from "@/components/CommandCenter";
import DecisionCenter from "@/components/DecisionCenter";
import EvidenceAudit from "@/components/EvidenceAudit";
import RealtimeUnits from "@/components/RealtimeUnits";
import { getDecisionRecord, useDecisionRecord } from "@/lib/decision-card";
import { useDemoMotion } from "@/lib/use-demo-motion";
import { recordAuditAccess } from "@/lib/evidence-audit";
import EventContextBar from "@/components/EventContextBar";
import { disposeDemoEventTimers, useDemoEvent } from "@/lib/demo-event";
import QuickNavigation, { type NavigationAction } from "@/components/QuickNavigation";
import OverviewDashboard, { OverviewSidebarStatus } from "@/components/OverviewDashboard";

type View = "overview" | "units" | "copilots" | "analysis" | "decision" | "simulation" | "evidence";

const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const paths: Record<string, React.ReactNode> = {
    overview: <><path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-8h6v8"/></>,
    plant: <><path d="M4 13h3v8H4ZM11 8h3v13h-3ZM18 3h3v18h-3Z"/></>,
    copilot: <><rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M1 12v4M23 12v4M8 12v2M16 12v2M9 17h6"/><circle cx="12" cy="3" r="1"/></>,
    decision: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 2 2 5-5M8 16h8"/></>,
    simulation: <><path d="m7 4 13 8-13 8Z"/><path d="M3 4v16"/></>,
    evidence: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M8 11h6M11 8v6"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
    shield: <><path d="M12 22S20 18 20 10V5l-8-3-8 3v5c0 8 8 12 8 12Z"/><path d="m9 12 2 2 4-5"/></>,
    leaf: <><path d="M20 4S9 3 5 10c-3 5 1 9 4 9 7 0 10-9 11-15Z"/><path d="M4 21c4-6 8-9 13-12"/></>,
    energy: <><path d="m13 2-9 12h7l-1 8 10-13h-7Z"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const Badge = ({ children, tone = "cyan" }: { children: React.ReactNode; tone?: string }) => <span className={`badge ${tone}`}>{children}</span>;

const PanelTitle = ({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) => <div className="panel-title"><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>;

const agents = [
  { key: "safety", icon: "shield", name: "安全运行智能体", en: "安全分析", status: "分析中", tone: "cyan", text: "P-201 出口压力持续下降，正在复核运行边界。", progress: 74 },
  { key: "green", icon: "leaf", name: "绿色增效智能体", en: "能效分析", status: "就绪", tone: "purple", text: "辅机功率存在调整空间，预计可降低 3.4% 能耗。", progress: 100 },
  { key: "energy", icon: "energy", name: "新能源协同智能体", en: "协同分析", status: "就绪", tone: "lime", text: "13:00 至 16:00 可能出现新能源消纳窗口。", progress: 100 },
];

const subscribeToClock = (onChange: () => void) => {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
};
const readClock = () => Math.floor(Date.now() / 1000);
const serverClock = () => null;

function Topbar({ onDecision, onAlarm, overview = false, motion, onSearch }: { onSearch: () => void; onDecision: () => void; onAlarm: () => void; overview?: boolean; motion: ReturnType<typeof useDemoMotion> }) {
  const event = useDemoEvent();
  const timestamp = useSyncExternalStore(subscribeToClock, readClock, serverClock);
  const now = timestamp === null ? null : new Date(timestamp * 1000);
  const [plant, setPlant] = useState(0);
  const [plantMenu, setPlantMenu] = useState(false);
  const demoPlants = [
    { name: "星澜核能仿真基地", unit: "S-01 仿真机组" },
    { name: "海岬清源能源站", unit: "H-02 仿真机组" },
    { name: "北辰零碳示范中心", unit: "B-01 仿真机组" },
  ];
  return <header className="topbar">
    <div className="plant-picker"><button className="unit-select" onClick={() => setPlantMenu(!plantMenu)}><span className={overview ? "ov-scene-cube" : "pulse-dot"}>{overview && <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7Z" fill="#00d9f0"/><path d="m3 7 9 5 9-5M12 12v10" stroke="#8df8ff" strokeWidth="1.3"/></svg>}</span><div><small>当前虚构场景</small><strong key={plant} className="motion-scene-name">{demoPlants[plant].name} · {overview ? demoPlants[plant].unit.split(" ")[0] : demoPlants[plant].unit}</strong></div><span className="chev">⌄</span></button>{plantMenu && <div className="plant-menu"><span>选择仿真场景</span>{demoPlants.map((item, index) => <button key={item.name} className={plant === index ? "active" : ""} onClick={() => { setPlant(index); setPlantMenu(false); }}><i/><div><strong>{item.name}</strong><small>{item.unit} · 非真实电厂</small></div>{plant === index && <Icon name="check" size={14}/>}</button>)}</div>}</div>
    <div className="top-state"><Badge tone="green"><span className="mini-dot"/> {overview ? "仿真运行中" : "仿真在线"}</Badge><span className="safe-days">安全运行 <b>1,286</b> 仿真日{overview && <small>已连续稳定运行 320 小时</small>}</span></div>
    <div className="top-actions"><button className="qn-trigger" aria-label="搜索页面与功能" title="搜索页面与功能（⌘ / Ctrl + K）" onClick={onSearch}><Icon name="evidence" size={16}/><span>快捷搜索</span><kbd>⌘ K</kbd></button><button className="demo-motion-toggle" aria-label={motion.reduced ? "系统已启用减少动态效果" : motion.enabled ? "暂停页面动画" : "开启页面动画"} aria-pressed={motion.enabled} disabled={motion.reduced} title={motion.reduced ? "跟随系统减少动态效果设置" : "切换页面动效，不影响仿真数据运行"} onClick={motion.toggle}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 17V9"/><path d="M12 17V4"/><path d="M19 17V7"/></svg><span>动效{motion.enabled ? "开" : "关"}</span></button><button className="icon-btn" aria-label={`事件告警 ${event.alarmCount} 条，查看${event.alarmTriggered ? "异常事件" : "决策中心"}`} onClick={event.alarmTriggered ? onAlarm : onDecision}><Icon name="bell"/>{<i><AnimatedNumber value={event.alarmCount} duration={300}/></i>}</button><div className="clock"><strong>{now?.toLocaleTimeString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" }) ?? "--:--:--"}</strong><small>{now?.toLocaleDateString("zh-CN", {year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Shanghai"}).replaceAll("/",".") ?? "----.--.--"}</small></div><div className="avatar">林</div><div className="operator"><strong>林岳</strong><small>值长 · 决策权限</small></div></div>
  </header>;
}

function Sidebar({ view, setView, pendingDecisions = 1 }: { view: View; setView: (v: View) => void; pendingDecisions?: number }) {
  const nav = [
    ["overview", "overview", "运行总览"], ["units", "plant", "实时机组"], ["copilots", "copilot", "智能体工作台"], ["decision", "decision", "决策中心"], ["simulation", "simulation", "仿真实验室"], ["evidence", "evidence", "证据与审计"]
  ] as [View,string,string][];
  const navRef = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState({ top: 0, left: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    const update = () => {
      const nav = navRef.current;
      const active = nav?.querySelector<HTMLButtonElement>('button[aria-current="page"]');
      if (!nav || !active) return;
      const box = active.getBoundingClientRect(), parent = nav.getBoundingClientRect();
      setHighlight({ top: box.top - parent.top, left: box.left - parent.left, width: box.width, height: box.height });
    };
    update();
    const observer = new ResizeObserver(update);
    if (navRef.current) observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [view]);
  return <aside className="sidebar">
    <button className="brand" onClick={() => setView("overview")}><span className="brand-mark"><span/><span/><span/></span><div><strong>核衡智枢</strong><small>{view === "overview" ? "核电智能运行决策系统" : "运行决策支持系统"}</small></div></button>
    <nav className="motion-navigation" ref={navRef} aria-label="主导航"><span className="motion-nav-highlight" aria-hidden="true" style={{transform:`translate(${highlight.left}px,${highlight.top}px)`,width:highlight.width,height:highlight.height,opacity:highlight.height?1:0}}/>{nav.map(([target, icon, label], i) => <button key={`${icon}-${i}`} title={label} aria-current={view === target || (view === "analysis" && target === "copilots") ? "page" : undefined} className={view === target || (view === "analysis" && target === "copilots") ? "active" : ""} onClick={() => setView(target)}><Icon name={icon}/><span>{label}</span>{label === "决策中心" && pendingDecisions > 0 && <em>{pendingDecisions}</em>}</button>)}</nav>
    {view === "overview" && <OverviewSidebarStatus/>}
    {view === "decision" && <div className="dc-sidebar-art" aria-hidden="true"/>}
    <div className="side-foot"><div className="system-health"><span><i/>系统健康度</span><strong><AnimatedNumber value={98.7} digits={1} firstFromZero identity="sidebar-health" duration={800}/>%</strong><div><b style={{width:"98.7%"}}/></div></div><small>版本 1.0.0 · 仿真环境</small></div>
  </aside>;
}

function ForecastChart() {
  return <div className="forecast-chart"><div className="chart-y"><span>1,400</span><span>1,000</span><span>600</span><span>200</span></div><div className="chart-area"><div className="window"><span>协同窗口</span></div><svg viewBox="0 0 700 210" preserveAspectRatio="none"><defs><linearGradient id="solar" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c8f35d" stopOpacity=".3"/><stop offset="1" stopColor="#c8f35d" stopOpacity="0"/></linearGradient></defs><path d="M0 80 C90 74 130 84 210 78 S350 76 440 80 570 74 700 77" fill="none" stroke="#8da9ae" strokeWidth="2"/><path d="M0 150 C100 151 160 140 235 116 S330 52 400 46 515 83 575 124 660 151 700 150 V210 H0Z" fill="url(#solar)"/><path d="M0 150 C100 151 160 140 235 116 S330 52 400 46 515 83 575 124 660 151 700 150" fill="none" stroke="#c8f35d" strokeWidth="2.5"/><path d="M0 132 C80 105 130 148 210 128 S310 142 390 119 520 141 590 116 655 131 700 110" fill="none" stroke="#64e6ed" strokeWidth="2" strokeDasharray="5 4"/><path d="M0 92 H700" fill="none" stroke="#ae6cff" strokeWidth="2"/></svg><div className="chart-x"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div></div></div>;
}

function Copilots({ go }: { go: (v: View) => void }) {
  const [tab,setTab] = useState<"safety"|"green"|"energy">("safety");
  return <div className="page-view"><div className="page-heading"><div><Badge>运行数据已同步</Badge><h1>智能体工作台</h1><p>三个智能体使用同一组机组数据，安全分析结果是其他方案的前置约束。</p></div><button className="primary-btn" onClick={()=>go("decision")}>查看决策卡 <Icon name="arrow" size={15}/></button></div><div className="tabbar">{agents.map(a=><button key={a.key} className={tab===a.key?`active ${a.tone}`:""} onClick={()=>setTab(a.key as typeof tab)}><Icon name={a.icon}/><span>{a.name}<small>{a.en}</small></span><Badge tone={a.tone}>{a.status}</Badge></button>)}</div>
  {tab==="safety" && <div className="workspace-grid"><section className="panel situation"><PanelTitle eyebrow="SITUATION" title="当前态势"/><div className="risk-orbit"><strong>中低</strong><span>风险等级</span></div><h3>主泵效率下降趋势</h3><p>过去 180 秒内，P-201 出口压力持续下降，同时出现 3 条相关报警。</p><div className="status-ladder"><span className="done">正常</span><i/><span className="done">偏离</span><i/><span className="active">警告</span><i/><span>风险</span></div><dl><div><dt>模型置信度</dt><dd>91%</dd></div><div><dt>安全裕度</dt><dd>充足</dd></div><div><dt>数据完整性</dt><dd>98.7%</dd></div></dl></section><section className="panel evidence-graph"><PanelTitle eyebrow="EVIDENCE GRAPH" title="证据关联图"/><div className="graph"><div className="g-node core">风险判断<small>中低风险</small></div><div className="g-node n1">压力 P101<small>↓ 4.3%</small></div><div className="g-node n2">报警 A317<small>已触发</small></div><div className="g-node n3">泵组 P-201<small>健康度 82.6%</small></div><div className="g-node n4">规程 OP-12<small>§ 4.3</small></div><div className="g-node n5">历史事件 #021<small>相似度 82%</small></div><span className="edge e1"/><span className="edge e2"/><span className="edge e3"/><span className="edge e4"/><span className="edge e5"/></div></section><section className="panel explanation"><PanelTitle eyebrow="EXPLAINABILITY" title="风险解释"/><Badge tone="green"><Icon name="shield" size={13}/> 安全边界未触及</Badge><h3>为什么判定为中低风险？</h3><p>压力下降趋势已超过正常波动范围，但关键参数仍处于 OP-12 规定的可运行区间。继续恶化的概率为 27%，建议加强监测并安排设备核查。</p><h4>建议核查</h4><div className="check-item"><Icon name="check" size={14}/> 确认 P-201 就地振动数据</div><div className="check-item"><Icon name="check" size={14}/> 检查出口阀门反馈状态</div><div className="check-item"><Icon name="check" size={14}/> 进入 OP-12 §4.3 核查流程</div><div className="evidence-tags"><Badge>参数 P101</Badge><Badge tone="amber">报警 A317</Badge><Badge tone="purple">OP-12 §4.3</Badge></div></section></div>}
  {tab==="green" && <div className="workspace-grid wide"><section className="panel comparison"><PanelTitle eyebrow="方案评分" title="安全前提下的方案比较"/><div className="comparison-head"><span>评价指标</span><b>方案 A<small>加强监测</small></b><b className="recommended">方案 B<small>调整策略并核查</small><em>建议</em></b><b>方案 C<small>保守运行</small></b></div>{[["安全性",95,98,100],["运行效率",82,91,68],["设备寿命",80,90,97],["绿色效益",77,92,63],["经济性",74,89,60]].map(row=><div className="compare-row" key={row[0]}><strong>{row[0]}</strong>{row.slice(1).map((v,i)=><div key={i}><i style={{width:`${v}%`}}/><span>{v}</span></div>)}</div>)}</section><section className="panel value-card"><PanelTitle eyebrow="测算结果" title="方案 B 预期价值"/><div className="value-big"><strong>-3.4%</strong><span>辅机能耗</span></div><div className="value-list"><div><strong>+18 <small>MWh</small></strong><span>新能源消纳</span></div><div><strong>+¥ 4.8<small>万/日</small></strong><span>综合收益</span></div><div><strong>9.6 <small>tCO₂e</small></strong><span>预计减排</span></div></div><button className="primary-btn" onClick={()=>go("decision")}>加入决策卡 <Icon name="arrow" size={15}/></button></section></div>}
  {tab==="energy" && <div className="workspace-grid wide"><section className="panel energy-forecast"><PanelTitle eyebrow="未来 24 小时" title="核电、风光与负荷预测" action={<div className="legend"><span className="load">负荷</span><span className="solar">光伏</span><span className="wind">风电</span><span className="nuclear">核电</span></div>}/><ForecastChart/></section><section className="panel opportunity"><Badge tone="lime">可协同时段</Badge><h2>13:00 至 16:00</h2><h3>预计出现新能源富余</h3><p>光伏与风电合计出力将超过局部负荷需求，预计有 86 MWh 的消纳压力。</p><div className="opportunity-score"><span>协同价值</span><strong>92<small>/100</small></strong></div><ul><li>保持核电机组稳定基荷</li><li>优化循环水泵组合</li><li>安排 18 MWh 储能充电</li></ul></section></div>}
  </div>;
}

function Simulation() {
  return <PctranSimulator/>;
}

export default function Home() {
  const motion = useDemoMotion();
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (!searchOpen && document.querySelector('[role="dialog"], dialog[open]')) return;
      event.preventDefault(); setSearchOpen(value => !value);
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, [searchOpen]);
  const decisionRecord = useDecisionRecord();
  const pendingDecisions = decisionRecord.status === "waiting" ? 1 : 0;
  const [view, setView] = useState<View>("overview");
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); disposeDemoEventTimers(); }, []);
  const [agentEntry, setAgentEntry] = useState<"safety" | "green" | "energy">("safety");
  const [agentEntrySequence, setAgentEntrySequence] = useState(0);
  const navigate = (target: View) => {
    const names: Record<View, string> = { overview: "运行总览", units: "实时机组", copilots: "智能体工作台", analysis: "协同分析", decision: "决策中心", simulation: "仿真实验室", evidence: "证据与审计" };
    recordAuditAccess(names[target], getDecisionRecord());
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (target === view || !motion.running) { setTransitioning(false); setView(target); window.scrollTo({ top: 0, behavior: "instant" }); return; }
    setTransitioning(true);
    transitionTimer.current = setTimeout(() => { setView(target); setTransitioning(false); window.scrollTo({ top: 0, behavior: "instant" }); }, 160);
  };
  const openAgent = (agent: "safety" | "green" | "energy") => { recordAuditAccess({ safety: "安全运行工作台", green: "绿色增效工作台", energy: "新能源协同工作台" }[agent], getDecisionRecord()); setAgentEntrySequence(value => value + 1); setAgentEntry(agent); navigate("copilots"); };
  const onQuickNavigate = (action: NavigationAction) => {
    if (action.startsWith("agent-")) openAgent(action.slice(6) as "safety" | "green" | "energy");
    else navigate(action as View);
  };
  const content = {
    overview: <OverviewDashboard go={navigate} onOpenAgent={openAgent} pendingDecisions={pendingDecisions}/>,
    units: <RealtimeUnits go={navigate} onOpenAgent={openAgent}/>,
    copilots: <CommandCenter key={`${agentEntry}-${agentEntrySequence}`} initialAgent={agentEntry} go={navigate}/>,
    analysis: <Copilots go={navigate}/>,
    decision: <DecisionCenter onApproved={() => navigate("evidence")}/>, simulation: <Simulation/>, evidence: <EvidenceAudit go={navigate}/>
  }[view];
  return <div data-motion={motion.running ? "running" : "paused"} className={`app-shell ${view === "copilots" ? "command-mode" : view === "overview" ? "overview-mode" : view === "simulation" ? "simulation-mode" : view === "decision" ? "decision-mode" : view === "units" ? "units-mode" : view === "evidence" ? "evidence-mode" : ""}`}><MotionLifecycle/><Sidebar view={view} setView={navigate} pendingDecisions={pendingDecisions}/><div className="main-shell"><Topbar onSearch={() => setSearchOpen(true)} motion={motion} overview={view === "overview"} onAlarm={() => navigate("units")} onDecision={() => navigate("decision")}/><EventContextBar compact={view === "decision" || view === "evidence"} onOpen={() => navigate("evidence")}/><DemoPlaybackControls onNavigate={target => target === "copilots" ? openAgent("safety") : navigate(target)}/><main className="main-content" data-transition={transitioning ? "exiting" : "steady"} key={view}>{content}</main></div>{searchOpen && <QuickNavigation onClose={() => setSearchOpen(false)} onNavigate={onQuickNavigate}/>}</div>;
}
