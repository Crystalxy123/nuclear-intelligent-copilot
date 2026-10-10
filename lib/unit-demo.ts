export type UnitSnapshot = {
  reactorPower: number;
  primaryPressure: number;
  pumpSpeed: number;
  pumpPressure: number;
  pumpVibration: number;
  steamLevel: number;
  generatorPower: number;
  outletTemperature: number;
  steamPressure: number;
  steamTemperature: number;
  turbineSpeed: number;
  turbineTemperature: number;
  pumpHealth: number;
  frequency: number;
  systemHealth: number;
  availability: number;
};

export type UnitSystemId = "all" | "reactor" | "primary" | "secondary" | "electrical" | "auxiliary";
export type UnitEquipmentId = "reactor" | "steam" | "pump" | "turbine" | "generator" | "cooling" | "electrical";
export type UnitMetric = { label: string; key: keyof UnitSnapshot; unit: string; precision: number };
export type UnitEquipment = {
  id: UnitEquipmentId;
  label: string;
  system: Exclude<UnitSystemId, "all">;
  description: string;
  metrics: UnitMetric[];
  related: UnitEquipmentId[];
};
export type UnitSystem = {
  id: UnitSystemId;
  label: string;
  icon: string;
  description: string;
  equipmentIds: UnitEquipmentId[];
};

export const BASE_UNIT_SNAPSHOT: UnitSnapshot = {
  reactorPower: 95.3,
  primaryPressure: 15.61,
  pumpSpeed: 4320,
  pumpPressure: 4.5,
  pumpVibration: 1.8,
  steamLevel: 62.0,
  generatorPower: 1346,
  outletTemperature: 305.2,
  steamPressure: 6.03,
  steamTemperature: 279.6,
  turbineSpeed: 1268,
  turbineTemperature: 602.3,
  pumpHealth: 85.7,
  frequency: 50.0,
  systemHealth: 95.3,
  availability: 99.8,
};

// These bounded display variations are independent of the PCTRAN physics model.
export function getUnitSnapshot(tick: number): UnitSnapshot {
  const time = Number.isFinite(tick) ? Math.max(0, tick) : 0;
  const wave = (period: number, amplitude: number) => amplitude * (
    0.7 * Math.sin(time / period) + 0.3 * Math.sin(time / (period * 0.43))
  );
  return {
    reactorPower: BASE_UNIT_SNAPSHOT.reactorPower + wave(8, 0.35),
    primaryPressure: BASE_UNIT_SNAPSHOT.primaryPressure + wave(11, 0.015),
    pumpSpeed: BASE_UNIT_SNAPSHOT.pumpSpeed + wave(6, 9),
    pumpPressure: BASE_UNIT_SNAPSHOT.pumpPressure + wave(12, .005),
    pumpVibration: BASE_UNIT_SNAPSHOT.pumpVibration + wave(8, .04),
    steamLevel: BASE_UNIT_SNAPSHOT.steamLevel + wave(13, 0.3),
    generatorPower: BASE_UNIT_SNAPSHOT.generatorPower + wave(8, 5),
    outletTemperature: BASE_UNIT_SNAPSHOT.outletTemperature + wave(12, 0.25),
    steamPressure: BASE_UNIT_SNAPSHOT.steamPressure + wave(10, 0.012),
    steamTemperature: BASE_UNIT_SNAPSHOT.steamTemperature + wave(14, 0.18),
    turbineSpeed: BASE_UNIT_SNAPSHOT.turbineSpeed + wave(7, 3.6),
    turbineTemperature: BASE_UNIT_SNAPSHOT.turbineTemperature + wave(16, 0.35),
    pumpHealth: BASE_UNIT_SNAPSHOT.pumpHealth + wave(23, 0.18),
    frequency: BASE_UNIT_SNAPSHOT.frequency + wave(5, 0.009),
    systemHealth: BASE_UNIT_SNAPSHOT.systemHealth + wave(19, 0.2),
    availability: BASE_UNIT_SNAPSHOT.availability + wave(29, 0.03),
  };
}

export const UNIT_SYSTEMS: UnitSystem[] = [
  { id: "all", label: "整体视图", icon: "overview", description: "查看反应堆、热力回路、发电与辅助系统的同一场景快照。", equipmentIds: ["reactor", "steam", "pump", "turbine", "generator", "cooling", "electrical"] },
  { id: "reactor", label: "反应堆系统", icon: "reactor", description: "观察反应堆功率与出口温度，关联一回路运行状态。", equipmentIds: ["reactor"] },
  { id: "primary", label: "一回路系统", icon: "flow", description: "查看反应堆、蒸汽发生器和主泵之间的传热与循环关系。", equipmentIds: ["reactor", "steam", "pump"] },
  { id: "secondary", label: "二回路系统", icon: "steam", description: "关联蒸汽参数、汽轮机和冷源，展示热能转换过程。", equipmentIds: ["steam", "turbine", "cooling"] },
  { id: "electrical", label: "电气系统", icon: "energy", description: "查看发电机出力、频率和电气侧的场景运行信息。", equipmentIds: ["generator", "electrical"] },
  { id: "auxiliary", label: "辅助系统", icon: "settings", description: "复核泵组与冷源的关联状态，为运行核查提供设备入口。", equipmentIds: ["pump", "cooling"] },
];

