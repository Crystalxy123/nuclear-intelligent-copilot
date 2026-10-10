"use client";

import { useEffect, useRef } from "react";
import { UNIT_EQUIPMENT, type UnitEquipmentId, type UnitSnapshot } from "@/lib/unit-demo";
import AnimatedNumber from "./AnimatedNumber";
import { useDemoEvent } from "@/lib/demo-event";

type Props = {
  equipmentId: UnitEquipmentId;
  snapshot: UnitSnapshot;
  onClose: () => void;
  onSelect: (equipmentId: UnitEquipmentId) => void;
  onTriggerAlarm: () => void;
  onTrend: () => void;
  onAnalyze: () => void;
};

export default function EquipmentDrawer({ equipmentId, snapshot, onClose, onSelect, onTriggerAlarm, onTrend, onAnalyze }: Props) {
  const event = useDemoEvent();
  const drawer = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  const device = UNIT_EQUIPMENT.find(item => item.id === equipmentId)!;
  const isPump = equipmentId === "pump";
  const alerted = isPump && event.alarmTriggered;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape") { key.preventDefault(); close.current(); return; }
      if (key.key !== "Tab") return;
      const controls = Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, textarea, [tabindex="0"]') ?? []);
      if (key.shiftKey && document.activeElement === controls[0]) { key.preventDefault(); controls.at(-1)?.focus(); }
      if (!key.shiftKey && document.activeElement === controls.at(-1)) { key.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="eq-drawer-backdrop">
    <button className="eq-drawer-scrim" aria-label="关闭设备详情背景" onClick={onClose}/>
    <aside className="eq-drawer" ref={drawer} role="dialog" aria-modal="true" aria-labelledby="eq-drawer-title">
      <header><div><small>S-01 / 设备详情</small><h2 id="eq-drawer-title">{device.label}</h2></div><button onClick={onClose} aria-label="关闭设备详情">×</button></header>
      <div className="eq-drawer-body">
        <div className={`eq-device-status ${alerted ? "is-alert" : ""}`}><span aria-hidden="true">{alerted ? "△" : "✓"}</span><div><strong>{alerted ? "运行中 · 需核查" : "运行中 · 状态平稳"}</strong><small>{alerted ? `${event.eventId} · ${event.alarmId} 振动报警` : "设备保持当前演示工况"}</small></div></div>
        <p>{device.description}</p>
        <dl>{device.metrics.map(metric => <div key={metric.key}><dt>{metric.label}</dt><dd><AnimatedNumber value={snapshot[metric.key]} digits={metric.precision}/> <small>{metric.unit}</small></dd></div>)}{isPump && <div><dt>当前风险</dt><dd>{event.riskLevel === "medium-low" ? "中低" : "低"}{event.alarmTriggered && event.analysisStage !== "complete" && <small> · 待协同分析</small>}</dd></div>}</dl>
        {isPump && <section className="eq-event-detail"><h3>{event.eventId} · {event.parameterId}</h3><p>{event.alarmTriggered ? "过去 180 秒出口压力下降 4.3%，关联振动报警 A317。需要综合温度、流量与设备反馈进行核查。" : "模拟主泵出口压力持续下降，观察趋势、报警和协同分析如何联动。"}</p><div><span>初始压力 <b>4.50 MPa</b></span><span>历史相似度 <b>{event.similarity}%</b></span></div>{event.alarmTriggered ? <button className="eq-link" onClick={onTrend}>查看 P101 趋势与 A317 标记 →</button> : <button className="eq-trigger" onClick={onTriggerAlarm}>模拟 P-201 异常</button>}</section>}
        <section className="eq-related"><h3>关联设备</h3><div>{device.related.map(id => <button key={id} onClick={() => onSelect(id)}>{UNIT_EQUIPMENT.find(item => item.id === id)!.label}<span>→</span></button>)}</div></section>
        <p className="eq-demo-note">本地场景数据 · 未连接现场设备控制。关闭后保留当前机组视图。</p>
      </div>
      <footer><button onClick={onClose}>返回机组</button>{isPump && <button className="eq-primary" disabled={!event.alarmTriggered} onClick={onAnalyze}>{event.analysisStage === "complete" ? "查看协同结果 →" : "启动协同分析 →"}</button>}</footer>
    </aside>
  </div>;
}
