import React from 'react';
import { PanelTitle, Slider, EngineIcon } from './Controls.jsx';
import { LAYOUTS, firingAngles } from '../model.js';
import CarStudyInfo from './CarStudyInfo.jsx';
export default function EngineSetup({ state, update, resetCar }) {
  const angles = firingAngles(state).toSorted((a, b) => a - b);
  const intervals = [...new Set(angles.map((a, i) => Math.round((i === angles.length - 1 ? 720 : angles[i + 1]) - a)))];
  const firing = intervals.length === 1 ? `${intervals[0]}° EVEN` : `${intervals.join(' / ')}°`;
  return <section className="panel setup-panel"><PanelTitle aside={state.carId?'CAR STUDY':'4-STROKE'}>Engine setup</PanelTitle><CarStudyInfo state={state} onReset={resetCar}/>
    <div className="engine-settings"><div className="engine-icon"><EngineIcon layout={state.layout}/><span>{String(LAYOUTS[state.layout].cylinders).padStart(2, '0')} CYL</span></div>
      <div className="setup-sliders">
        <Slider label="Bore width" value={state.bore} min={Math.min(20,state.bore)} max={Math.max(240,state.bore)} step={0.1} display={state.bore.toFixed(1)} unit="mm" onChange={v => update('bore', v)}/>
        <Slider label="Bore length" value={state.stroke} min={Math.min(10,state.stroke)} max={Math.max(240,state.stroke)} step={0.1} display={state.stroke.toFixed(1)} unit="mm" onChange={v => update('stroke', v)}/>
        <Slider label="Displacement" min={Math.min(1, Math.floor(state.displacement))} max={Math.max(6500, Math.ceil(state.displacement))} value={state.displacement} display={Math.round(state.displacement)} unit="cc" onChange={v => update('displacement', v)}/>
        <Slider label="Bank angle" min={0} max={state.layout === 'w12' ? 90 : 180} value={state.bankAngle} unit="°" disabled={!['vtwin', 'v8', 'v10', 'v12', 'w12'].includes(state.layout)} onChange={v => update('bankAngle', v)}/>
        <div className="firing-label"><span>Firing interval</span><strong>{firing}</strong></div>
      </div>
    </div><div className="dimension-caption">Bore length = piston stroke. Displacement follows both.</div>
  </section>;
}
