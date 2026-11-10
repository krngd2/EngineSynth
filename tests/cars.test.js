import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CAR_PRESETS,selectCarPreset,clearCarPreset} from '../src/cars.js';
import {DEFAULT_STATE,EngineModel,geometryParameters,updateSoundState,firingAngles} from '../src/model.js';
import {advanceRevFrame} from '../src/rev.js';
import {buildSoundModule} from '../src/export.js';
function render(state,rate=48000,duration=.5){const m=new EngineModel(rate);m.setParameters(geometryParameters(state));return Float32Array.from({length:Math.round(rate*duration)},()=>m.sample());}
function rms(a){return Math.sqrt(a.reduce((n,x)=>n+x*x,0)/a.length);}
test('car studies apply the right topology and sourced capacity, while preserving volume',()=>{
  for(const [id,layout,capacity,limit] of [['lfa','v10',4805,9000],['zonda','v12',7291,7000],['ftype','v8',5000,7000]]){
    const s=selectCarPreset({...DEFAULT_STATE,volume:31},id);
    assert.equal(s.layout,layout);assert.equal(s.volume,31);assert.equal(Math.round(s.displacement),capacity);assert.equal(s.revLimit,limit);
    assert.equal(s.baseRpm,s.rpm);assert.equal(s.carModified,false);
    const p=geometryParameters(s);assert.equal(p.firing.length,p.bankRouting.length);
    assert.ok(p.bankRouting.includes(0)&&p.bankRouting.includes(1));
  }
});
test('car selection and modifications do not mutate preset defaults, and generic engines clear the car model',()=>{
  const a=selectCarPreset(DEFAULT_STATE,'lfa'),b=selectCarPreset(DEFAULT_STATE,'lfa');
  a.points[1].r=50;a.bankRouting[0]=1;
  assert.equal(b.points[1].r,24);assert.equal(b.bankRouting[0],0);
  assert.equal(updateSoundState(b,{diameter:70}).carModified,true);
  assert.equal(updateSoundState(b,{rpm:6000}).carModified,false);
  const cleared=clearCarPreset({...a,rpm:9000,baseRpm:9000});
  assert.equal(cleared.carId,null);assert.equal(cleared.bankRouting,undefined);assert.equal(cleared.revLimit,8000);assert.equal(cleared.rpm,8000);
});
test('all three car studies produce finite audible audio at idle and their ceiling across sample rates',()=>{
  for(const id of Object.keys(CAR_PRESETS))for(const rate of [44100,48000]){
    const s=selectCarPreset(DEFAULT_STATE,id);
    for(const rpm of [s.baseRpm,s.revLimit]){
      const a=render({...s,rpm},rate,.35);
      assert.ok(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=.7),`${id} ${rate} ${rpm}`);
      assert.ok(rms(a)>.001,`${id} is audible`);
    }
  }
});
test('car sounds are distinct at the same RPM and the exhaust editor still changes each sound',()=>{
  const sounds=[];
  for(const id of Object.keys(CAR_PRESETS)){
    const s={...selectCarPreset(DEFAULT_STATE,id),rpm:5000},a=render(s);sounds.push(a);
    const points=s.points.map(p=>({...p}));points[2].y=170;points[2].r=46;
    for(const patch of [{length:2.8},{headerLength:.17,headerDiameter:26},{points},{mechanism:'open'}]){
      const b=render({...s,...patch});const difference=rms(a.map((v,i)=>v-b[i]))/rms(a);
      assert.ok(difference>.1,`${id}: ${JSON.stringify(patch)}`);
    }
  }
  for(let i=0;i<sounds.length;i++)for(let j=i+1;j<sounds.length;j++){
    const a=sounds[i],b=sounds[j],ra=rms(a),rb=rms(b);
    assert.ok(rms(a.map((v,k)=>v/ra-b[k]/rb))>.5,'difference is more than master gain');
  }
});
test('car bank timing remains valid across editable bank angles',()=>{
  for(const id of Object.keys(CAR_PRESETS))for(const bankAngle of [0,60,120,180]){
    const s={...selectCarPreset(DEFAULT_STATE,id),bankAngle};
    assert.ok(firingAngles(s).every(angle=>angle>=0&&angle<720));
  }
});
test('each car revs to its own ceiling and overlapping presses return to its original idle',()=>{
  for(const id of Object.keys(CAR_PRESETS)){
    let s=selectCarPreset(DEFAULT_STATE,id),motion=null;const idle=s.baseRpm;let peak=s.rpm;
    for(const held of [...Array(160).fill(true),...Array(10).fill(false),...Array(20).fill(true),...Array(350).fill(false)]){
      const frame=advanceRevFrame(s,motion,held,.02);motion=frame.motion;s={...s,rpm:frame.rpm};peak=Math.max(peak,s.rpm);assert.equal(s.baseRpm,idle);assert.ok(s.rpm<=s.revLimit);
    }
    assert.equal(s.rpm,idle);assert.equal(peak,s.revLimit);
  }
});
test('exported standalone car models reproduce the app samples with customized pipes',async()=>{
  const modelSource=await readFile(new URL('../src/model.js',import.meta.url),'utf8');
  for(const id of Object.keys(CAR_PRESETS)){
    let s=selectCarPreset(DEFAULT_STATE,id);s=updateSoundState(s,{rpm:6000,headerLength:.83,diameter:57});
    const module=await import(`data:text/javascript;base64,${Buffer.from(buildSoundModule(s,modelSource)).toString('base64')}`);
    assert.deepEqual(module.soundConfig,s);
    const a=new EngineModel(),b=new module.EngineModel();a.setParameters(geometryParameters(s));b.setParameters(module.geometryParameters(module.soundConfig));
    for(let i=0;i<12000;i++)assert.equal(a.sample(),b.sample());
  }
});
