import React, {useRef,useId} from 'react';
import {Info,RotateCcw,X,ArrowUpRight} from 'lucide-react';
import {CAR_PRESETS} from '../cars.js';
export default function CarStudyInfo({state,onReset}) {
  const dialog=useRef(),title=useId(),car=CAR_PRESETS[state.carId];
  if(!car)return null;
  return <><div className="car-study-info"><div><strong>{car.name}</strong><span>{car.variant} · {state.carModified?'CUSTOMIZED':'SPEC-BASED STUDY'}</span></div><button aria-label="Reload car preset" title="Restore the car study settings" onClick={onReset}><RotateCcw size={13}/></button><button aria-label="About this car study" title="Sources and modeling assumptions" onClick={()=>dialog.current.showModal()}><Info size={14}/></button></div>
    <dialog ref={dialog} className="car-details" aria-labelledby={title} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div className="help-content"><button className="close-help" aria-label="Close car details" onClick={()=>dialog.current.close()}><X size={19}/></button><span className="help-index">PHYSICAL SOUND STUDY</span><h1 id={title}>{car.name}</h1><p>{car.description}</p><h3>Published engine specifications</h3><p>{car.published}</p><a href={car.source} target="_blank" rel="noreferrer">Manufacturer source <ArrowUpRight size={12}/></a>{car.exhaustSource&&<a href={car.exhaustSource} target="_blank" rel="noreferrer">Exhaust-system reference <ArrowUpRight size={12}/></a>}<h3>Acoustic model</h3><p>{car.estimates}</p><p>Each cylinder excites a primary runner, routed into two independent exhaust banks. Your edits change both banks. Intake pressure and, for the Jaguar, an estimated supercharger rotor-order contribution are synthesized too.</p><p>The {state.revLimit.toLocaleString()} RPM ceiling is a simulation setting. These studies have not been validated against measured recordings, and do not reproduce a complete combustion or gas-flow simulation.</p></div></dialog>
  </>;
}
