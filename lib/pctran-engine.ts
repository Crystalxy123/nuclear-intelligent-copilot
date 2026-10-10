export type ScenarioId = "steady" | "rcp-trip" | "sb-loca" | "lb-loca" | "sgtr" | "sbo" | "mslb";

export type EventLevel = "info" | "alarm" | "trip" | "safety";

export interface TransientEvent {
  id: string;
  time: number;
  level: EventLevel;
  message: string;
}

export interface PlantState {
  time: number;
  triggered: boolean;
  reactorPower: number;
  thermalPowerMW: number;
  rcsPressure: number;
  rcsTemperature: number;
  hotLegTemperature: number;
  coldLegTemperature: number;
  rcsFlow: number;
  rcsInventory: number;
  pressurizerLevel: number;
  sgPressure: number;
  sgLevel: number;
  containmentPressure: number;
  coreLevel: number;
  fuelTemperature: number;
  breakFlow: number;
  hpsiFlow: number;
  accumulatorFlow: number;
  lpiFlow: number;
  afwFlow: number;
  scram: boolean;
  scramTime: number | null;
  turbineTrip: boolean;
  rcpRunning: boolean;
  acPower: boolean;
  mainFeedwater: boolean;
  hpsi: boolean;
  accumulator: boolean;
  lpi: boolean;
  afw: boolean;
  containmentSpray: boolean;
  porv: boolean;
  coreUncovered: boolean;
  cladFailure: boolean;
}

export interface HistoryPoint {
  time: number;
  pressure: number;
  power: number;
  temperature: number;
  flow: number;
  inventory: number;
  sgPressure: number;
  sgLevel: number;
  containment: number;
  coreLevel: number;
  fuelTemperature: number;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  code: string;
  name: string;
  short: string;
  description: string;
  eventTime: number;
  duration: number;
  breakAreaCm2?: number;
}

/**
 * Source constants ported from PCTRAN PWR3LP v7.0.2 BasicData and
 * SystemCalculations. Units are the same engineering units used by PCTRAN.
 */
export const PCTRAN = {
  model: "PWR-3LP / PCTRAN 7.0.2",
  ratedThermalPowerMW: 2895,
  rcsPressureBar: 155.5,
  rcsAverageTemperatureC: 310,
  rcsFlowTph: 49547.45,
  rcpCoastdownSeconds: 15,
  rcsVolumeM3: 265,
  pressurizerVolumeM3: 39.75,
  pressurizerLevelFraction: 0.62,
  lowPressureScramBar: 132,
  highPressureScramBar: 165.7,
  hpsiStartBar: 118.1,
  accumulatorStartBar: 43.267,
  lpiStartBar: 11.36,
  porvOpenBar: 165.2,
  porvCloseBar: 163.2,
  safetyOpenBar: 176,
  sgPressureBar: 67,
  sgLowLevelPct: 17,
  sgTubeRuptureFlowTph: 114.5,
  afwCapacityTph: 160,
  containmentInitialPressureBar: 1.034,
  containmentSprayStartBar: 1.3,
  fullPowerFuelTemperatureC: 788.9,
  activeFuelHeightM: 3.68,
  hpiPressure: [0, 34, 83, 125, 165, 185, 280],
  hpiFlow: [70.9, 65.5, 54.5, 43.6, 27.3, 0, 0],
  lpiPressure: [0, 7, 8, 8.5, 8.8, 9, 155],
  lpiFlow: [900, 852, 800, 500, 300, 40, 0],
} as const;

