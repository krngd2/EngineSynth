export const REV_PROFILES = {
  slow: { label: 'Slow', rise: [0.11, 0.45], fall: [0.17, 0.52], description: 'Heavy flywheel. Gradual rise and a long coast.' },
  natural: { label: 'Natural', rise: [0.065, 0.22], fall: [0.11, 0.30], description: 'Balanced response with smooth engine inertia.' },
  fast: { label: 'Fast', rise: [0.04, 0.13], fall: [0.07, 0.19], description: 'Light flywheel. Quick response with a smooth release.' },
};
export function isRevShortcut(event, enabled, helpOpen) {
  if (event.code !== 'Space' || !enabled || helpOpen || event.altKey || event.ctrlKey || event.metaKey) return false;
  const target = event.target;
  if (target?.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target?.tagName)) return false;
  return target?.tagName !== 'INPUT' || target.type === 'range';
}
// Two damped stages: throttle response followed by crankshaft inertia.
// The exact exponential solution keeps the feel consistent across timer rates.
export function advanceRevMotion(motion, held, returnRpm, seconds, profile = 'natural', revLimit = 8000) {
  if (!held && returnRpm === null) return motion;
  const target = held ? revLimit : returnRpm;
  const response = REV_PROFILES[profile] || REV_PROFILES.natural;
  const [throttleTime, inertiaTime] = held ? response.rise : response.fall;
  const throttleDecay = Math.exp(-seconds / throttleTime);
  const inertiaDecay = Math.exp(-seconds / inertiaTime);
  let drive = target + (motion.drive - target) * throttleDecay;
  let rpm = target + (motion.rpm - target) * inertiaDecay
    + (motion.drive - target) * throttleTime / (throttleTime - inertiaTime)
      * (throttleDecay - inertiaDecay);
  if (Math.abs(rpm - target) < 5 && Math.abs(drive - target) < 5) rpm = drive = target;
  return { rpm, drive };
}

// Keep the selected return point separate from the animated tachometer reading.
export function advanceRevFrame(state, previousMotion, held, seconds) {
  const motion = !previousMotion || state.rpm !== Math.round(previousMotion.rpm / 50) * 50
    ? { rpm: state.rpm, drive: state.rpm }
    : previousMotion;
  const next = advanceRevMotion(motion, held, state.baseRpm, seconds, state.revProfile, state.revLimit ?? 8000);
  return { motion: next, rpm: Math.round(next.rpm / 50) * 50 };
}
