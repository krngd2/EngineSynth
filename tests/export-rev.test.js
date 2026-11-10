import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSoundModule } from '../src/export.js';
import { isRevShortcut, advanceRevMotion, advanceRevFrame, REV_PROFILES } from '../src/rev.js';
import { DEFAULT_STATE, EngineModel, geometryParameters, cylinderDisplacement, updateSoundState } from '../src/model.js';

test('Space revs over focused buttons, ranges and diagram handles, but leaves text editing alone', () => {
  for (const target of [{tagName:'BUTTON'}, {tagName:'INPUT',type:'range'}, {tagName:'circle'}, {tagName:'BODY'}]) {
    assert.equal(isRevShortcut({code:'Space', target}, true, false), true);
  }
  for (const target of [{tagName:'INPUT',type:'text'}, {tagName:'TEXTAREA'}, {tagName:'SELECT'}, {isContentEditable:true}]) {
    assert.equal(isRevShortcut({code:'Space',target},true,false),false);
  }
  assert.equal(isRevShortcut({code:'Space'},true,true),false);
  assert.equal(isRevShortcut({code:'Space'},false,false),false);
});
test('rev builds progressively, approaches the limiter in about a second, and settles on release', () => {
  let motion={rpm:2400,drive:2400};
  const history=[];
  for(let i=0;i<100;i++){
    motion=advanceRevMotion(motion,true,2400,.02);history.push(motion.rpm);
    assert.ok(motion.rpm>=2400&&motion.rpm<=8000);
  }
  assert.ok(history[0]-2400 < 100, 'soft initial response');
  assert.ok(history[4]-history[3] > history[1]-history[0], 'inertia builds acceleration');
  assert.ok(history[9]>4500 && history[9]<5500, 'a short blip does not hit the limiter');
  assert.ok(history[39]>7700 && history[39]<8000, 'progressively eases toward redline');
  assert.equal(motion.rpm,8000);
  const released=advanceRevMotion(motion,false,2400,.02);
  assert.ok(released.rpm>7900, 'release coasts instead of instantly dropping');
  for(let i=0;i<150;i++)motion=advanceRevMotion(motion,false,2400,.02);
  assert.equal(motion.rpm,2400);
});
test('rev motion is independent of timer step size',()=>{
  let fine={rpm:2400,drive:2400},coarse={...fine};
  for(let i=0;i<100;i++)fine=advanceRevMotion(fine,true,2400,.01);
  for(let i=0;i<20;i++)coarse=advanceRevMotion(coarse,true,2400,.05);
  assert.ok(Math.abs(fine.rpm-coarse.rpm)<1e-8);
});
test('overlapping rev presses always settle at the selected RPM, not the coast-down RPM', () => {
  let state=updateSoundState(DEFAULT_STATE,{rpm:2000}),motion=null;
  function frames(held,count){
    for(let i=0;i<count;i++){
      const next=advanceRevFrame(state,motion,held,.02);
      motion=next.motion;state={...state,rpm:next.rpm};
      assert.equal(state.baseRpm,2000);
    }
  }
  frames(true,35); frames(false,8);
  assert.ok(state.rpm>2000, 'second press occurs while coasting');
  frames(true,20); frames(false,5);
  frames(true,15); frames(false,160);
  assert.equal(state.rpm,2000);
});
test('manual RPM changes establish a new return point for subsequent revs', () => {
  let state=updateSoundState(DEFAULT_STATE,{rpm:3500}),motion=null;
  for(const held of [...Array(25).fill(true),...Array(160).fill(false)]){
    const next=advanceRevFrame(state,motion,held,.02);
    motion=next.motion;state={...state,rpm:next.rpm};
  }
  assert.equal(state.rpm,3500);assert.equal(state.baseRpm,3500);
});
test('rev response profiles have distinct speeds and preserve idle after overlapping presses',()=>{
  const speeds=[];
  for(const revProfile of Object.keys(REV_PROFILES)){
    let state=updateSoundState(DEFAULT_STATE,{rpm:2000,revProfile}),motion=null;
    function run(held,count){for(let i=0;i<count;i++){const next=advanceRevFrame(state,motion,held,.02);motion=next.motion;state={...state,rpm:next.rpm};assert.equal(state.baseRpm,2000);}}
    run(true,25);speeds.push(state.rpm);
    run(false,5);run(true,10);run(false,300);assert.equal(state.rpm,2000);
  }
  assert.ok(speeds[0]<speeds[1]&&speeds[1]<speeds[2]);
});
test('bore, stroke and displacement stay mathematically consistent', () => {
  const state=updateSoundState(DEFAULT_STATE,{bore:110,stroke:80});
  assert.equal(state.displacement,cylinderDisplacement(110,80,2));
  const scaled=updateSoundState(state,{displacement:1500});
  assert.ok(Math.abs(cylinderDisplacement(scaled.bore,scaled.stroke,2)-1500)<1e-8);
  assert.ok(Math.abs(scaled.bore/scaled.stroke-state.bore/state.stroke)<1e-8);
});
test('equal-displacement cylinders with different bore/stroke and header dimensions sound different', () => {
  function render(patch){const m=new EngineModel();m.setParameters(geometryParameters(updateSoundState(DEFAULT_STATE,patch)));return Float32Array.from({length:24000},()=>m.sample());}
  const base=render({});
  const wider=DEFAULT_STATE.bore*1.25;
  for(const patch of [{bore:wider,stroke:DEFAULT_STATE.stroke/(1.25**2)},{headerLength:.8},{headerDiameter:70}]){
    const b=render(patch);
    assert.ok(b.every(x=>Number.isFinite(x)&&Math.abs(x)<=.7));
    const relativeDifference=Math.sqrt(base.reduce((n,x,i)=>n+(x-b[i])**2,0)/base.reduce((n,x)=>n+x*x,0));
    assert.ok(relativeDifference>.1,JSON.stringify(patch));
  }
});
test('export is a self-contained importable JavaScript module that reproduces the current samples', async () => {
  const modelSource=await readFile(new URL('../src/model.js',import.meta.url),'utf8');
  const state=updateSoundState({...DEFAULT_STATE,points:DEFAULT_STATE.points.map(p=>({...p}))},{bore:105,stroke:81,headerLength:.72,headerDiameter:53,rpm:4250,mechanism:'resonator'});
  state.points[2].r=37;state.points[2].y=210;
  const source=buildSoundModule(state,modelSource);
  const exported=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  assert.deepEqual(exported.soundConfig,state);
  assert.equal(typeof exported.createEngineSound,'function');
  assert.equal(/\bimport\s+[^*]/.test(source.replace(/\/\*[\s\S]*?\*\//g,'')),false);
  const local=new EngineModel(),remote=new exported.EngineModel();
  local.setParameters(geometryParameters(state));remote.setParameters(exported.geometryParameters(exported.soundConfig));
  for(let i=0;i<12000;i++)assert.equal(remote.sample(),local.sample());
});