export const PCTRAN_SCENARIOS: ScenarioDefinition[] = [
  { id: "steady", code: "IC-01", name: "100% 稳态运行", short: "基准工况", description: "三环路额定功率稳态，用于检查控制系统与热平衡。", eventTime: 99999, duration: 600 },
  { id: "rcp-trip", code: "MF-07", name: "主冷却剂泵跳闸", short: "RCP Trip", description: "主泵在 T+10 s 跳闸，按 15 s 惰转模型计算流量衰减与低流量停堆。", eventTime: 10, duration: 300 },
  { id: "sb-loca", code: "MF-01", name: "小破口失水事故", short: "20 cm² SBLOCA", description: "冷段 20 cm² 破口，联动低压停堆、HPSI、蓄压箱与 LPI。", eventTime: 10, duration: 1800, breakAreaCm2: 20 },
  { id: "lb-loca", code: "MF-02", name: "大破口失水事故", short: "100 cm² LOCA", description: "冷段 100 cm² 破口，计算快速卸压、堆芯水位与安全注入响应。", eventTime: 10, duration: 900, breakAreaCm2: 100 },
  { id: "sgtr", code: "MF-11", name: "蒸汽发生器传热管破裂", short: "1-Tube SGTR", description: "单根传热管破裂，额定破口流量 114.5 t/h，并跟踪二次侧水位。", eventTime: 10, duration: 1800 },
  { id: "sbo", code: "MF-06", name: "全厂断电", short: "Station Blackout", description: "失去交流电源、主泵与主给水，保留汽动辅助给水的事故响应。", eventTime: 10, duration: 3600 },
  { id: "mslb", code: "MF-04", name: "主蒸汽管道破裂", short: "MSLB", description: "安全壳外主蒸汽管线破裂，计算二次侧快速卸压与一回路过冷。", eventTime: 10, duration: 900 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function interpolate(x: number, xs: readonly number[], ys: readonly number[]) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i += 1) {
    if (x <= xs[i]) {
      const fraction = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + fraction * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

export function createInitialState(): PlantState {
  return {
    time: 0,
    triggered: false,
    reactorPower: 100,
    thermalPowerMW: PCTRAN.ratedThermalPowerMW,
    rcsPressure: PCTRAN.rcsPressureBar,
    rcsTemperature: PCTRAN.rcsAverageTemperatureC,
    hotLegTemperature: 325,
    coldLegTemperature: 295,
    rcsFlow: 100,
    rcsInventory: 100,
    pressurizerLevel: PCTRAN.pressurizerLevelFraction * 100,
    sgPressure: PCTRAN.sgPressureBar,
    sgLevel: 62,
    containmentPressure: PCTRAN.containmentInitialPressureBar,
    coreLevel: 26,
    fuelTemperature: PCTRAN.fullPowerFuelTemperatureC,
    breakFlow: 0,
    hpsiFlow: 0,
    accumulatorFlow: 0,
    lpiFlow: 0,
    afwFlow: 0,
    scram: false,
    scramTime: null,
    turbineTrip: false,
    rcpRunning: true,
    acPower: true,
    mainFeedwater: true,
    hpsi: false,
    accumulator: false,
    lpi: false,
    afw: false,
    containmentSpray: false,
    porv: false,
    coreUncovered: false,
    cladFailure: false,
  };
}

export function historyPoint(state: PlantState): HistoryPoint {
  return {
    time: state.time,
    pressure: state.rcsPressure,
    power: state.reactorPower,
    temperature: state.rcsTemperature,
    flow: state.rcsFlow,
    inventory: state.rcsInventory,
    sgPressure: state.sgPressure,
    sgLevel: state.sgLevel,
    containment: state.containmentPressure,
    coreLevel: state.coreLevel,
    fuelTemperature: state.fuelTemperature,
  };
}

function event(time: number, level: EventLevel, message: string): TransientEvent {
  return { id: `${time.toFixed(2)}-${message}`, time, level, message };
}

function decayHeatPercent(secondsAfterScram: number) {
  const t = Math.max(1, secondsAfterScram + 1);
  return Math.max(1.15, 6.6 * Math.pow(t, -0.2) + 0.55 * Math.exp(-t / 12));
}

export function stepPCTRAN(previous: PlantState, scenario: ScenarioDefinition, dt = 1) {
  const next: PlantState = { ...previous, time: previous.time + dt };
  const events: TransientEvent[] = [];
  const elapsed = Math.max(0, next.time - scenario.eventTime);
  const active = next.time >= scenario.eventTime;

  if (active && !previous.triggered && scenario.id !== "steady") {
    next.triggered = true;
    events.push(event(next.time, "alarm", `${scenario.code} ${scenario.name} 已触发`));
  }

  if (active) {
    if (scenario.id === "rcp-trip") next.rcpRunning = false;
    if (scenario.id === "sbo") {
      next.acPower = false;
      next.rcpRunning = false;
      next.mainFeedwater = false;
    }
    if (scenario.id === "mslb") next.mainFeedwater = false;
  }

  const isLoca = active && (scenario.id === "sb-loca" || scenario.id === "lb-loca");
  const isSgtr = active && scenario.id === "sgtr";
  const isSteamBreak = active && scenario.id === "mslb";

  const flowTarget = next.rcpRunning ? 100 : 0;
  const flowTau = next.rcpRunning ? 4 : PCTRAN.rcpCoastdownSeconds;
  next.rcsFlow = clamp(previous.rcsFlow + ((flowTarget - previous.rcsFlow) / flowTau) * dt, 0, 105);

  if (!next.scram && (
    next.rcsPressure <= PCTRAN.lowPressureScramBar ||
    next.rcsPressure >= PCTRAN.highPressureScramBar ||
    next.rcsFlow < 66 ||
    next.sgLevel < PCTRAN.sgLowLevelPct ||
    next.sgPressure < 38 ||
    (active && scenario.id === "sbo")
  )) {
    next.scram = true;
    next.scramTime = next.time;
    next.turbineTrip = true;
  }

  if (next.scram && !previous.scram) {
    const cause = next.rcsFlow < 66 ? "一回路流量低" : next.rcsPressure <= PCTRAN.lowPressureScramBar ? "一回路压力低" : next.sgPressure < 38 ? "蒸汽发生器压力低" : scenario.id === "sbo" ? "全厂断电" : "保护定值动作";
    events.push(event(next.time, "trip", `反应堆停堆：${cause}`));
  }

  if (!next.hpsi && next.acPower && (
    next.rcsPressure <= PCTRAN.hpsiStartBar ||
    next.containmentPressure >= PCTRAN.containmentSprayStartBar ||
    next.sgPressure < 38
  )) next.hpsi = true;
  if (next.hpsi && !previous.hpsi) events.push(event(next.time, "safety", "HPSI 启动，3 台高压安注泵投入"));

  if (!next.accumulator && next.rcsPressure <= PCTRAN.accumulatorStartBar) next.accumulator = true;
  if (next.accumulator && !previous.accumulator) events.push(event(next.time, "safety", "蓄压箱注入，一回路压力低于 43.267 bar"));

  if (!next.lpi && next.acPower && next.rcsPressure <= PCTRAN.lpiStartBar) next.lpi = true;
  if (next.lpi && !previous.lpi) events.push(event(next.time, "safety", "LPI / RHR 低压安注启动"));

  if (!next.afw && next.scram && next.scramTime !== null && next.time >= next.scramTime + 10) next.afw = true;
  if (next.afw && !previous.afw) events.push(event(next.time, "safety", scenario.id === "sbo" ? "汽动辅助给水泵启动" : "辅助给水系统启动"));

  if (!next.containmentSpray && next.acPower && next.containmentPressure >= PCTRAN.containmentSprayStartBar) next.containmentSpray = true;
  if (next.containmentSpray && !previous.containmentSpray) events.push(event(next.time, "safety", "安全壳喷淋自动启动"));

  if (!next.porv && next.rcsPressure >= PCTRAN.porvOpenBar) next.porv = true;
  if (next.porv && next.rcsPressure < PCTRAN.porvCloseBar) next.porv = false;
  if (next.porv !== previous.porv) events.push(event(next.time, "info", `稳压器 PORV ${next.porv ? "开启" : "回座"}`));

  const hpsiPerPump = interpolate(next.rcsPressure, PCTRAN.hpiPressure, PCTRAN.hpiFlow);
  next.hpsiFlow = next.hpsi && next.acPower ? hpsiPerPump * 3 : 0;
  const lpiPerPump = interpolate(next.rcsPressure, PCTRAN.lpiPressure, PCTRAN.lpiFlow);
  next.lpiFlow = next.lpi && next.acPower ? lpiPerPump * 2 : 0;
  next.accumulatorFlow = next.accumulator && next.rcsPressure < PCTRAN.accumulatorStartBar
    ? 35.3 * 3 * Math.sqrt(clamp((PCTRAN.accumulatorStartBar - next.rcsPressure) / PCTRAN.accumulatorStartBar, 0, 1))
    : 0;
  next.afwFlow = next.afw ? PCTRAN.afwCapacityTph : 0;

  if (isLoca) {
    const area = scenario.breakAreaCm2 ?? 0;
    const pressureHead = Math.sqrt(Math.max(0, next.rcsPressure - next.containmentPressure));
    next.breakFlow = area * 1.9 * pressureHead * (0.58 + 0.42 * next.rcsInventory / 100);
  } else if (isSgtr) {
    next.breakFlow = PCTRAN.sgTubeRuptureFlowTph * Math.sqrt(clamp((next.rcsPressure - next.sgPressure) / 88.5, 0, 1.4));
  } else {
    next.breakFlow = 0;
  }

  const chargingFlow = next.acPower && !next.hpsi ? 23.7 : 0;
  const letdownFlow = next.hpsi || !next.acPower ? 0 : 23.7;
  const totalInjection = next.hpsiFlow + next.lpiFlow + next.accumulatorFlow + chargingFlow;
  const inventoryRate = (totalInjection - letdownFlow - next.breakFlow) / 3600 / 190 * 100;
  next.rcsInventory = clamp(previous.rcsInventory + inventoryRate * dt, 0, 103);

  const lossCoefficient = isLoca ? 0.00245 : isSgtr ? 0.00115 : 0;
  const breakDepressurization = next.breakFlow * lossCoefficient;
  const injectionPressurization = (next.hpsiFlow + next.accumulatorFlow + next.lpiFlow) * 0.00042;
  const thermalPressure = (previous.rcsTemperature - next.rcsTemperature) * 0.19;
  const normalPressureControl = !isLoca && !isSgtr && scenario.id !== "sbo" ? (PCTRAN.rcsPressureBar - previous.rcsPressure) / 36 : 0;
  const porvRelease = next.porv ? 0.5 : 0;
  next.rcsPressure = clamp(previous.rcsPressure + (normalPressureControl - breakDepressurization + injectionPressurization - porvRelease) * dt + thermalPressure, next.containmentPressure + 0.1, 180);

  const secondsAfterScram = next.scramTime === null ? 0 : Math.max(0, next.time - next.scramTime);
  next.reactorPower = next.scram ? decayHeatPercent(secondsAfterScram) : clamp(previous.reactorPower + (100 - previous.reactorPower) * dt / 8, 0, 105);
  next.thermalPowerMW = PCTRAN.ratedThermalPowerMW * next.reactorPower / 100;

  let temperatureTarget = next.scram ? 286 + next.reactorPower * 0.32 : PCTRAN.rcsAverageTemperatureC;
  if (scenario.id === "sbo" && active && !next.afw) temperatureTarget = 330 + Math.min(90, elapsed * 0.03);
  if (isSteamBreak) temperatureTarget = 270;
  const flashingCooling = isLoca ? Math.min(0.095, next.breakFlow / 17000) : 0;
  const heatRemovalFactor = (next.rcsFlow / 100) * clamp(next.sgLevel / 40, 0.2, 1.2);
  const heatupPenalty = next.scram && heatRemovalFactor < 0.15 ? (0.15 - heatRemovalFactor) * 0.16 : 0;
  next.rcsTemperature = clamp(previous.rcsTemperature + ((temperatureTarget - previous.rcsTemperature) / 72 - flashingCooling + heatupPenalty) * dt, 25, 650);
  const deltaT = 30 * clamp(next.reactorPower / Math.max(next.rcsFlow, 12), 0.12, 2.4);
  next.hotLegTemperature = clamp(next.rcsTemperature + deltaT / 2, 25, 680);
  next.coldLegTemperature = clamp(next.rcsTemperature - deltaT / 2, 25, 650);

  const steamBreakFlow = isSteamBreak ? 1800 * Math.sqrt(clamp(next.sgPressure / PCTRAN.sgPressureBar, 0, 1.2)) : 0;
  let sgPressureTarget = next.scram ? (next.afw ? 51 : 78) : PCTRAN.sgPressureBar;
  if (scenario.id === "sbo" && active) sgPressureTarget = next.afw ? 70 : 84;
  const sgtrPressurization = isSgtr ? next.breakFlow * 0.0007 : 0;
  const steamDepressurization = steamBreakFlow * 0.00042;
  next.sgPressure = clamp(previous.sgPressure + ((sgPressureTarget - previous.sgPressure) / 80 + sgtrPressurization - steamDepressurization) * dt, 1.2, 100);

  const sgtrLevelGain = isSgtr ? next.breakFlow / 3600 / 150 * 100 : 0;
  const feedwaterTarget = next.mainFeedwater ? 62 : next.afw ? 42 : 0;
  const levelTau = next.mainFeedwater ? 70 : next.afw ? 180 : 520;
  const boiloff = !next.mainFeedwater && !next.afw ? next.reactorPower * 0.00075 : 0;
  next.sgLevel = clamp(previous.sgLevel + ((feedwaterTarget - previous.sgLevel) / levelTau + sgtrLevelGain - boiloff) * dt, 0, 110);

  const releaseToContainment = isLoca ? next.breakFlow : 0;
  const mslbInsideContribution = isSteamBreak ? steamBreakFlow * 0.08 : 0;
  const sprayRemoval = next.containmentSpray ? Math.max(0, previous.containmentPressure - PCTRAN.containmentInitialPressureBar) * 0.012 : 0;
  next.containmentPressure = clamp(previous.containmentPressure + ((releaseToContainment + mslbInsideContribution) * 0.000007 - sprayRemoval) * dt, PCTRAN.containmentInitialPressureBar, 8);

  const voidPenalty = Math.max(0, (100 - next.rcsPressure) / 100) * 3.2;
  next.coreLevel = clamp((next.rcsInventory - 30) / 70 * 26 - voidPenalty, 0, 26);
  next.pressurizerLevel = clamp(62 + (next.rcsInventory - 100) * 2.2 + (next.rcsTemperature - 310) * 0.32, 0, 100);
  next.coreUncovered = next.coreLevel < PCTRAN.activeFuelHeightM;
  if (next.coreUncovered && !previous.coreUncovered) events.push(event(next.time, "trip", "堆芯活性段开始裸露"));

  const coveredFuelTarget = next.scram ? next.rcsTemperature + 80 + next.reactorPower * 6 : PCTRAN.fullPowerFuelTemperatureC;
  const uncoveredFraction = clamp((PCTRAN.activeFuelHeightM - next.coreLevel) / PCTRAN.activeFuelHeightM, 0, 1);
  const oxidationHeatup = uncoveredFraction * (0.45 + next.reactorPower * 0.08);
  next.fuelTemperature = clamp(previous.fuelTemperature + ((coveredFuelTarget - previous.fuelTemperature) / 95 + oxidationHeatup) * dt, next.rcsTemperature, 2800);
  next.cladFailure = next.fuelTemperature >= 1200;
  if (next.cladFailure && !previous.cladFailure) events.push(event(next.time, "trip", "燃料包壳温度达到 1200 °C 失效判据"));

  return { state: next, events };
}

export function getPlantCondition(state: PlantState) {
  if (state.cladFailure) return { label: "严重事故", tone: "trip" };
  if (state.coreUncovered || state.containmentPressure > 2.5) return { label: "紧急", tone: "trip" };
  if (state.scram || state.hpsi || state.breakFlow > 1) return { label: "事故响应", tone: "alarm" };
  if (state.triggered) return { label: "瞬态", tone: "alarm" };
  return { label: "稳态", tone: "normal" };
}
