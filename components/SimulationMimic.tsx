"use client";

import { useId, type CSSProperties } from "react";
import AnimatedNumber from "./AnimatedNumber";
import type { PlantState } from "@/lib/pctran-engine";
import "@/app/simulation-mimic.css";
import "@/app/motion-twin-enhanced.css";

const bound = (value: number, max = 100) => Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
const number = (value: number, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : "—";

/** Engineering values are displayed in the same units as the transient model. */
export default function SimulationMimic({ plant, running = false, speed = 1 }: { plant: PlantState; running?: boolean; speed?: number }) {
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `url(#${id}-${name})`;
  const flow = plant.rcsFlow > 0.5;
  // Visual rates are bounded independently of the simulation's integration clock.
  const visualSpeed = Math.min(2.6, Math.max(.7, Math.log2(Math.max(1, Number.isFinite(speed) ? speed : 1) + 1) * .55));
  const motionStyle = {
    "--sim-primary-duration": `${3.2 / (plant.breakFlow > .1 ? .6 : plant.reactorPower > 100 ? 1.2 : 1)}s`,
    "--sim-steam-duration": `${1.2 / visualSpeed}s`,
    "--sim-feed-duration": `${1.5 / visualSpeed}s`,
    "--sim-pump-duration": `${3.2 / Math.max(.6, bound(plant.rcsFlow) / 100)}s`,
    "--sim-bubble-duration": `${5.5 / visualSpeed}s`,
  } as CSSProperties;
  const coreWater = bound(plant.coreLevel, 26) / 26;
  const pzrWater = bound(plant.pressurizerLevel) / 100;
  const sgWater = bound(plant.sgLevel) / 100;
  const leak = plant.breakFlow > 0.1;
  const steamOn = !plant.turbineTrip && plant.sgPressure > 2;
  const safetyFlow = plant.hpsiFlow + plant.accumulatorFlow + plant.lpiFlow;
  const loopPaths = [
    "M251 168 H323 Q337 168 337 182 V201 H429 V255 Q429 269 443 269 H451 V294 Q451 318 427 318 H277Q261 318 261 302V267H251",
    "M251 204 H365 Q377 204 377 218 H513 V255 Q513 269 527 269 H535 V299 Q535 318 516 318 H277Q261 318 261 302V267H251",
    "M251 240 H403 Q413 240 413 251 H597 V255 Q597 269 611 269 H619 V300 Q619 318 601 318 H277Q261 318 261 302V267H251",
  ];
  const vessel = "M166 130 C166 83 254 83 254 130 V259 C254 307 166 307 166 259 Z";
  const sg = "M-23 166 C-23 131 23 131 23 166 V249 C23 281-23 281-23 249 Z";

  return <div className="sim-mimic" data-running={running} data-rcp-running={plant.rcpRunning} data-steam-flow={steamOn} data-feed-flow={plant.mainFeedwater || plant.afw} data-core-wet={coreWater > .02 && flow} style={motionStyle}>
    <svg viewBox="0 0 920 400" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>PWR 三环路热工水力实时流程图</title>
      <desc id={`${id}-desc`}>一回路压力 {number(plant.rcsPressure)} bar，平均温度 {number(plant.rcsTemperature)} 摄氏度，反应堆热功率 {number(plant.thermalPowerMW, 0)} MWt。反应堆{plant.scram ? "已停堆" : "运行中"}，主泵{plant.rcpRunning ? "运行中" : "已停运"}，汽轮机{plant.turbineTrip ? "已跳闸" : "运行中"}。{leak ? `破口流量 ${number(plant.breakFlow)} t/h。` : "无破口流量。"}</desc>
      <defs>
        <linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor="#03283f"/><stop offset=".5" stopColor="#001521"/><stop offset="1" stopColor="#001c2e"/></linearGradient>
        <linearGradient id={`${id}-glass`}><stop stopColor="#22a9e4" stopOpacity=".55"/><stop offset=".13" stopColor="#087aae" stopOpacity=".44"/><stop offset=".42" stopColor="#011e3b" stopOpacity=".93"/><stop offset=".72" stopColor="#042d49" stopOpacity=".78"/><stop offset=".92" stopColor="#1197d0" stopOpacity=".62"/><stop offset="1" stopColor="#77ddff" stopOpacity=".7"/></linearGradient>
        <linearGradient id={`${id}-metal`}><stop stopColor="#6de4ff"/><stop offset=".15" stopColor="#164a68"/><stop offset=".48" stopColor="#09263e"/><stop offset=".77" stopColor="#23688b"/><stop offset="1" stopColor="#51bee7"/></linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#09bded" stopOpacity=".36"/><stop offset=".6" stopColor="#08afde" stopOpacity=".52"/><stop offset="1" stopColor="#1bdbf5" stopOpacity=".85"/></linearGradient>
        <linearGradient id={`${id}-steam`}><stop stopColor="#ffdb89"/><stop offset=".25" stopColor="#ffb265"/><stop offset="1" stopColor="#ff754a"/></linearGradient>
        <linearGradient id={`${id}-turbine`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#75dafb" stopOpacity=".8"/><stop offset=".18" stopColor="#167ca8" stopOpacity=".8"/><stop offset=".5" stopColor="#042a42"/><stop offset=".82" stopColor="#15638b"/><stop offset="1" stopColor="#4da6ca"/></linearGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="#0073bb" stopOpacity=".2"/><stop offset="1" stopColor="#0073bb" stopOpacity="0"/></radialGradient>
        <pattern id={`${id}-grid`} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#13617f" strokeWidth=".5" opacity=".22"/></pattern>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
        <clipPath id={`${id}-reactor-clip`}><path d={vessel}/></clipPath>
        <clipPath id={`${id}-core-water-clip`}><rect x="167" y={294 - coreWater * 180} width="87" height={coreWater * 180}/></clipPath>
        <clipPath id={`${id}-pzr-clip`}><path d="M366 85 C366 58 410 58 410 85 V158 C410 186 366 186 366 158Z"/></clipPath>
        <clipPath id={`${id}-sg-clip`}><path d={sg}/></clipPath>
      </defs>

      <rect width="920" height="400" fill={ref("bg")}/>
      <rect width="920" height="400" fill={ref("grid")}/>
      <ellipse cx="460" cy="221" rx="385" ry="184" fill={ref("halo")}/>
      <g className="sim-mimic-industrial" aria-hidden="true">
        <path d="M18 296V188H49V162H67V229H88V199H111V283H143 M22 190H48M22 218H48M23 252H49M22 281H142M68 237H87M68 263H87M92 210H106M92 230H106"/>
        <path d="M649 312V101H682V71H715V86H739V48H778V114H807V150H846V125H889V314 M650 103H681M684 87H714M741 66H777M741 87H777M740 108H777M649 124H806M651 150H890M651 174H889M651 200H888M651 233H889M651 278H889M669 105V311M704 125V311M751 126V311M785 126V311M817 153V311M860 151V311"/>
        <path d="M0 345H920M0 372H920M126 400 331 309M279 400 409 309M438 400 476 309M601 400 550 309M761 400 626 309M918 400 701 309"/>
        <path d="M97 346V132L277 76M99 161 277 104M99 214 277 155M277 77V347M722 30V338M848 0V343M722 68 918 20M722 111 918 64"/>
      </g>

      <g className="sim-mimic-readout" transform="translate(173 31)">
        <text className="sim-mimic-label">一回路压力</text>
        <text y="22" className={`sim-mimic-value ${plant.rcsPressure < 132 || plant.rcsPressure > 165.7 ? "is-warning" : ""}`}><AnimatedNumber as="tspan" value={plant.rcsPressure} digits={1}/> <tspan className="sim-mimic-unit">bar</tspan></text>
        <path d="M39 29V54"/>
      </g>
      <g className="sim-mimic-readout" transform="translate(359 31)">
        <text className="sim-mimic-label">一回路平均温度</text>
        <text y="22" className="sim-mimic-value"><AnimatedNumber as="tspan" value={plant.rcsTemperature} digits={1}/> <tspan className="sim-mimic-unit">°C</tspan></text>
      </g>
      <g className="sim-mimic-readout" transform="translate(511 31)">
        <text className="sim-mimic-label">蒸汽发生器 · SG</text>
        <text y="22" className={`sim-mimic-value ${plant.sgLevel < 17 ? "is-warning" : ""}`}><AnimatedNumber as="tspan" value={plant.sgPressure} digits={1}/> <tspan className="sim-mimic-unit">bar</tspan><tspan dx="8" fill="#376d88">/</tspan><tspan dx="8"><AnimatedNumber as="tspan" value={plant.sgLevel} digits={1}/> <tspan className="sim-mimic-unit">%</tspan></tspan></text>
        <path d="M95 29V63"/>
      </g>

      {/* Rounded, layered pipes retain a solid industrial outline beneath the flow tracers. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {loopPaths.map((d, index) => <g key={d} className="sim-pipe-entry" style={{ animationDelay: `${index * 55}ms` }}>
          <path d={d} stroke="#0872a4" strokeWidth="10" opacity=".3" filter={ref("glow")}/>
          <path d={d} stroke="#137aaa" strokeWidth="7"/>
          <path d={d} stroke="#49d1f7" strokeWidth="3"/>
          <path d={d} stroke="#c8f8ff" strokeWidth="1" opacity=".75"/>
          {flow && <path className="sim-motion-flow sim-motion-primary" d={d} stroke="#edffff" strokeWidth="2.1" strokeDasharray="3 15" strokeDashoffset={index * 7} style={{ "--sim-flow-offset": `${index * 7}px` } as CSSProperties} opacity=".95"/>}
        </g>)}
        <path d="M327 168V188H388V176" stroke="#1991c4" strokeWidth="7"/>
        <path d="M327 168V188H388V176" stroke="#6ae9ff" strokeWidth="2"/>
        <path d="M443 143V125Q443 112 456 112H627Q640 112 640 125V183Q640 194 651 194H729 M527 143V126Q527 112 539 112 M611 143V126Q611 112 599 112" stroke="#ff792c" strokeWidth="8" opacity=".28" filter={ref("glow")}/>
        <path d="M443 143V125Q443 112 456 112H627Q640 112 640 125V183Q640 194 651 194H729 M527 143V126Q527 112 539 112 M611 143V126Q611 112 599 112" stroke={ref("steam")} strokeWidth="3.5"/>
        {steamOn && <path className="sim-motion-flow sim-motion-steam" d="M443 143V125Q443 112 456 112H627Q640 112 640 125V183Q640 194 651 194H729" stroke="#ffe4b1" strokeWidth="2" strokeDasharray="3 18"/>}
        <path d="M762 253V282H651V290H456V270 M540 290V270 M624 290V270" stroke="#2c7697" strokeWidth="2.5" opacity=".75"/>
        {(plant.mainFeedwater || plant.afw) && <path className="sim-motion-flow sim-motion-feed" d="M762 253V282H651V290H456V270 M540 290V270 M624 290V270" stroke="#99e6ef" strokeWidth="1.5" strokeDasharray="3 19"/>}
      </g>

      {/* Reactor pressure vessel with domed head, flanges and an actual model-driven water level. */}
      <g>
        <ellipse cx="210" cy="347" rx="55" ry="10" fill="#0077b5" opacity=".18" filter={ref("soft")}/>
        <path d="M185 291V336H175V344H202V301M217 300V344H245V337H235V291" fill="#042940" stroke="#176081" strokeWidth="1.5"/>
        <ellipse cx="210" cy="343" rx="39" ry="4" fill="none" stroke="#277192"/>
        <path d="M185 100V88Q210 78 235 88V100M199 85V72H221V85" fill={ref("glass")} stroke="#7cc6eb" strokeWidth="1.4"/>
        <path d={vessel} fill={ref("glass")} stroke={plant.coreUncovered ? "#ff8363" : "#58d6fb"} strokeWidth="2.4"/>
        <path d="M172 133C172 93 248 93 248 133V257C248 297 172 297 172 257Z" fill="none" stroke="#277ba5" strokeWidth="1"/>
        <g clipPath={ref("reactor-clip")}>
          <rect x="167" y={294 - coreWater * 180} width="87" height={coreWater * 180} fill={ref("water")} opacity=".74"/>
          <ellipse className="sim-water-surface" data-wet={coreWater > .02} cx="210" cy={294 - coreWater * 180} rx="44" ry="5" fill="#57e8fd" opacity=".28"/>
          <path d="M167 137H253M167 259H253" stroke="#81cde6" opacity=".55"/>
          {[186, 194, 202, 210, 218, 226, 234].map((x) => <g key={x}>
            <rect x={x} y="220" width="3" height="49" rx="1" fill={plant.scram ? "#9fb0bb" : "#ff8761"} filter={plant.scram ? undefined : ref("glow")}/>
            <rect x={x} y={plant.scram ? 172 : 144} width="3" height="52" fill="#8ed3e2" opacity={plant.scram ? ".95" : ".35"}/>
          </g>)}
          <path d="M184 273H237M184 218H237" stroke="#55cce9" strokeWidth="2"/>
          <g clipPath={ref("core-water-clip")}>
            {[0, 1, 2, 3, 4, 5].map((n) => <circle key={n} className="sim-motion-bubble" cx={181 + (n * 17) % 57} cy={282 - n * 3} r={1 + n % 2} fill="#69e9ff" opacity=".28" style={{ "--sim-bubble-lift": `${-Math.max(4, coreWater * 118 - n * 3)}px`, "--sim-bubble-delay": `${-n * .73}s` } as CSSProperties}/>)}
          </g>
        </g>
        <path d="M163 134H257M163 142H257" stroke="#8bd8f7" strokeWidth="1.4"/>
        {[171, 183, 195, 207, 219, 231, 243, 252].map((x) => <path key={x} d={`M${x} 133V144`} stroke="#83cce7" strokeWidth="2"/>)}
        <path d="M180 153V250" stroke="#89e3fd" strokeWidth="2" opacity=".2"/>
        <path d="M255 164H263V172H255M255 200H263V208H255M255 236H263V244H255M252 263H260V271H252" fill={ref("metal")} stroke="#69cdea"/>
        <g className="sim-mimic-reactor-copy" transform="translate(36 292)">
          <text>反应堆压力容器</text><text y="16" className="sim-mimic-micro">Reactor Pressure Vessel</text>
          <text y="44" className="sim-mimic-label">堆芯热功率</text>
          <text y="66" className="sim-mimic-value"><AnimatedNumber as="tspan" value={plant.thermalPowerMW} digits={0}/> <tspan className="sim-mimic-unit">MWt</tspan></text>
        </g>
        <g transform="translate(168 363)"><circle cx="0" cy="-4" r="3" fill={plant.scram ? "#ffae65" : "#39e4c2"}/><text x="10" className={`sim-mimic-small ${plant.scram ? "is-warning" : "is-ok"}`}>{plant.scram ? "保护停堆" : "堆芯运行"}</text></g>
      </g>

      <g>
        <path d="M366 85C366 58 410 58 410 85V158C410 186 366 186 366 158Z" fill={ref("glass")} stroke="#7ecdea" strokeWidth="1.5"/>
        <g clipPath={ref("pzr-clip")}><rect className="sim-liquid-level" x="365" y={178 - pzrWater * 106} width="46" height={pzrWater * 106} fill={ref("water")}/><ellipse className="sim-water-surface" data-wet={pzrWater > .02} cx="388" cy={178 - pzrWater * 106} rx="23" ry="3" fill="#68ebf7" opacity=".5"/></g>
        <path d="M370 87V151M405 85V153" stroke="#b1efff" strokeWidth="1" opacity=".35"/>
        <path d="M388 66V56H421V72" stroke={plant.porv ? "#ffae6f" : "#447d99"} strokeWidth="2" fill="none"/>
        <path d="M415 61 421 65 427 61V70L421 66 415 70Z" fill={plant.porv ? "#ffa663" : "#41738d"}/>
        <text x="388" y="93" textAnchor="middle" className="sim-mimic-micro">稳压器</text>
        <text x="388" y="110" textAnchor="middle" className="sim-mimic-micro"><AnimatedNumber as="tspan" value={plant.pressurizerLevel} digits={0}/>%</text>
        {plant.porv && <text x="423" y="87" className="sim-mimic-micro is-warning">PORV 开</text>}
      </g>

      {[443, 527, 611].map((x, index) => <g key={x} transform={`translate(${x} 0)`}>
        <ellipse cx="0" cy="276" rx="30" ry="5" fill="#008dc6" opacity=".14"/>
        <path d="M-6 144V132H6V144" fill={ref("metal")} stroke="#6cbad6"/>
        <path d={sg} fill={ref("glass")} stroke="#63d1f0" strokeWidth="1.5"/>
        <g clipPath={ref("sg-clip")}>
          <rect className="sim-liquid-level" x="-24" y={271 - sgWater * 115} width="48" height={sgWater * 115} fill={ref("water")} opacity=".52"/>
          <ellipse className="sim-water-surface" data-wet={sgWater > .02} cx="0" cy={271 - sgWater * 115} rx="23" ry="3.4" fill="#56cee9" opacity=".4" style={{ animationDelay: `${index * -.8}s` }}/>
          {[-12, -6, 0, 6].map((tube) => <path key={tube} d={`M${tube} 176V246Q${tube} 256 ${tube + 4} 256Q${tube + 8} 256 ${tube + 8} 246V176`} fill="none" stroke="#2c9cca" strokeWidth="1" opacity=".5"/>)}
        </g>
        <path d="M-20 163H20M-20 166H20M-19 251Q0 263 19 251" stroke="#6cc9e5" opacity=".4" fill="none"/>
        <path d="M-16 174V239" stroke="#adeeff" opacity=".35"/>
        <text y="235" textAnchor="middle" className="sim-mimic-equipment-id">SG-{index + 1}</text>
      </g>)}

      {[388, 486, 584].map((x, index) => <g key={x} transform={`translate(${x} 318)`}>
        <path d="M-17 14-22 23H22L17 14M-21 23H22" fill="#052d47" stroke="#276989"/>
        <circle r="23" fill="#007dbc" opacity={plant.rcpRunning ? ".15" : ".04"} filter={ref("glow")}/>
        <circle r="20" fill={ref("glass")} stroke={plant.rcpRunning ? "#6bdcf4" : "#aa7966"} strokeWidth="1.8"/>
        <circle r="15.5" fill="#073650" stroke="#227b9e"/>
        <g className="sim-motion-pump" fill={plant.rcpRunning ? "#3bcaee" : "#657d8b"} stroke="#8edff1" strokeWidth=".6">
          {[0, 120, 240].map((angle) => <path key={angle} transform={`rotate(${angle})`} d="M0-3C2-14 12-12 12-5L3 2Z"/>)}
          <circle r="3" fill="#b8f2ff"/>
        </g>
        <text y="47" textAnchor="middle" className="sim-mimic-small">RCP-{index + 1}</text>
        <circle cx="-24" cy="60" r="3" fill={plant.rcpRunning ? "#36e8c4" : "#ffa36f"} filter={ref("glow")}/>
        <text x="-14" y="64" className={`sim-mimic-small ${plant.rcpRunning ? "is-ok" : "is-warning"}`}>{plant.rcpRunning ? "运行中" : "已停运"}</text>
      </g>)}

      {/* Turbine casing, shaft and generator remain separate, readable pieces of equipment. */}
      <g opacity={plant.turbineTrip ? ".63" : "1"}>
        <path d="M715 196H729V256H715Z" fill={ref("metal")} stroke="#62c7e6"/>
        <path d="M729 185H741L774 208H791V244H774L741 267H729Z" fill={ref("turbine")} stroke="#82d5ed" strokeWidth="1.6"/>
        <path d="M736 186V266M742 190V261M748 194V257M754 198V253M761 202V249M767 206V245M775 210V241M782 210V242" stroke="#74bfe0" strokeWidth=".7" opacity=".6"/>
        <ellipse cx="731" cy="226" rx="4" ry="40" fill="none" stroke="#96dff2" strokeWidth=".8"/>
        <g transform="translate(744 226) scale(.35 1)"><g className="sim-turbine-blades" fill="#9ae9f7" opacity=".6">{[0,60,120,180,240,300].map(angle=><path key={angle} transform={`rotate(${angle})`} d="M0-4 4-26 9-22 5 1Z"/>)}</g></g>
        <path d="M791 222H835V230H791Z" fill={ref("metal")} stroke="#7fd3e9"/>
        <path d="M799 216H809V236H799ZM821 215H830V237H821Z" fill={ref("glass")} stroke="#5093b0"/>
        <path d="M838 205H892Q904 226 892 247H838Q825 226 838 205Z" fill={ref("turbine")} stroke="#53a8c6" strokeWidth="1.5"/>
        <ellipse cx="839" cy="226" rx="8" ry="21" fill="#064062" stroke="#85d0e5"/>
        <path d="M847 211H890M847 217H893M847 223H895M847 229H895M847 235H893M847 241H890" stroke="#74c6db" opacity=".28"/>
        <path d="M844 247 839 256H855V247M881 247V256H896L891 247" fill="#07415b" stroke="#38748c"/>
        <ellipse className="sim-generator-ring" cx="839" cy="226" rx="10" ry="23"/>
        <circle className="sim-motion-turbine-light" cx="838" cy="226" r="3" fill={steamOn ? "#9dedff" : "#62889b"}/>
      </g>
      <g transform="translate(808 159)" textAnchor="middle"><text className="sim-mimic-small">汽轮发电机组</text><text y="16" className="sim-mimic-micro">Turbine &amp; Generator</text></g>
      <g transform="translate(809 291)" textAnchor="middle"><text className={`sim-mimic-small ${plant.turbineTrip ? "is-warning" : "is-ok"}`}>{plant.turbineTrip ? "汽轮机已跳闸" : "汽轮机运行中"}</text><text y="21" className="sim-mimic-label">{plant.mainFeedwater ? "主给水正常" : plant.afw ? "辅助给水投入" : "主给水已停运"}</text></g>

      {safetyFlow > .1 && <g>
        <path className="sim-motion-flow sim-motion-injection" d="M92 211H142V284H167" fill="none" stroke="#2be5bc" strokeWidth="2.5" strokeDasharray="5 4"/>
        <rect x="31" y="186" width="103" height="40" rx="4" fill="#003b40" stroke="#158278"/>
        <text x="42" y="201" className="sim-mimic-micro is-ok">安全注入</text><text x="42" y="217" className="sim-mimic-small is-ok"><AnimatedNumber as="tspan" value={safetyFlow} digits={1}/> t/h</text>
      </g>}
      {leak && <g className="sim-leak-location">
        <g>{[{x:-14,y:25},{x:9,y:27},{x:23,y:16}].map((offset,index)=><circle key={index} className="sim-leak-particle" cx="287" cy="322" r="2" style={{"--leak-x":`${offset.x}px`,"--leak-y":`${offset.y}px`} as CSSProperties}/>)}</g>
        <circle className="sim-leak-highlight" cx="287" cy="322" r="17" fill="none" stroke="#ffb56e" strokeWidth="1.5"/>
        <path d="M286 310 280 317 291 318 286 326M283 323 273 339M289 325 294 343M293 321 308 332" fill="none" stroke="#ff9468" strokeWidth="2" filter={ref("glow")}/>
        <rect x="260" y="346" width="100" height="38" rx="4" fill="#321f23" stroke="#a95b49"/>
        <text x="270" y="361" className="sim-mimic-micro is-warning">破口流量</text><text x="270" y="377" className="sim-mimic-small is-warning"><AnimatedNumber as="tspan" value={plant.breakFlow} digits={1}/> t/h</text>
      </g>}

      <g transform="translate(758 352)">
        <path d="M0 0H29" stroke="#43c8f4" strokeWidth="4" strokeLinecap="round"/><text x="39" y="4" className="sim-mimic-micro">一回路冷却剂（RCS）</text>
        <path d="M0 23H29" stroke="#ffb56e" strokeWidth="4" strokeLinecap="round"/><text x="39" y="27" className="sim-mimic-micro">二回路蒸汽 / 给水</text>
      </g>
    </svg>
  </div>;
}
