"use client";

import { useEffect, useRef, useState } from "react";

const entries = [
  { id: "overview", title: "运行总览", description: "全局状态、数字孪生与运行任务", keywords: "首页 overview 概览" },
  { id: "units", title: "实时机组", description: "设备参数、系统视图与趋势下载", keywords: "压力 温度 发电机 主泵 P201 P-201 曲线" },
  { id: "agent-safety", title: "安全运行智能体", description: "协同研判、风险解释与对话助手", keywords: "智能体工作台 安全分析 聊天" },
  { id: "agent-green", title: "绿色增效工作台", description: "方案对比、节能收益与调度建议", keywords: "绿色 节能 效率 低碳" },
  { id: "agent-energy", title: "新能源协同调度", description: "源荷预测、储能计划与提交复核", keywords: "新能源 风光 储能 充电" },
  { id: "decision", title: "决策中心", description: "选择方案、修改建议与人工确认", keywords: "统一决策卡 审批 方案 A B C" },
  { id: "simulation", title: "仿真实验室", description: "事故场景、热工水力仿真与操作训练", keywords: "PCTRAN 模拟 工况" },
  { id: "evidence", title: "证据与审计", description: "证据链、完整性核验、导出与归档", keywords: "审计中心 签名 SHA256 来源 快照 复核 日志" },
] as const;
export type NavigationAction = typeof entries[number]["id"];

export default function QuickNavigation({ onClose, onNavigate }: { onClose: () => void; onNavigate: (action: NavigationAction) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = entries.filter(item => words.every(word => `${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(word)));
  const selectedIndex = Math.min(active, Math.max(0, matches.length - 1));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('input, button:not(:disabled)') ?? []).filter(element => element.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus(); };
  }, [onClose]);

  const choose = (id: NavigationAction) => { onClose(); onNavigate(id); };
  return <div className="qn-backdrop">
    <button className="qn-scrim" aria-label="关闭快捷导航背景" onClick={onClose}/>
    <section ref={dialog} className="qn-dialog" role="dialog" aria-modal="true" aria-labelledby="qn-title">
      <header><div><span>核衡智枢 · 快捷入口</span><h2 id="qn-title">想查看什么？</h2></div><button className="qn-close" aria-label="关闭快捷导航" onClick={onClose}>×</button></header>
      <div className="qn-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input ref={input} role="combobox" aria-expanded="true" aria-controls="qn-results" aria-autocomplete="list" aria-activedescendant={matches.length ? `qn-option-${matches[selectedIndex].id}` : undefined} aria-label="搜索页面或功能" value={query} placeholder="搜索审计、机组、储能、历史事件…" onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); if (!matches.length) return;
          const next = (selectedIndex + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
          setActive(next); document.getElementById(`qn-option-${matches[next].id}`)?.scrollIntoView({ block: "nearest" });
        }
        if (event.key === "Enter" && matches.length) { event.preventDefault(); choose(matches[selectedIndex].id); }
      }}/></div>
      <div className="qn-result-label" role="status">{query ? `找到 ${matches.length} 个入口` : "常用页面与功能"}</div>
      <div id="qn-results" className="qn-results" role="listbox" aria-label="功能搜索结果">{matches.map((entry, index) => <button id={`qn-option-${entry.id}`} role="option" aria-selected={selectedIndex === index} tabIndex={-1} key={entry.id} className={selectedIndex === index ? "selected" : ""} onMouseEnter={() => setActive(index)} onClick={() => choose(entry.id)}><span className="qn-number">{String(index+1).padStart(2,"0")}</span><span><strong>{entry.title}</strong><small>{entry.description}</small></span><span className="qn-arrow">↗</span></button>)}</div>
      {!matches.length && <p className="qn-empty">没有找到匹配入口，试试“审计”“机组”或“绿色”。</p>}
      <footer><span>↑ ↓ 选择 · Enter 打开 · Esc 关闭</span><span>⌘ / Ctrl + K</span></footer>
    </section>
  </div>;
}
