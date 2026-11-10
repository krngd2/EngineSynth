import {EngineModel} from './model.js';
class EngineProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.engine=new EngineModel(sampleRate);this.running=false;this.mode=null;
    this.previous=null;this.fade=0;this.fadeSamples=Math.round(sampleRate*.035);
    this.recording=false;this.frames=[];this.count=0;
    this.port.onmessage=({data})=>{
      if(data.params){
        const mode=`${data.params.layout}:${data.params.carId??''}`;
        if(this.mode!==null&&this.mode!==mode){
          this.previous=this.running?this.engine:null;this.fade=0;
          this.engine=new EngineModel(sampleRate);
        }
        this.mode=mode;this.engine.setParameters(data.params);
      }
      if(data.running!==undefined)this.running=data.running;
      if(data.recording!==undefined){this.recording=data.recording;this.frames=[];this.count=0;}
    };
  }
  process(inputs,outputs) {
    const out=outputs[0][0];
    for(let i=0;i<out.length;i++){
      const current=this.engine.sample(this.running);
      if(this.previous){
        const mix=this.fade/this.fadeSamples;
        out[i]=this.previous.sample(this.running)*(1-mix)+current*mix;
        if(++this.fade>=this.fadeSamples)this.previous=null;
      }else out[i]=current;
    }
    if(this.recording){
      this.frames.push(out.slice());this.count+=out.length;
      if(this.count>=4096){
        const samples=new Float32Array(this.count);let n=0;
        for(const f of this.frames){samples.set(f,n);n+=f.length;}
        this.port.postMessage({samples},[samples.buffer]);this.frames=[];this.count=0;
      }
    }
    return true;
  }
}
registerProcessor('engine-processor',EngineProcessor);
