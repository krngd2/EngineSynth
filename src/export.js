export function buildSoundModule(state, modelSource) {
  const processorSource = `${modelSource}\nclass ExportedEngineProcessor extends AudioWorkletProcessor {
    constructor() {
      super(); this.engine = new EngineModel(sampleRate); this.running = false;
      this.port.onmessage = ({data}) => {
        if (data.params) this.engine.setParameters(data.params);
        if (data.running !== undefined) this.running = data.running;
      };
    }
    process(inputs, outputs) {
      const out = outputs[0][0];
      for (let i = 0; i < out.length; i++) out[i] = this.engine.sample(this.running);
      return true;
    }
  }
  registerProcessor('exported-engine', ExportedEngineProcessor);`;
  return `/**
 * Engine / Synth — ${state.carName??state.layout} at ${state.rpm} RPM
 * Standalone ES module. No npm dependencies, samples, or companion files.
 * Serve over HTTPS or localhost; start from a click/tap handler.
 *
 * import { createEngineSound } from './engine-synth-${state.carId??state.layout}.js';
 * const engine = await createEngineSound();
 * await engine.start();
 * engine.setRpm(6000); // optional
 * engine.stop();
 * await engine.dispose(); // when finished
 */
${modelSource}

// Full editor snapshot, including individual pipe widths and bends.
export const soundConfig = ${JSON.stringify(state, null, 2)};
const processorSource = ${JSON.stringify(processorSource)};

export async function createEngineSound(options = {}) {
  const ownsContext = !options.context;
  const context = options.context || new AudioContext();
  const processorName = 'engine-synth-' + Math.random().toString(36).slice(2);
  const url = URL.createObjectURL(new Blob([processorSource.replace('exported-engine', processorName)], { type: 'text/javascript' }));
  try { await context.audioWorklet.addModule(url); }
  catch (error) { if (ownsContext) await context.close(); throw error; }
  finally { URL.revokeObjectURL(url); }
  let config = structuredClone(soundConfig), disposed = false;
  const node = new AudioWorkletNode(context, processorName, { outputChannelCount: [1] });
  const gain = context.createGain(), limiter = context.createDynamicsCompressor(), analyser = context.createAnalyser();
  limiter.threshold.value = -8; limiter.ratio.value = 12; analyser.fftSize = 2048;
  node.connect(gain).connect(limiter).connect(analyser).connect(options.destination || context.destination);
  function update(patch = {}) {
    if (disposed) throw new Error('Engine sound has been disposed');
    config = updateSoundState(config, patch);
    node.port.postMessage({ params: geometryParameters(config) });
    gain.gain.setTargetAtTime(config.volume / 100 * 0.8, context.currentTime, 0.025);
  }
  update();
  return {
    context, analyser,
    get config() { return structuredClone(config); },
    async start() { if (disposed) throw new Error('Engine sound has been disposed'); await context.resume(); node.port.postMessage({ running: true }); },
    stop() { if (!disposed) node.port.postMessage({ running: false }); },
    setRpm(rpm) { update({ rpm: Math.max(600, Math.min(config.revLimit || 8000, rpm)) }); },
    update,
    async dispose() {
      if (disposed) return;
      node.port.postMessage({ running: false });
      node.disconnect(); gain.disconnect(); limiter.disconnect(); analyser.disconnect(); node.port.close();
      disposed = true;
      if (ownsContext) await context.close();
    }
  };
}
`;
}
