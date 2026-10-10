"use client";

import { DECISION_PLANS, updateDecisionRecord, type PlanId } from "@/lib/decision-card";

export type GreenPlan = {
  id: PlanId;
  shortTitle: string;
  title: string;
  savings: number;
  benefit: number;
  carbon: number;
  renewable: number;
  scores: [number, number, number, number, number];
  advice: [string, string, string];
};

const planDetails: Record<PlanId, Omit<GreenPlan, "id" | "title">> = {
  A: {
    shortTitle: "加强监测",
    savings: 0,
    benefit: 0,
    carbon: 0,
    renewable: 0,
    scores: [95, 82, 80, 77, 74],
    advice: [
      "维持当前运行策略，加强 P-201 压力趋势与关联参数监测。",
      "补充泵组振动和阀门反馈记录，完成设备核查后再评估调整空间。",
      "本方案暂不安排辅机节能调整或新增储能消纳，增量收益按零展示。",
    ],
  },
  B: {
    shortTitle: "调整策略并核查",
    savings: 3.4,
    benefit: 4.8,
    carbon: 9.6,
    renewable: 18,
    scores: [98, 91, 90, 92, 89],
    advice: [
      "在不触及安全边界的前提下，平滑辅机负荷波动，降低非必要能耗。",
      "结合 14:00—18:00 新能源窗口优化机组匹配，增加清洁能源消纳。",
      "在维持设备寿命的前提下提升综合收益；完成核查后，由值长审核。",
    ],
  },
  C: {
    shortTitle: "保守运行",
    savings: 0.8,
    benefit: 1.3,
    carbon: 2.4,
    renewable: 0,
    scores: [100, 68, 97, 63, 60],
    advice: [
      "优先保留运行裕度，复核备用泵组与设备冗余条件。",
      "仅评估保守的辅机调整方案，持续关注压力与设备健康状态。",
      "暂不安排新增储能充电；有限节能收益采用本地场景预设，调整前须经人工审核。",
    ],
  },
};

export const GREEN_PLANS: GreenPlan[] = DECISION_PLANS.map(({ id, title }) => ({
  id,
  title,
  ...planDetails[id],
}));

export const GREEN_PLAN_ASSUMPTIONS = [
  "所有评分、节能率、收益、减排和消纳量均为本地演示场景预设，并非工程模型计算或真实运行结果。",
  "节能率以当前辅机策略为基准；收益单位为万元/日，减排单位为 tCO₂e/日，新增消纳单位为 MWh。",
  "方案 B 的 18 MWh 沿用决策卡中 6 MW × 3 小时的场景预设；14:00—18:00 表示候选窗口，不代表按整个窗口持续充电。",
  "提交标准方案仅更新当前浏览器中的决策卡与审核记录；不下发设备指令，运行调整仍待人工审核。",
];

export function submitGreenPlan(id: PlanId, windowActive = true): void {
  const plan = GREEN_PLANS.find(item => item.id === id)!;
  const auditId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  updateDecisionRecord(current => {
    const replacedAdjustment = current.adjustments[id] !== undefined;
    const adjustments = { ...current.adjustments };
    delete adjustments[id];
    if (id === "B" && !windowActive) adjustments.B = { note: "绿色工作台未启用 14:00–18:00 新能源出力窗口；保留设备核查建议，暂不安排新增消纳。本次窗口相关的节能、消纳、收益和减排预估均为零，需重新评估后提交运行调整。", reviewWindow: "2 小时内", monitorInterval: "30 秒" };
    const revision = current.revision + 1;
    const message = `绿色工作台提交标准方案 ${id} 建议：${plan.title}，等待人工审核。${id === "B" ? windowActive ? "已选中14:00–18:00新能源窗口，采用18MWh增纳场景。" : "未启用新能源窗口，本次窗口收益预估为零。" : ""}${replacedAdjustment ? "本次提交已替换该方案此前的人工修改，原审核历史保留。" : ""}预期效果采用本地演示场景预设，尚未执行运行调整。`;

    return {
      ...current,
      selected: id,
      status: "waiting",
      revision,
      adjustments,
      audit: [...current.audit, {
        id: auditId,
        timestamp,
        action: "modified",
        plan: id,
        message,
        revision,
      }],
    };
  });
}
