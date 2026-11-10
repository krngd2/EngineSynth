import {encodeWav} from './wav.js';
import {geometryParameters} from './model.js';
import workletUrl from './worklet-entry.js?worker&url';
export class EngineAudio {
  async start(state) {
    if (!this.context) {
      this.context = new AudioContext();
      await this.context.audioWorklet.addModule(workletUrl);
      this.node = new AudioWorkletNode(this.context, 'engine-processor', {outputChannelCount: [1]});
      this.gain = this.context.createGain(); this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 2048;
      const limiter = this.context.createDynamicsCompressor(); limiter.threshold.value = -8; limiter.ratio.value = 12;
      this.node.connect(this.gain).connect(limiter).connect(this.analyser).connect(this.context.destination);
      this.node.port.onmessage = ({data}) => { if (data.samples && this.recording) this.chunks.push(data.samples); };
    }
    await this.context.resume(); this.update(state); this.node.port.postMessage({running:true});
  }
  update(state) {
    if (!this.node) return;
    this.node.port.postMessage({params:geometryParameters(state)});
    this.gain.gain.setTargetAtTime(state.volume / 100 * 0.8, this.context.currentTime, 0.025);
  }
  stop() { this.node?.port.postMessage({running:false}); }
  record() { this.chunks = []; this.recording = true; this.node.port.postMessage({recording:true}); }
  finishRecording() {
    this.recording = false; this.node.port.postMessage({recording:false});
    return encodeWav(this.chunks,this.context.sampleRate);
  }
}
