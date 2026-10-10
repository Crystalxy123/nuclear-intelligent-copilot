"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GREEN_PLANS, submitGreenPlan } from "@/lib/green-plans";
import { useDecisionRecord, type PlanId } from "@/lib/decision-card";
import GreenDispatchChart from "./GreenDispatchChart";
import AnimatedNumber from "./AnimatedNumber";
import EnergyFlow from "./EnergyFlow";
import { setDemoEventPhase, useDemoEvent } from "@/lib/demo-event";
import "@/app/workbench-interaction.css";
import "@/app/motion-agents-enhanced.css";

type Detail = { title: string; eyebrow: string; description: string; rows?: [string, string][]; steps?: { title: string; text: string }[] };
type Modal = { kind: "detail"; detail: Detail } | { kind: "submit" } | null;

function GreenIcon({ name, size = 24 }: { name: string; size?: number }) {
  const icons: Record<string, ReactNode> = {
    shield: <><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
    leaf: <><path d="M21 3C9 3 3 8 4 15c1 7 12 7 15-3 2-5 2-9 2-9Z"/><path d="M3 22c3-7 9-10 14-15"/></>,
    gear: <><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>,
    wrench: <path d="M21 3a7 7 0 0 1-9 9l-7 8a2 2 0 0 1-3-3l8-7a7 7 0 0 1 9-9l-5 5 4 4Z"/>,
    bars: <><path d="M3 22h20M6 18v-5h3v5M12 18V7h3v11M18 18V2h3v16"/></>,
    pulse: <path d="M2 12h4l3-8 4 16 3-12 3 4h3"/>,
    document: <><path d="M5 2h10l5 5v15H5Z"/><path d="M15 2v6h5M9 12h7M9 16h7"/></>,
    growth: <><path d="M5 3h10l5 5v14H5ZM15 3v5h5"/><path d="m8 17 3-4 3 1 3-4M13 10h4v4"/></>,
    coins: <><path d="M5 7h14v11H5Z"/><path d="M8 4h8v3M8 18v3h8v-3M2 10h3M19 14h3"/><circle cx="12" cy="12" r="3"/></>,
    carbon: <><path d="M6 5h12l2 16H4Z"/><path d="M10 2h4v3M9 11l3-3 3 3M15 14l-1 3h-4M8 16l-2-3 2-2"/></>,
    lightbulb: <><path d="M8 17v-2a7 7 0 1 1 8 0v2ZM9 20h6M10 23h4M12 1V0M2 6l-2-1M22 6l2-1M2 14l-2 1M22 14l2 1"/></>,
    arrow: <path d="M3 12h17m-6-6 6 6-6 6"/>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 6-7"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}
function Heading({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children?: ReactNode }) {
  return <header className="gw-panel-heading"><span className="gw-heading-icon"><GreenIcon name={icon}/></span><div><h2>{title}</h2><p>{subtitle}</p></div>{children}</header>;
}

export default function GreenWorkspace({ go, active = true }: { go: (view: "decision" | "evidence") => void; active?: boolean }) {
  const record = useDecisionRecord();
  const event = useDemoEvent();
  const [selected, setSelected] = useState<PlanId>(event.recommendedPlan);
  const [windowActive, setWindowActive] = useState(false);
  const [range, setRange] = useState<"day" | "midday" | "evening">("day");
  const [modal, setModal] = useState<Modal>(null);
  const dialog = useRef<HTMLElement>(null);
  const standardPlan = GREEN_PLANS.find(item => item.id === selected)!;
  const plan = selected === "B" && !windowActive ? { ...standardPlan, savings: 0, renewable: 0, benefit: 0, carbon: 0 } : standardPlan;
  const isOpen = modal !== null;

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setModal(null); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]') ?? []);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, [isOpen]);

  const openDetail = (detail: Detail) => setModal({ kind: "detail", detail });
  const showConstraints = () => openDetail({ title: "安全约束条件", eyebrow: `方案 ${selected} · 执行前核查`, description: "当前方案在仿真场景的约束范围内。以下条件共同构成运行调整的前提，提交后仍需值长审核。", rows: [["安全边界", "压力、温度、流量保持在场景设定的安全范围内"], ["设备状态", "复核 P-201 就地振动、泵组效率及出口阀门反馈"], ["运行裕度", "保留备用能力，避免增加设备的频繁启停"], ["负荷调节", "在批准的调节范围内平滑负荷变化"], ["审核要求", "完成设备核查、值长确认后再进行执行验证"], ["评估来源", "本地仿真场景 · 预设安全评估摘要"]] });
  const showSources = () => openDetail({ title: "增效建议溯源", eyebrow: "同源数据 · 多维证据", description: `方案 ${selected} 的建议由当前场景快照、方案评分与约束摘要共同组织。功率曲线和收益为演示场景预设。`, rows: [["运行数据", "HTGR-1 / HTGR-2 与新能源出力的 24 小时场景曲线"], ["设备证据", "P-201 压力趋势与 A317 / A320 / A322 关联报警"], ["规程摘要", "OP-12 § 4.3：测点复核、设备核查、持续监测、人工审核"], ["历史参考", "Event #021 · 模式相似度 82%"], ["价值口径", "相对当前运行策略的预期变化；未计入实际执行结果"]] });
  const showMetric = (metric: "energy" | "renewable" | "benefit" | "carbon") => {
    const details = {
      energy: { title: "辅机能耗变化", value: `${plan.savings ? "−" : ""}${plan.savings.toFixed(1)}%`, note: "相对当前辅机运行策略的场景预估，不代表机组净输出功率变化。" },
      renewable: { title: "新能源消纳", value: `+${plan.renewable} MWh`, note: selected === "B" && windowActive ? "14:00—18:00 窗口内，先爬升、后保持、再回落的黄色增纳曲线积分为 18 MWh；不表示全窗口持续 6 MW。" : "该方案未安排额外消纳窗口，维持基础消纳计划。" },
      benefit: { title: "综合收益", value: `+¥ ${plan.benefit.toFixed(1)} 万/日`, note: "综合节能与消纳收益的场景预估值，实际收益需结合执行结果及结算口径复核。" },
      carbon: { title: "预计减排", value: `${plan.carbon.toFixed(1)} tCO₂e`, note: "按本地场景预设的日减排量展示，尚未接入经核验的排放因子与实际计量数据。" },
    }[metric];
    openDetail({ title: `方案 ${selected} · ${details.title}`, eyebrow: "绿色价值测算 · 24 小时", description: details.note, rows: [["当前方案", `${plan.id} · ${plan.title}`], ["预期变化", details.value], ["比较基准", "当前运行策略"], ["数据状态", "仿真场景预估 · 待执行验证"]] });
  };
  const showRecommendation = () => openDetail({ title: `方案 ${selected} · 详细增效建议`, eyebrow: "绿色增效智能体 · 建议草案", description: `${plan.title}。以下建议依据当前选定方案生成，加入决策卡后进入人工审核。`, steps: [{ title: "核查前提", text: "先复核 P-201 的压力趋势、就地振动和阀门反馈，确认当前约束与设备状态。" }, ...plan.advice.map((text, index) => ({ title: ["运行调整", "调度安排", "持续评估"][index], text })), { title: "审核与验证", text: "由值长审核本方案，执行后对比能耗、消纳量及关键参数，再形成验证记录。" }] });
  const addPlan = () => {
    if (record.status !== "waiting" || record.adjustments[selected]) { setModal({ kind: "submit" }); return; }
    submitGreenPlan(selected, windowActive); setDemoEventPhase("human-review"); go("decision");
  };
  const confirmSubmission = () => { submitGreenPlan(selected, windowActive); setDemoEventPhase("human-review"); setModal(null); go("decision"); };

  return <div className="gw-workspace" data-active={active} data-window-active={windowActive}>
    <div className="gw-top-grid">
      <section className="gw-panel gw-comparison" aria-label="方案对比">
        <Heading icon="bars" title="安全前提下的方案比较" subtitle="基于多目标优化与安全约束的综合评估结果"><small>单位：评分（0–100）</small></Heading>
        <div className="gw-table-scroll"><table className="gw-score-table"><caption className="sr-only">方案 A、B、C 在安全性、运行效率、设备寿命、绿色效益和经济性上的评分比较</caption><thead><tr><th scope="col">评价指标</th>{GREEN_PLANS.map(item => <th scope="col" key={item.id} className={selected === item.id ? "gw-selected" : ""}><button className="gw-plan-choice" aria-label={`选择方案 ${item.id}：${item.shortTitle}`} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}><strong>方案 {item.id}</strong><span>{item.shortTitle}</span>{item.id === event.recommendedPlan && <em>建议</em>}</button></th>)}</tr></thead><tbody>{[{label:"安全性",icon:"shield"},{label:"运行效率",icon:"gear"},{label:"设备寿命",icon:"wrench"},{label:"绿色效益",icon:"leaf"},{label:"经济性",icon:"bars"}].map((metric,index) => <tr key={metric.label}><th scope="row"><GreenIcon name={metric.icon}/><span>{metric.label}</span></th>{GREEN_PLANS.map(item => <td key={item.id} className={selected === item.id ? "gw-selected" : ""}><div className="gw-score-cell"><div className="gw-bar" aria-hidden="true"><i style={{width:`${item.scores[index]}%`}}/></div><span>{item.scores[index]}</span></div></td>)}</tr>)}</tbody></table></div>
      </section>
      <section className="gw-panel gw-impact" aria-label={`方案 ${selected} 预期价值`}>
        <Heading icon="bars" title={`方案 ${selected} 预期价值`} subtitle="在保证安全的前提下，实现能效提升与绿色低碳的多重收益"/>
        <div className="gw-window-status" role="status">{windowActive ? "新能源出力窗口已选中 · 14:00–18:00" : "尚未选择新能源窗口 · 可点击下方曲线评估"}</div><div className="gw-impact-visual"><button className="gw-energy-orbit" aria-label={`查看辅机能耗变化 ${plan.savings}%`} onClick={() => showMetric("energy")}><svg className="gw-orbit-rings" viewBox="0 0 230 230" aria-hidden="true"><defs><linearGradient id="gw-orbit-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#74ffdb"/><stop offset=".5" stopColor="#00d8ee"/><stop offset="1" stopColor="#006ba6"/></linearGradient></defs><circle className="gw-ring-outer" cx="115" cy="115" r="112"/><circle cx="115" cy="115" r="101"/><circle className="gw-ring-light" cx="115" cy="115" r="96"/><circle className="gw-ring-dash" cx="115" cy="115" r="86"/><path className="gw-ring-ticks" d="M115 13v7M115 210v7M13 115h7M210 115h7"/><circle className="gw-orbit-traveler" cx="115" cy="115" r="96" pathLength="100"/></svg><div className="gw-orbit-value"><GreenIcon name="leaf" size={31}/><strong>{active ? <AnimatedNumber value={plan.savings} digits={1} prefix={plan.savings ? "−" : ""} suffix="%" firstFromZero identity="green-energy" duration={400}/> : `${plan.savings.toFixed(1)}%`}</strong><span>辅机能耗</span></div></button><div className="gw-impact-metrics"><button onClick={() => showMetric("renewable")}><span key={`${selected}-${windowActive}`} className="gw-metric-icon"><GreenIcon name="growth"/></span><div><strong>+{active ? <AnimatedNumber value={plan.renewable} firstFromZero identity="green-renewable" duration={400} delay={150}/> : plan.renewable} <small>MWh</small></strong><span>新能源消纳</span></div></button><button onClick={() => showMetric("benefit")}><span key={`${selected}-${windowActive}`} className="gw-metric-icon"><GreenIcon name="coins"/></span><div><strong>+¥{active ? <AnimatedNumber value={plan.benefit} digits={1} firstFromZero identity="green-benefit" duration={400} delay={300}/> : plan.benefit.toFixed(1)} <small>万/日</small></strong><span>综合收益</span></div></button><button onClick={() => showMetric("carbon")}><span key={`${selected}-${windowActive}`} className="gw-metric-icon"><GreenIcon name="carbon"/></span><div><strong>{active ? <AnimatedNumber value={plan.carbon} digits={1} firstFromZero identity="green-carbon" duration={400} delay={450}/> : plan.carbon.toFixed(1)} <small>tCO₂e</small></strong><span>预计减排</span></div></button></div></div>
        <button className="gw-constraint-banner" onClick={showConstraints}><GreenIcon name="shield" size={29}/><div><strong>安全约束已满足</strong><p>当前方案在所有安全约束范围内运行</p></div><GreenIcon name="check" size={22}/></button>
        <button className="gw-primary gw-add-plan" onClick={addPlan}>加入决策卡<GreenIcon name="arrow" size={19}/></button>
      </section>
    </div>
    <div className="gw-bottom-grid">
      <section className="gw-panel gw-dispatch" aria-label="系统功率与调度建议"><Heading icon="pulse" title="系统功率与调度建议" subtitle="基于当前负荷与新能源出力的优化调度建议"><label className="gw-range-label"><span className="sr-only">调度时间范围</span><select value={range} onChange={event => setRange(event.target.value as typeof range)}><option value="day">今日（00:00 - 24:00）</option><option value="midday">午间（08:00 - 18:00）</option><option value="evening">晚间（16:00 - 24:00）</option></select></label></Heading><GreenDispatchChart planId={selected} range={range} windowActive={windowActive} onWindowChange={setWindowActive} active={active}/></section>
      <section className="gw-panel gw-advice" aria-label="增效逻辑与建议动作"><Heading icon="lightbulb" title="增效逻辑与建议动作" subtitle="基于数据分析与专家经验的智能建议"><button className="gw-text-button" onClick={showSources}>更多溯源<GreenIcon name="arrow" size={14}/></button></Heading><ol className="gw-advice-list">{plan.advice.map((text,index) => <li key={text}><span>{String(index+1).padStart(2,"0")}</span><p>{text}</p></li>)}</ol><EnergyFlow optimized={windowActive}/><div className="gw-actions"><button onClick={showRecommendation}><GreenIcon name="document" size={21}/><span>生成详细建议</span></button><button onClick={showConstraints}><GreenIcon name="shield" size={21}/><span>查看约束条件</span></button><button className="gw-primary" onClick={addPlan}><GreenIcon name="send" size={23}/><span>加入决策卡</span><GreenIcon name="arrow" size={18}/></button></div></section>
    </div>
    {modal && <div className="gw-modal-backdrop"><button className="gw-modal-scrim" aria-label="关闭绿色增效详情背景" onClick={() => setModal(null)}/><section ref={dialog} className="gw-dialog" role="dialog" aria-modal="true" aria-labelledby="gw-dialog-title"><header><div><small>{modal.kind === "detail" ? modal.detail.eyebrow : "绿色增效工作台 · 提交审核"}</small><h2 id="gw-dialog-title">{modal.kind === "detail" ? modal.detail.title : `将方案 ${selected} 加入决策卡`}</h2></div><button className="gw-close" aria-label="关闭绿色增效详情" onClick={() => setModal(null)}><GreenIcon name="close"/></button></header><div className="gw-dialog-content">{modal.kind === "detail" ? <><p>{modal.detail.description}</p>{modal.detail.rows && <dl className="gw-detail-list">{modal.detail.rows.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{modal.detail.steps && <ol className="gw-detail-steps">{modal.detail.steps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>}</> : <><p>将方案 {selected}「{plan.title}」{selected === "B" ? windowActive ? "（含新能源窗口）" : "（未启用新能源窗口，收益待重新评估）" : ""}作为新的修订提交，决策卡恢复待人工确认状态。之前的审核记录继续保留。</p>{record.adjustments[selected] && <p className="gw-submit-note">此方案已有人工修改，本次提交将采用工作台的标准建议替换该方案的修改内容。</p>}<dl className="gw-detail-list"><div><dt>当前审核状态</dt><dd>{record.status === "approved" ? "已确认" : record.status === "rejected" ? "已驳回" : "待人工确认"}</dd></div><div><dt>新增修订</dt><dd>第 {record.revision + 1} 版 · 方案 {selected}</dd></div><div><dt>提交后</dt><dd>前往决策中心，等待人工审核</dd></div></dl></>}</div><footer className="gw-dialog-actions"><button onClick={() => setModal(null)}>{modal.kind === "detail" ? "返回工作台" : "取消"}</button>{modal.kind === "submit" && <button className="gw-primary" onClick={confirmSubmission}>重新提交审核<GreenIcon name="arrow" size={17}/></button>}</footer></section></div>}
  </div>;
}
