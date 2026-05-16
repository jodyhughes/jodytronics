# jodytronics — Agent Context

## Project
Browser-based synthesizer and tape loop instrument inspired by Frippertronics (Robert Fripp's tape delay technique). Deployed at jodytronics.jodyhughes.com on AWS Amplify.

## Commands

```bash
npm run dev      # Start Vite dev server at http://localhost:5173/
npm run build    # Build to dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint
```

Requires Node 20+. No test suite.

## Architecture

React + Vite app. All audio runs through the Web Audio API — no external audio libraries.

**Signal chain:**
```
Synth → TapeDelay → Phaser → Reverb → StereoWidener → MasterGain → Limiter → destination
```

**Audio modules** (`src/audio/`):
- `audioContext.js` — shared singleton `AudioContext`; `resumeContext()` handles the browser autoplay gate
- `Synth.js` — 8-voice polyphonic subtractive synth; voices are pooled and stolen oldest-first; params: tune, detune, subMix, noise, cutoff, res, attack, release
- `Voice.js` — single voice: dual detuned oscillators + sub-osc + noise, lowpass filter, ADSR envelope
- `TapeDelay.js` — tape delay with wow/flutter (LFO-modulated delay time), waveshaper saturation, HF damping, DC blocker, feedback loop. `stop()` clears the delay buffer by swapping in a fresh `DelayNode`
- `Phaser.js` — all-pass phaser with LFO rate/depth/center controls
- `Reverb.js` — convolution reverb with decay, damping, pre-delay
- `StereoWidener.js` — mid/side stereo width control
- `MidiController.js` — Web MIDI API; CC1 → cutoff, CC11 → delay wet
- `presets.js` — named preset bank (only shown in dev mode)

**Components** (`src/components/`):
- `Keyboard.jsx` — on-screen piano keyboard; fires `onNoteOn` / `onNoteOff`
- `Knob.jsx` — rotary knob control; drag to adjust, double-click to reset to default
- `TapeMachines.jsx` — animated reel-to-reel tape machine UI with VU meters (dry left, wet right)
- `OpArtCanvas.jsx` — animated op-art background canvas
- `Presets.jsx` / `Presets.css` — dev-only preset loader/saver panel

**Themes:** `default`, `vector`, `psychedelic` — toggled via `theme-btn` in the header; applied as a CSS class on `.app`

**Panels:** Tape Delay, Phaser, Reverb, Synthesizer — each collapsible. All knob values are wired live to their audio node via setters (no re-render needed for audio updates).

## Deployment

AWS Amplify connected to GitHub. Push to `main` triggers build and deploy automatically.
