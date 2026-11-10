import { DEFAULT_POINTS, cylinderDisplacement, LAYOUTS } from './model.js';

// Published geometry is kept separate from acoustic estimates. These are studies,
// not measured/calibrated reproductions of the manufacturers' exhaust systems.
export const CAR_PRESETS = {
  lfa: {
    name: 'Lexus LFA', variant: 'Original 4.8 V10', description: 'Even-fire V10 · equal-length primary runners',
    source: 'https://media.lexus.co.uk/gazoo-racing-lexus-lfa/',
    exhaustSource: 'https://media.lexus.ca/en/releases/2009/lexus-debuts-lfa.html',
    published: '10 cylinders, 72° bank angle, 88 × 79 mm bore/stroke, 4,805 cc and 9,000 rpm maximum.',
    estimates: 'Runner/collector lengths, muffler expansion and losses, pulse shape, and intake contribution are acoustic estimates. Not recording-calibrated.',
    settings: {
      layout: 'v10', bore: 88, stroke: 79, bankAngle: 72, rpm: 1000, baseRpm: 1000, revLimit: 9000, revProfile: 'fast',
      headerLength: .62, headerDiameter: 42, length: 1.52, diameter: 65, mechanism: 'muffler',
      mufflerExpansion: 2.4, mufflerLoss: .992, compression: 12,
      bankRouting: [0,1,0,1,0,1,0,1,0,1], runnerRatios: Array(10).fill(1), collectorRatios: [1,1], bankMix: [.5,.5],
      blowdownRise: 2.2, blowdownDecay: 24, intakeMix: .05, intakeLength: .28, superchargerOrder: 0,
    },
  },
  zonda: {
    name: 'Pagani Zonda F', variant: '7.3 AMG V12', description: 'Even-fire V12 · large-capacity exhaust pulse train',
    source: 'https://www.pagani.com/zonda-f/',
    published: 'Mercedes-AMG V12, 60° banks, 7,291 cc. Manufacturer peak power is specified at 6,150 rpm.',
    estimates: 'The 92.4 mm model stroke and derived bore, 7,000 rpm simulation ceiling, runner dimensions, pulse shape and exhaust losses are estimates. Not recording-calibrated.',
    settings: {
      layout: 'v12', bore: Math.sqrt(7291*4000/(Math.PI*12*92.4)), stroke: 92.4, bankAngle: 60, rpm: 900, baseRpm: 900, revLimit: 7000, revProfile: 'natural',
      headerLength: .76, headerDiameter: 46, length: 1.22, diameter: 76, mechanism: 'muffler',
      mufflerExpansion: 1.8, mufflerLoss: .993, compression: 10.5,
      bankRouting: [0,1,0,1,0,1,0,1,0,1,0,1], runnerRatios: [1,1,1,1,1,1,1,1,1,1,1,1], collectorRatios: [1,1.012], bankMix: [.51,.49],
      blowdownRise: 3.5, blowdownDecay: 36, intakeMix: .025, intakeLength: .37, superchargerOrder: 0,
    },
  },
  ftype: {
    name: 'Jaguar F-Type R', variant: '5.0 supercharged V8 · 550 PS', description: 'Cross-plane V8 · uneven bank pulses · rotor whine',
    source: 'https://www.jaguar.com/content/dam/jdx/pdfs/uk/F-TYPE_19.5MY_MB_V1e_GB-EN_DX.pdf',
    published: '5.0-litre supercharged V8, 92.5 × 93 mm bore/stroke, 9.5:1 compression. Based on the 550 PS R variant.',
    estimates: 'The 7,000 rpm simulation ceiling, runner routing/lengths, bank balance, valve pulse shape, and supercharger rotor-order sound are estimates. No measured overrun/recording calibration.',
    settings: {
      layout: 'v8', bore: 92.5, stroke: 93, bankAngle: 90, rpm: 850, baseRpm: 850, revLimit: 7000, revProfile: 'natural',
      headerLength: .48, headerDiameter: 43, length: 2.10, diameter: 66, mechanism: 'muffler',
      mufflerExpansion: 3.6, mufflerLoss: .989, compression: 9.5,
      bankRouting: [0,1,0,0,1,0,1,1], runnerRatios: [.9,1.12,.97,1.2,.92,1.05,.88,1.15], collectorRatios: [1,1.045], bankMix: [.56,.44],
      blowdownRise: 4.5, blowdownDecay: 46, intakeMix: .035, intakeLength: .44, superchargerOrder: 8.4,
    },
  },
};
const ACOUSTIC_FIELDS = ['bankRouting','runnerRatios','collectorRatios','bankMix','mufflerExpansion','mufflerLoss','compression','blowdownRise','blowdownDecay','intakeMix','intakeLength','superchargerOrder'];
export function selectCarPreset(state, id) {
  const preset = CAR_PRESETS[id];
  if (!preset) throw new Error(`Unknown car preset: ${id}`);
  const settings = structuredClone(preset.settings);
  return { ...state, ...settings, carId: id, carName: preset.name, carModified: false, displacement: cylinderDisplacement(settings.bore, settings.stroke, LAYOUTS[settings.layout].cylinders), points: DEFAULT_POINTS.map(p=>({...p,r:24})) };
}
export function clearCarPreset(state) {
  const next = { ...state, carId: null, carName: null, carModified: false, revLimit: 8000, rpm: Math.min(state.rpm,8000), baseRpm: Math.min(state.baseRpm,8000) };
  for (const key of ACOUSTIC_FIELDS) delete next[key];
  return next;
}
