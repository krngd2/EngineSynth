import React from 'react';
export function Slider({label,value,min,max,step=1,unit='',display,onChange,disabled=false}) {
  const id=React.useId();
  return <div className={`slider-row ${disabled?'disabled':''}`}><label htmlFor={id}>{label}</label><input id={id} aria-label={label} aria-valuetext={display!==undefined?`${display} ${unit}`:undefined} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(+e.target.value)} style={{'--fill':`${(value-min)/(max-min)*100}%`}}/><output htmlFor={id}>{display??value}<span>{unit}</span></output></div>;
}
export function PanelTitle({children,aside}) {return <div className="panel-title"><h2>{children}</h2>{aside&&<span>{aside}</span>}</div>;}
export function EngineIcon({layout='vtwin'}) {
  const angles=layout==='boxer'?[-90,90]:layout==='single'?[0]:layout==='parallel'||layout==='inline4'?[-8,8]:[-28,28];
  return <svg viewBox="0 0 110 90" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><path d="M20 83h70l-5-12H25z"/><circle cx="55" cy="62" r="18"/><circle cx="55" cy="62" r="9"/>{angles.map((a,i)=><g key={i} transform={`translate(55 62) rotate(${a})`}><path d="M-6-15v-20h12v20"/><rect x="-14" y="-55" width="28" height="24" rx="2"/>{[-53,-48,-43,-38].map(y=><path key={y} d={`M-18 ${y}h36`}/>)}<path d="M-8-55v-5H8v5"/></g>)}</svg>;
}
