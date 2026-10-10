"use client";

import { useId, type CSSProperties } from "react";
import type { UnitEquipmentId, UnitSystemId } from "@/lib/unit-demo";
import "@/app/motion-twin-enhanced.css";

type Props = {
  alarm?: boolean;
  highLoad?: boolean;
  running?: boolean;
  pumpSpeed?: number;
  turbineSpeed?: number;
  steamLevel?: number;
  selected?: UnitEquipmentId | null;
  system?: UnitSystemId;
  pulseKey?: number;
  alarmPulse?: boolean;
};

/** Only operational accents move; the plant image and equipment casings stay fixed. */
export default function TwinOperatingLayer({ alarm = false, alarmPulse = false, highLoad = false, running = true, pumpSpeed = 4320, turbineSpeed = 3000, steamLevel = 62, selected = null, system = "all", pulseKey = 0 }: Props) {
  const id = useId().replace(/:/g, "");
  const rate = alarm ? .6 : highLoad ? 1.2 : 1;
  const style = {
    "--twin-flow-duration": `${3.2 / rate}s`,
    "--twin-pump-duration": `${3.2 * 4320 / Math.max(600, pumpSpeed)}s`,
    "--twin-turbine-duration": `${3.5 * 3000 / Math.max(300, Number.isFinite(turbineSpeed) ? turbineSpeed : 3000)}s`,
    "--twin-generator-duration": `${7 / (highLoad ? 1.2 : 1)}s`,
  } as CSSProperties;
  const devicePosition: Partial<Record<UnitEquipmentId, [number, number]>> = { reactor: [572, 170], steam: [454, 225], pump: [503, 337], turbine: [673, 285], generator: [719, 285] };
  const selectedPosition = selected ? devicePosition[selected] : undefined;
  return <div className="twin-operating-layer" data-running={running} data-turbine-running={turbineSpeed > 0} data-alarm={alarm} data-system={system} data-selected={selected ?? "none"} data-load={highLoad ? "high" : "normal"} style={style} aria-hidden="true">
    <div className="twin-subtle-scan"/>
    <svg viewBox="0 0 1000 434" preserveAspectRatio="xMidYMid slice">
      <defs><clipPath id={`${id}-sg-water`}><rect x="435" y="178" width="35" height="115" rx="15"/></clipPath></defs>
      <g className="twin-operating-primary" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="twin-pipe-track" d="M407 148H512Q531 148 531 168V189M456 306V323Q456 337 472 337H503"/>
        <path className="twin-primary-flow" d="M407 148H512Q531 148 531 168V189M456 306V323Q456 337 472 337H503"/>
        <path className="twin-pipe-track" d="M558 223H599Q619 223 619 242V277M332 199H353Q365 199 365 213V307H390"/>
        <path className="twin-primary-flow" d="M558 223H599Q619 223 619 242V277M332 199H353Q365 199 365 213V307H390"/>
      </g>
      <g className="twin-operating-secondary" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="twin-pipe-track" d="M374 135H402Q413 135 413 145V157M648 210H731Q746 210 746 225V266"/>
        <path className="twin-steam-flow" d="M374 135H402Q413 135 413 145V157M648 210H731Q746 210 746 225V266"/>
      </g>
      <g className="twin-operating-primary" clipPath={`url(#${id}-sg-water)`}>
        <rect className="twin-liquid-fill" x="435" y={293 - steamLevel * 1.15} width="35" height={steamLevel * 1.15} fill="#16dbc9" opacity=".19"/>
        <path className="twin-liquid-surface" d={`M433 ${293 - steamLevel * 1.15}q9 -2 19 0t19 0`} stroke="#96fff0" fill="none" opacity=".7"/>
      </g>
      <g className="twin-operating-primary" transform="translate(503 337)">
        <circle className="twin-device-outline" r="12"/>
        <g transform="scale(.68)"><g className="twin-pump-rotor">{[0,120,240].map(angle => <path key={angle} transform={`rotate(${angle})`} d="M0-2C1-13 12-13 12-5L3 3Z"/>)}<circle r="2.6"/></g></g>
      </g>
      <g className="twin-operating-secondary" transform="translate(673 285)">
        <ellipse className="twin-device-outline" rx="15" ry="17"/>
        <g transform="scale(.7 .84)"><g className="twin-turbine-rotor">{[0,60,120,180,240,300].map(angle=><path key={angle} transform={`rotate(${angle})`} d="M0-3 4-18 8-15 4 0Z"/>)}<circle r="3"/></g></g>
      </g>
      <g className="twin-operating-electrical" transform="translate(719 285)"><ellipse className="twin-generator-track" rx="7" ry="17"/><ellipse className="twin-generator-ring" rx="7" ry="17"/></g>
      {selectedPosition && <g transform={`translate(${selectedPosition[0]} ${selectedPosition[1]})`}><circle className="twin-selected-outline" r="24"/><circle key={`${selected}-${pulseKey}`} className="twin-device-pulse" r="23"/></g>}
      {alarm && <g transform="translate(503 337)">{alarmPulse && <circle className="twin-alarm-pulse" r="20"/>}<path className="twin-alert-symbol" d="m0-9 9 15H-9Z"/><text className="twin-alert-mark" y="3" textAnchor="middle">!</text></g>}
      <g className="twin-micro-particles">{Array.from({ length: 10 }, (_, index)=><circle key={index} cx={235 + (index * 73) % 610} cy={75 + (index * 47) % 245} r={index % 3 ? 1.1 : 1.5} style={{ animationDelay: `${index * -.83}s`, animationDuration: `${7 + index % 4}s` }}/>)}</g>
    </svg>
  </div>;
}
