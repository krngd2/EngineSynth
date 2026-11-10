# Contributing to Engine / Synth

Help grow the garage. New tuned presets, improvements to the existing LFA/Zonda/F-Type studies, and better physical modeling are all welcome.

You can contribute a small, carefully explained tuning change. You do not need to build a new sound engine first.

## Get running

Use Node.js 22.12+ or 20.19+ and npm:

```sh
npm ci
npm run dev
```

Before opening a pull request:

```sh
npm test
npm run build
```

## Add a tuned car preset

Car studies live in [`src/cars.js`](src/cars.js). Start by duplicating the closest existing entry under a new, stable ID. Entries in `CAR_PRESETS` appear automatically in the **Cars** tab.

1. **Identify the exact engine.** Include the car, variant, model year or generation, and relevant modifications. A stock road car and a track exhaust deserve different descriptions.
2. **Source the specifications.** Prefer manufacturer specifications or technical documentation. Put the reference URL in `source`, verified facts in `published`, and acoustic assumptions in `estimates`. An `exhaustSource` link is optional.
3. **Set the geometry and operating range.** Choose a supported `layout`, bore/stroke in millimetres, bank angle in degrees, idle `rpm`/`baseRpm`, and `revLimit`. If the real limiter is unknown, say that the ceiling is a modeling estimate.
4. **Configure the banks and runners.** `bankRouting` and `runnerRatios` each need one entry per cylinder. Route cylinders to bank `0` or `1`; use positive runner ratios. `collectorRatios` and `bankMix` each have two entries; bank mix weights should sum to one.
5. **Tune the acoustic assumptions.** Adjust header/exhaust dimensions, muffler expansion and damping, blowdown pulse shape, intake contribution, and supercharger order where applicable. Preserve a visible distinction between measured specifications and values chosen by ear.
6. **Update the documentation and tests.** Add the study to the README garage table and the expected topology/capacity cases in [`tests/cars.test.js`](tests/cars.test.js). Update the in-app help list in [`src/App.jsx`](src/App.jsx) when appropriate.

Convert a reference firing order into bank indices using that engine's cylinder-numbering convention; do not put cylinder numbers directly into `bankRouting`. Keep `runnerRatios` in the same firing-event order.

### Parameter map

| Parameters | Meaning / units |
| --- | --- |
| `bore`, `stroke`, `headerDiameter`, `diameter` | Millimetres |
| `headerLength`, `length`, `intakeLength` | Metres |
| `rpm`, `baseRpm`, `revLimit` | RPM; `baseRpm` is the return point after revving |
| `bankAngle` | Degrees |
| `bankRouting` | Bank index for each firing event, in the same order as `firingAngles()` |
| `runnerRatios`, `collectorRatios` | Positive length multipliers |
| `bankMix` | Relative output contribution of the two banks |
| `blowdownRise`, `blowdownDecay` | Crank-angle pulse-shape scales in degrees |
| `compression` | Modeled compression ratio |
| `mufflerExpansion`, `mufflerLoss` | Area multiplier and per-junction damping factor |
| `intakeMix` | Intake contribution to the output |
| `superchargerOrder` | Modeled pressure-ripple cycles per crankshaft revolution; zero disables it |

If your engine needs an unsupported layout, extend `LAYOUTS`, `firingAngles()`, and the diagram as well. Presets are not limited to the currently featured cars, but a different bank topology may also need DSP work.

## Tune an existing preset

The current presets have not been calibrated against measured recordings. Helping them sound more convincing is a priority.

- Pick a specific behavior: idle character, a steady RPM, a rev sweep, or the coast-down.
- Link the reference recording and identify the useful timestamps. Note the approximate RPM and whether the car is under load when known.
- Compare at similar RPM and listening level. A louder version can seem better without being more accurate.
- Describe which parameters changed and what improved. Mark values chosen by ear as estimates.
- Include before/after audio, spectral comparisons, or listening notes when available. Use recordings you made or have permission to share; link third-party reference clips.

A parameter-only preset change is a good contribution. Changes to the shared DSP should explain their effect on the other presets too.

## Validate the result

Check idle, a middle RPM, and the modeled ceiling. Try a sweep and repeated rev presses before the engine has finished coasting down.

Confirm that:

- Audio remains finite, audible, and free from unintended clicks or harsh clipping.
- Bore/stroke, cylinder count, and displacement agree.
- The rev controller returns to the original selected RPM and respects the preset's ceiling.
- Bending or resizing the exhaust still changes the sound.
- Switching presets and restoring a customized study work.
- The standalone JavaScript export reproduces the current preset and customized geometry.

Add meaningful regression checks for changed behavior. Existing tests cover signal bounds, geometry changes, bank timing, rev behavior, WAV encoding, and sample parity with exported modules.

## Where things live

| File | Purpose |
| --- | --- |
| [`src/cars.js`](src/cars.js) | Car studies, references, and acoustic estimates |
| [`src/model.js`](src/model.js) | Generic and banked physical sound models |
| [`src/rev.js`](src/rev.js) | Rev response profiles and motion |
| [`src/worklet-entry.js`](src/worklet-entry.js) | Real-time processing and preset crossfades |
| [`src/export.js`](src/export.js) | Self-contained JavaScript export |
| [`src/components/`](src/components/) | Workbench controls, diagram, and analysis displays |
| [`tests/`](tests/) | Audio, geometry, export, and interaction-logic checks |
| [`docs/ACOUSTICS.md`](docs/ACOUSTICS.md) | Model details, preset sources, and limitations |

## Open a pull request

Fork the repository, make a focused branch, and explain the engine or sound behavior you are improving. Include specification/reference links, distinguish verified values from estimates, and report your checks. The pull-request template provides a short starting point.

Documentation, accessibility, browser compatibility, and game/video integration examples are welcome too.

## License and credit

Contributions are included under the project's [MIT License](LICENSE). Keep existing attribution and include the sources behind your preset. Engine / Synth is inspired by [Chimera](https://github.com/jamesondh/chimera-vocal-synth).