export const UNIT_EQUIPMENT: UnitEquipment[] = [
  {
    id: "reactor", label: "反应堆压力容器", system: "reactor",
    description: "展示反应堆功率、压力与出口温度的本地场景快照，作为热力回路的关联观察入口。",
    metrics: [
      { label: "反应堆功率", key: "reactorPower", unit: "%", precision: 1 },
      { label: "一回路压力", key: "primaryPressure", unit: "MPa", precision: 2 },
      { label: "堆出口温度", key: "outletTemperature", unit: "°C", precision: 1 },
    ],
    related: ["steam", "pump"],
  },
  {
    id: "steam", label: "蒸汽发生器 SG-1", system: "secondary",
    description: "通过蒸汽压力、温度和水位观察二回路状态；数值沿用演示画面的预设，不据此判定安全限值。",
    metrics: [
      { label: "蒸汽压力", key: "steamPressure", unit: "MPa", precision: 2 },
      { label: "蒸汽温度", key: "steamTemperature", unit: "°C", precision: 1 },
      { label: "蒸汽发生器水位", key: "steamLevel", unit: "%", precision: 1 },
    ],
    related: ["reactor", "turbine"],
  },
  {
    id: "pump", label: "主泵 P-201", system: "primary",
    description: "关联 P101 出口压力、转速、振动与设备健康度。设备诊断需结合就地核查；以下为 Event-021 演示数据。",
    metrics: [
      { label: "出口压力 P101", key: "pumpPressure", unit: "MPa", precision: 2 },
      { label: "主泵转速", key: "pumpSpeed", unit: "rpm", precision: 0 },
      { label: "振动", key: "pumpVibration", unit: "mm/s", precision: 1 },
      { label: "泵组健康度", key: "pumpHealth", unit: "%", precision: 1 },
      { label: "关联一回路压力", key: "primaryPressure", unit: "MPa", precision: 2 },
    ],
    related: ["reactor", "steam", "electrical"],
  },
  {
    id: "turbine", label: "汽轮机", system: "secondary",
    description: "展示汽轮机转速与温度的场景预设，并关联上游蒸汽参数及发电机出力。",
    metrics: [
      { label: "汽轮机转速", key: "turbineSpeed", unit: "rpm", precision: 0 },
      { label: "汽轮机温度", key: "turbineTemperature", unit: "°C", precision: 1 },
      { label: "关联发电功率", key: "generatorPower", unit: "MWe", precision: 0 },
    ],
    related: ["steam", "generator", "cooling"],
  },
  {
    id: "generator", label: "发电机", system: "electrical",
    description: "以机组电功率与频率展示发电侧场景状态，可进一步查看汽轮机和电气系统。",
    metrics: [
      { label: "发电机功率", key: "generatorPower", unit: "MWe", precision: 0 },
      { label: "电气频率", key: "frequency", unit: "Hz", precision: 2 },
    ],
    related: ["turbine", "electrical"],
  },
  {
    id: "cooling", label: "冷却系统", system: "auxiliary",
    description: "冷源观察入口展示关联机组出力和蒸汽参数。本场景未提供独立冷却水温度与流量测点。",
    metrics: [
      { label: "关联机组出力", key: "generatorPower", unit: "MWe", precision: 0 },
      { label: "关联蒸汽温度", key: "steamTemperature", unit: "°C", precision: 1 },
    ],
    related: ["steam", "turbine"],
  },
  {
    id: "electrical", label: "电气与供电系统", system: "electrical",
    description: "汇总电气侧频率与机组出力。详细母线、电压和断路器状态未接入，不能据此确认实际供电可用性。",
    metrics: [
      { label: "电气频率", key: "frequency", unit: "Hz", precision: 2 },
      { label: "关联发电功率", key: "generatorPower", unit: "MWe", precision: 0 },
      { label: "平台服务可用性", key: "availability", unit: "%", precision: 1 },
    ],
    related: ["generator", "pump"],
  },
];

export const UNIT_MAINTENANCE = {
  title: "主泵 P-201 · 维护诊断详情",
  subtitle: "预测性维护智能体 · 本地演示任务",
  summary: "关联主泵转速、健康评分与一回路压力，整理需要补充的设备核查信息；当前尚未确认故障根因。",
  equipmentId: "pump" as UnitEquipmentId,
  progress: 91,
  findings: [
    { label: "当前分析", value: "泵组运行特征与关联压力趋势复核" },
    { label: "已展示数据", value: "主泵转速、一回路压力、泵组健康度场景评分" },
    { label: "待补充数据", value: "就地振动记录、出口阀门指令与反馈、维护记录" },
    { label: "诊断结论", value: "信息尚不足以确认设备故障，仅形成待核查建议" },
  ],
  nextSteps: [
    "核对当前场景的主泵转速、压力与设备健康评分。",
    "补充就地振动及阀门反馈，比较设备维护记录中的相似现象。",
    "由值长复核设备核查结果，再决定是否形成维护或运行调整方案。",
  ],
  dataNote: "诊断进度与健康评分均为演示预设；未连接实际振动监测、维护工单或电厂控制系统。",
};
