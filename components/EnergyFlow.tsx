"use client";

/** Two SVG flow paths, bounded to the energy diagram; no business timers. */
export default function EnergyFlow({ optimized = false }: { optimized?: boolean }) {
  return <div className="energy-flow-diagram" data-optimized={optimized} role="img" aria-label={`核电与新能源协同输送至电网，${optimized ? "14:00 至 18:00 新能源增纳窗口已启用" : "维持基础出力计划"}`}>
    <div className="energy-flow-source energy-flow-nuclear"><span>◈</span><div><strong>核电</strong><small>Nuclear</small></div></div>
    <svg viewBox="0 0 260 70" preserveAspectRatio="none" aria-hidden="true"><path className="energy-flow-base" d="M0 16H60Q86 16 105 35H155Q174 16 198 16H260"/><path className="energy-flow-base" d="M0 55H60Q86 55 105 35H155Q174 55 198 55H260"/><path className="energy-flow-stream energy-flow-primary" d="M0 16H60Q86 16 105 35H155" pathLength="100"/><path className="energy-flow-stream energy-flow-renewable" d="M260 55H198Q174 55 155 35H105" pathLength="100"/></svg>
    <div className="energy-flow-grid"><span>▦</span><div><strong>电网</strong><small>Grid</small></div></div>
    <div className="energy-flow-source energy-flow-green"><span>↗</span><div><strong>新能源</strong><small>Renewable</small></div></div>
  </div>;
}
