"use client";

const steps = ["正常运行", "压力下降", "A317 报警", "智能分析", "生成方案", "人工复核"];
export const REPLAY_TIMES = [0, 30, 60, 90, 120, 180];
export default function EventTimeline({ time, onSeek }: { time: number; onSeek: (time: number) => void }) {
  const active = REPLAY_TIMES.findLastIndex(point => point <= time);
  return <div className="event-replay-timeline" aria-label="Event-021 历史阶段">{REPLAY_TIMES.map((point, index) => <button key={point} className={index === active ? "active" : point <= time ? "complete" : ""} aria-pressed={index === active} onClick={() => onSeek(point)}><b>{index + 1}</b><strong>T+{String(point).padStart(2, "0")}</strong><span>{steps[index]}</span></button>)}</div>;
}
