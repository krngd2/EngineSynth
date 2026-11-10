/*!
MIT License

Copyright (c) 2026 Engine Synth contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export const LAYOUTS = {
  single: { name: 'Single', cylinders: 1, cc: 450, angle: 0, firing: [0], subtitle: 'ONE CYLINDER. PURE CHARACTER.' },
  parallel: { name: 'Parallel twin', cylinders: 2, cc: 650, angle: 0, firing: [0, 360], subtitle: 'TWO CYLINDERS / PARALLEL' },
  vtwin: { name: 'V-twin', cylinders: 2, cc: 1200, angle: 60, firing: [0, 300], subtitle: 'TWO CYLINDERS / V' },
  boxer: { name: 'Boxer', cylinders: 2, cc: 1000, angle: 180, firing: [0, 360], subtitle: 'TWO CYLINDERS / HORIZONTALLY OPPOSED' },
  inline4: { name: 'Inline-4', cylinders: 4, cc: 2000, angle: 0, firing: [0, 180, 360, 540], subtitle: 'FOUR CYLINDERS / INLINE' },
  v8: { name: 'V8', cylinders: 8, cc: 5000, angle: 90, firing: [0, 90, 270, 180, 450, 360, 540, 630], subtitle: 'EIGHT CYLINDERS / V' },
  v10: { name: 'V10', cylinders: 10, cc: 4805, angle: 72, firing: Array.from({length:10},(_,i)=>i*72), subtitle: 'TEN CYLINDERS / V' },
  v12: { name: 'V12', cylinders: 12, cc: 7291, angle: 60, firing: Array.from({length:12},(_,i)=>i*60), subtitle: 'TWELVE CYLINDERS / V' },
  w12: { name: 'W12', cylinders: 12, cc: 6000, angle: 72, firing: Array.from({ length: 12 }, (_, i) => i * 60), subtitle: 'TWELVE CYLINDERS / THREE BANKS' },
};
export const DEFAULT_POINTS = [{ x: 375, y: 300, r: 21 }, { x: 464, y: 320, r: 21 }, { x: 554, y: 290, r: 27 }, { x: 643, y: 315, r: 27 }, { x: 735, y: 300, r: 23 }];
export function cylinderDisplacement(bore, stroke, cylinders) {
  return Math.PI / 4 * bore * bore * stroke * cylinders / 1000;
}
export function dimensionsForDisplacement(cc, cylinders, ratio = 0.8) {
  const bore = Math.cbrt(cc * 4000 / (Math.PI * cylinders * ratio));
  return { bore, stroke: bore * ratio };
}
export const DEFAULT_STATE = { layout: 'vtwin', displacement: 1200, ...dimensionsForDisplacement(1200, 2), bankAngle: 60, baseRpm: 2400, rpm: 2400, revProfile: 'natural', revLimit: 8000, carId: null, throttle: 28, length: 1.4, diameter: 48, headerLength: 0.35, headerDiameter: 38, mechanism: 'open', volume: 45, points: DEFAULT_POINTS };
export function updateSoundState(state, patch) {
  const next = { ...state, ...patch };
  // Only an explicit RPM/throttle adjustment changes the selected return point.
  if ('rpm' in patch) next.baseRpm = patch.rpm;
  if (state.carId && Object.keys(patch).some(key => !['rpm','baseRpm','volume','revProfile'].includes(key))) next.carModified = true;
  if ('bore' in patch || 'stroke' in patch || 'layout' in patch) {
    next.displacement = cylinderDisplacement(next.bore, next.stroke, LAYOUTS[next.layout].cylinders);
  } else if ('displacement' in patch) {
    // Preserve the bore/stroke ratio when resizing the entire engine.
    Object.assign(next, dimensionsForDisplacement(next.displacement, LAYOUTS[next.layout].cylinders, next.stroke / next.bore));
  }
  return next;
}
export function firingAngles(s) {
  if (s.layout === 'vtwin') return [0, 360 - s.bankAngle];
  if (s.layout === 'v8') return Array.from({ length: 8 }, (_, i) => (Math.floor(i / 2) * 180 + i % 2 * s.bankAngle)%720);
  if (s.layout === 'v10' || s.layout === 'v12') {
    const count=LAYOUTS[s.layout].cylinders, period=1440/count;
    return Array.from({length:count},(_,i)=>(Math.floor(i/2)*period+(i%2)*s.bankAngle)%720);
  }
  if (s.layout === 'w12') return Array.from({ length: 12 }, (_, i) => Math.floor(i / 3) * 180 + i % 3 * s.bankAngle * 5 / 6);
  return LAYOUTS[s.layout].firing;
}
export function geometryParameters(s) {
  let distance = 0;
  for (let i = 1; i < s.points.length; i++) distance += Math.hypot(s.points[i].x - s.points[i - 1].x, s.points[i].y - s.points[i - 1].y);
  const exhaustAreas = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23 * (s.points.length - 1), a = Math.min(s.points.length - 2, Math.floor(t));
    const radius = s.points[a].r + (s.points[a + 1].r - s.points[a].r) * (t - a);
    const muffler = s.mechanism === 'muffler' && i > 12 && i < 21 ? (s.mufflerExpansion ?? 5) : 1;
    return Math.PI * (s.diameter * radius / 24 / 2000) ** 2 * muffler;
  });
  const headerArea = Math.PI * (s.headerDiameter / 2000) ** 2;
  return { ...s, displacement: cylinderDisplacement(s.bore, s.stroke, LAYOUTS[s.layout].cylinders), length: s.length * distance / 360, areas: [...Array(8).fill(headerArea), ...exhaustAreas], firing: firingAngles(s) };
}

// 8 header + 24 exhaust sections. Area-weighted scattering conserves pressure-wave
// energy at static junctions; fractional delays set travel time at 343 m/s.
export class EngineModel {
  constructor(rate = 48000) {
    this.rate = rate; this.phase = 0; this.rpm = 0; this.envelope = 0; this.seed = 1337;
    this.carEngine = null;
    this.radiation = 0; this.dc = 0; this.lastOut = 0; this.chamber1 = 0; this.chamber2 = 0;
    this.right = Array.from({ length: 32 }, () => new Float64Array(512));
    this.left = Array.from({ length: 32 }, () => new Float64Array(512));
    this.head = 0; this.inR = new Float64Array(32); this.inL = new Float64Array(32);
    this.stub = new Float64Array(512); this.stubHead = 0;
    this.setParameters(geometryParameters(DEFAULT_STATE));
  }
  setParameters(p) {
    if (p.bankRouting) {
      if (!this.carEngine) this.carEngine = new BankedEngineModel(this.rate);
      this.carEngine.setParameters(p); this.p = p; return;
    }
    this.carEngine = null;
    this.p = p;
    this.exhaustDelay = p.length / 24 / 343 * this.rate;
    this.headerDelay = p.headerLength / 8 / 343 * this.rate;
    // A damped chamber mode and combustion pulse duration respond to bore/stroke,
    // including engines with equal swept volume but different cylinder proportions.
    const frequency = Math.min(this.rate * 0.2, 343 / (4 * (p.stroke + 0.6 * p.bore) / 1000));
    const pole = Math.exp(-1 / (this.rate * 0.0007));
    this.chamberA = 2 * pole * Math.cos(2 * Math.PI * frequency / this.rate);
    this.chamberB = pole * pole;
    this.chamberGain = 1 - this.chamberA + this.chamberB;
    this.pulseDecay = Math.exp(-1 / (this.rate * (0.0015 + p.stroke * 0.000022)));
    this.rpmSmoothing = 1 - Math.exp(-1 / (this.rate * 0.035));
  }
  read(buffer, delay) {
    const position = (this.head - Math.max(1, Math.min(510, delay)) + 512) % 512;
    const i = Math.floor(position), f = position - i;
    return buffer[i] * (1 - f) + buffer[(i + 1) % 512] * f;
  }
  sample(running = true, excitation) {
    if (this.carEngine) return this.carEngine.sample(running);
    const p = this.p;
    this.rpm += ((running ? p.rpm : 0) - this.rpm) * this.rpmSmoothing;
    const oldPhase = this.phase;
    this.phase = (this.phase + this.rpm / (120 * this.rate)) % 1;
    let ignition = 0;
    if (running) for (const deg of p.firing) {
      const f = deg / 720;
      if ((oldPhase <= f && this.phase > f) || (this.phase < oldPhase && (f >= oldPhase || f < this.phase))) ignition += 1;
    }
    this.envelope = this.envelope * this.pulseDecay + ignition;
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    const noise = this.seed / 4294967296 * 2 - 1;
    const pulse = this.envelope * (0.65 + noise * 0.22) * (0.3 + p.throttle / 100) * Math.sqrt(p.displacement / p.firing.length / 600);
    const source = excitation ?? (pulse * this.chamberGain + this.chamberA * this.chamber1 - this.chamberB * this.chamber2);
    this.chamber2 = this.chamber1; this.chamber1 = source;
    const R = this.inR, L = this.inL, areas = p.areas;
    for (let j = 0; j < 32; j++) {
      const delay = j < 8 ? this.headerDelay : this.exhaustDelay;
      R[j] = this.read(this.right[j], delay); L[j] = this.read(this.left[j], delay);
    }
    const loss = p.mechanism === 'muffler' ? (p.mufflerLoss ?? 0.97) : 0.995;
    // Fixed volume flow produces less pressure in a wider inlet (Z = rho*c/A).
    this.right[0][this.head] = source * Math.min(4, 0.0018 / areas[0]) + L[0] * 0.65;
    for (let j = 0; j < 31; j++) {
      let pressure;
      if (j === 23 && p.mechanism === 'resonator') {
        const d = Math.max(1, Math.floor(this.rate * 0.38 / 343 * 2));
        const stubIn = this.stub[(this.stubHead - d + 512) % 512];
        const branchArea = areas[j] * 0.7;
        pressure = 2 * (areas[j] * R[j] + areas[j + 1] * L[j + 1] + branchArea * stubIn) / (areas[j] + areas[j + 1] + branchArea);
        this.stub[this.stubHead] = (pressure - stubIn) * 0.96;
      } else pressure = 2 * (areas[j] * R[j] + areas[j + 1] * L[j + 1]) / (areas[j] + areas[j + 1]);
      const damping = j < 8 ? 0.996 : loss;
      this.left[j][this.head] = (pressure - R[j]) * damping;
      this.right[j + 1][this.head] = (pressure - L[j + 1]) * damping;
    }
    this.radiation += (R[31] - this.radiation) * 0.22;
    this.left[31][this.head] = -0.86 * this.radiation;
    const raw = R[31] - this.radiation * 0.7;
    const out = raw - this.lastOut + 0.995 * this.dc;
    this.lastOut = raw; this.dc = out;
    this.head = (this.head + 1) % 512; this.stubHead = (this.stubHead + 1) % 512;
    return Math.tanh(out * 1.7) * 0.7;
  }
}

// Car studies: each cylinder excites a delayed primary runner, routed into one
// of two independent collector/exhaust waveguides. No recordings or car-name
// dependent oscillators: geometry, valve pulse timing and bank routing set timbre.
export class BankedEngineModel {
  constructor(rate) {
    this.rate=rate; this.phase=0; this.rpm=0; this.head=0; this.seed=1337; this.rotor=0;
    this.runners=Array.from({length:12},()=>new Float64Array(2048));
    this.pipes=[];
    this.pulse=new Float64Array(2048); this.shapeKey=''; this.carId=null;
    this.intake1=0;this.intake2=0;this.intakeDc=0;this.intakeLast=0;
  }
  setParameters(p) {
    if(this.carId!==p.carId){
      this.carId=p.carId; this.runners.forEach(b=>b.fill(0));
      this.pipes=[new EngineModel(this.rate),new EngineModel(this.rate)];
    }
    this.p=p;
    this.runnerDelays=p.firing.map((_,i)=>Math.min(2046,Math.max(1,p.headerLength*(p.runnerRatios[i]??1)/343*this.rate)));
    const shapeKey=[p.blowdownRise,p.blowdownDecay,p.stroke,p.bore].join(':');
    if(shapeKey!==this.shapeKey){
      this.shapeKey=shapeKey;
      const decay=p.blowdownDecay*Math.sqrt(p.stroke/80),rise=p.blowdownRise*Math.sqrt(p.bore/90);
      for(let i=0;i<2048;i++){
        const degrees=i/2048*720;
        this.pulse[i]=degrees<210?(Math.exp(-degrees/decay)-Math.exp(-degrees/rise))*Math.sin(Math.PI*Math.min(degrees/210,1))**.15:0;
      }
    }
    // The shared editor morphs both banks. Primary delay is above; these eight
    // inlet sections represent a short collector, avoiding double-counting it.
    this.pipes.forEach((pipe,bank)=>{
      const q={...p,bankRouting:null,headerLength:.06,length:p.length*p.collectorRatios[bank]};
      pipe.setParameters(q);
    });
    const intakeFrequency=343/(4*(p.intakeLength??.34));
    const pole=Math.exp(-1/(this.rate*.002));
    this.intakeA=2*pole*Math.cos(2*Math.PI*intakeFrequency/this.rate);
    this.intakeB=pole*pole;this.intakeGain=1-this.intakeA+this.intakeB;
    this.smoothing=1-Math.exp(-1/(this.rate*.035));
  }
  pulseAt(phase) {
    const t=((phase%1)+1)%1*2048,i=Math.floor(t),f=t-i;
    return this.pulse[i]*(1-f)+this.pulse[(i+1)%2048]*f;
  }
  sample(running=true) {
    const p=this.p;
    this.rpm+=((running?p.rpm:0)-this.rpm)*this.smoothing;
    this.phase=(this.phase+this.rpm/(120*this.rate))%1;
    this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;
    const noise=this.seed/4294967296*2-1;
    const load=.25+.65*Math.min(1,this.rpm/(p.revLimit??8000));
    const pressure=Math.sqrt(p.displacement/p.firing.length/600)*Math.pow((p.compression??10)/10,1.2)*(p.superchargerOrder?1+load*.3:1);
    let left=0,right=0,intake=0;
    for(let i=0;i<p.firing.length;i++){
      // Exhaust opening is a modeled 125° after ignition, not a measured cam map.
      const phase=this.phase-p.firing[i]/720-125/720;
      const excitation=running?this.pulseAt(phase)*pressure*(.65+load*.35)*(1+noise*.10)*(1+.018*Math.sin(i*1.73)):0;
      const runner=this.runners[i];runner[this.head]=excitation;
      const position=(this.head-this.runnerDelays[i]+2048)%2048,j=Math.floor(position),f=position-j;
      const wave=runner[j]*(1-f)+runner[(j+1)%2048]*f;
      if(p.bankRouting[i]===0)left+=wave;else right+=wave;
      if(running)intake+=this.pulseAt(phase+.5)*pressure;
    }
    this.head=(this.head+1)%2048;
    const scale=3.5/Math.sqrt(p.firing.length/2);
    const bank0=this.pipes[0].sample(false,left*scale),bank1=this.pipes[1].sample(false,right*scale);
    const intakeWave=intake*this.intakeGain+this.intakeA*this.intake1-this.intakeB*this.intake2;
    this.intake2=this.intake1;this.intake1=intakeWave;
    const intakeOut=intakeWave-this.intakeLast+.995*this.intakeDc;
    this.intakeLast=intakeWave;this.intakeDc=intakeOut;
    this.rotor=(this.rotor+this.rpm/60*(p.superchargerOrder??0)/this.rate)%1;
    const rotorPressure=p.superchargerOrder?(Math.sin(this.rotor*2*Math.PI)+.22*Math.sin(this.rotor*4*Math.PI))*.012*load*Math.min(1,this.rpm/1000):0;
    const mixed=bank0*p.bankMix[0]+bank1*p.bankMix[1]+intakeOut*(p.intakeMix??0)*.12+rotorPressure;
    return Math.tanh(mixed*2.8)*.7;
  }
}
