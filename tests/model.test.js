import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EngineModel, DEFAULT_STATE, LAYOUTS, geometryParameters} from '../src/model.js';
import {encodeWav} from '../src/wav.js';
function render(p, count=48000) {const m=new EngineModel();m.setParameters(geometryParameters({...DEFAULT_STATE,...p}));return Float32Array.from({length:count},()=>m.sample());}
test('all layouts and exhaust mechanisms produce bounded finite audio',()=>{
  for(const layout of Object.keys(LAYOUTS))for(const mechanism of ['open','muffler','resonator']){
    const a=render({layout,mechanism,rpm:8000,diameter:22,length:0.4},24000);
    assert.ok(a.every(x=>Number.isFinite(x)&&Math.abs(x)<=0.7));
    assert.ok(a.some(x=>Math.abs(x)>0.01),`${layout} ${mechanism} is audible`);
  }
});
test('geometry and mechanisms change generated audio',()=>{
  const a=render({});for(const change of [{length:2.5},{diameter:90},{mechanism:'muffler'},{mechanism:'resonator'},{layout:'single'}]){
    const b=render(change);const diff=a.reduce((n,x,i)=>n+Math.abs(x-b[i]),0)/a.length;assert.ok(diff>0.005,JSON.stringify(change));
  }
});
test('deterministic physical model and silent stopped engine',()=>{
  assert.deepEqual(render({},5000),render({},5000));const m=new EngineModel();assert.equal(m.sample(false),0);
});
test('bending a pipe increases acoustic path length',()=>{
  const a=geometryParameters(DEFAULT_STATE);const points=DEFAULT_STATE.points.map(p=>({...p}));points[2].y+=100;
  assert.ok(geometryParameters({...DEFAULT_STATE,points}).length>a.length);
});
test('bank angle changes firing timing for V and W layouts',()=>{
  for(const layout of ['vtwin','v8','w12']){
    assert.notDeepEqual(geometryParameters({...DEFAULT_STATE,layout,bankAngle:60}).firing,geometryParameters({...DEFAULT_STATE,layout,bankAngle:80}).firing);
  }
});
test('WAV export has a valid PCM header, sample rate, data length and clipped samples',async()=>{
  const blob=encodeWav([new Float32Array([-2,-.5,0,.5,2])],48000),v=new DataView(await blob.arrayBuffer());
  assert.equal(blob.type,'audio/wav');assert.equal(blob.size,54);assert.equal(v.getUint32(24,true),48000);assert.equal(v.getUint32(40,true),10);
  assert.equal(v.getInt16(44,true),-32767);assert.equal(v.getInt16(52,true),32767);
  assert.equal(new TextDecoder().decode(new Uint8Array(v.buffer,0,4)),'RIFF');
});
