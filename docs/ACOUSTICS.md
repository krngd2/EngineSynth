# Acoustic model and car studies

[Back to the README](../README.md) · [Contributing presets](../CONTRIBUTING.md)

Engine / Synth is an experimental sound instrument. This document separates what the model simulates, the specifications behind the presets, and the assumptions that still need calibration.

## Generic engine model

The audio engine runs in an AudioWorklet, independently of React and the rendering loop. A four-stroke crank cycle schedules deterministic cylinder firing pulses with a short noisy decay. Displacement scales source flow. A source-flow parameter controls pulse strength; the rev controller sets target RPM.

Bore and stroke tune a damped source-chamber resonance and combustion pulse duration, including different cylinder proportions at equal swept volume. Pulses feed a 32-section bidirectional digital waveguide: eight header sections followed by 24 main exhaust sections. Each section has a fractional delay derived from acoustic path length and a sound speed of 343 m/s. At diameter changes, area-weighted scattering reflects and transmits pressure waves. Inlet acoustic impedance depends on area. The open outlet has a filtered inverted reflection; output is DC-blocked and softly saturated. The muffler expands the middle pipe sections and increases damping. The resonator adds a delayed closed side branch at a three-way scattering junction.

Bending increases the path length; changing local radius changes area and reflections. V-twin firing intervals depend on bank angle. V layouts use simplified bank-offset pulse schedules. Layouts mix cylinder sources into a shared exhaust; they do not model individual tuned headers or a full crankshaft/valvetrain.

This is an experimental acoustic instrument, not an engineering or performance simulator. It does not solve thermodynamic combustion, nonlinear compressible gas flow, temperature-dependent acoustics, turbocharging, or realistic exhaust backpressure. The schematic is interactive and illustrative. Sound has not been calibrated against real engine recordings.

## Car sound studies

Open **Cars** in the preset bar to choose **Lexus LFA**, **Pagani Zonda F**, or **Jaguar F-Type R**. Their headers and exhaust remain editable. The information button in Engine setup shows sources and modeling assumptions; **Reload car preset** restores the initial study after modifications. Changing back to a generic engine removes the car-specific acoustic model.

These are manufacturer-informed physical sound studies, **not calibrated or exact reproductions of recordings**. No engine recordings or third-party sound assets are embedded.

| Study | Published basis | Modeled ceiling |
| --- | --- | --- |
| Original Lexus LFA | 72° V10, 88 × 79 mm, 4,805 cc | 9,000 RPM (published maximum) |
| Pagani Zonda F | 60° AMG V12, 7,291 cc | 7,000 RPM (modeling estimate) |
| Jaguar F-Type R, 550 PS variant | Supercharged V8, 92.5 × 93 mm, 5.0 L, 9.5:1 compression | 7,000 RPM (modeling estimate) |

Sources: [Lexus specifications](https://media.lexus.co.uk/gazoo-racing-lexus-lfa/), [Lexus exhaust description](https://media.lexus.ca/en/releases/2009/lexus-debuts-lfa.html), [Pagani Zonda F](https://www.pagani.com/zonda-f/), and [Jaguar manufacturer brochure](https://www.jaguar.com/content/dam/jdx/pdfs/uk/F-TYPE_19.5MY_MB_V1e_GB-EN_DX.pdf).

The Zonda model uses a 92.4 mm assumed stroke and derives bore from the published capacity; those dimensions are not attributed to Pagani's cited specification. Runner lengths/diameters, collector balance, compression for the Zonda, exhaust absorption/expansion, intake contribution, valve pulse shape, and blower order are modeled estimates for all applicable studies. Acoustic fidelity has not been measured against reference recordings. The current model does not synthesize calibrated overrun crackles, cam phasing, full supercharger thermodynamics, or nonlinear hot-gas flow.

Each cylinder generates a crank-angle-dependent exhaust-valve/blowdown pressure pulse. Fractional-delay primary runners route the pulses to **two independently resonating collector/exhaust waveguides**. The Jaguar uses uneven cross-plane bank pulse groups and an estimated rotor-order pressure-ripple contribution; the Lexus and Pagani use balanced bank routing. A damped intake pressure mode adds induction contribution. This is more detailed than the generic shared-pipe instrument, while retaining the same geometry editor. Switching engine families crossfades briefly to reduce clicks.

Car selection sets the cylinder topology, geometry, source parameters, bank routing and RPM ceiling together. The RPM slider, rev controller and standalone JavaScript export respect each ceiling. Export embeds the complete banked DSP and all current customized geometry, with no runtime dependency on the app.
