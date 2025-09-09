# 🧃Tonika

Tonika is a modular, browser-based playground for music interaction, built on vanilla JS + Web APIs.
It provides **core modules** (Clavonika piano, Jackonika MIDI bridge, Soundonika audio engine) and
a unified **event system** for wiring them together.

---

## Core modules

All core lives in `/js/core/`:

- ⚡️`tonika-emitter.js` → base event emitter (`Tonika.TonikaEmitter`)
- 🎹`clavonika.js` → piano UI keyboard (`Tonika.Clavonika`)
- 🔌`jackonika.js` → MIDI input bridge (`Tonika.Jackonika`)
- 📻`soundonika.js` → audio/sampler engine (`Tonika.SoundonikaEngine`)

CSS lives in `/css/` (global tokens/components + `clavonika.css`).

Samples + `sample-index.json` live under `/samples/`.

---

## Loading order

On your HTML page:

```html
<link rel="stylesheet" href="css/tonika-core.css">
<link rel="stylesheet" href="css/tonika-components.css">
<link rel="stylesheet" href="css/clavonika.css">

<script src="js/core/tonika-emitter.js"></script>
<script src="js/core/clavonika.js"></script>
<script src="js/core/jackonika.js"></script>
<script src="js/core/soundonika.js"></script>
```

---

## Event system

All core modules extend or use `TonikaEmitter`, which is a thin wrapper around
native `EventTarget`. Every module supports:

- `.on(type, handler)` → add listener (returns unsubscribe fn)
- `.off(type, handler)` → remove listener
- `.emit(type, detail)` → dispatch a `CustomEvent`

Example:

```js
const eng = new Tonika.SoundonikaEngine(audioContext);
eng.on('status', e => console.log('engine status', e.detail));
```

---

## Clavonika 🎹

Factory-style UI piano.

```js
const piano = Tonika.Clavonika.init('piano-container');

// Listen for UI events
piano.on('ui:noteon', e => console.log('note on', e.detail.midi));
piano.on('ui:noteoff', e => console.log('note off', e.detail.midi));

// Trigger programmatically
piano.noteOn(60, 0.9);  // C4, velocity 0.9
piano.noteOff(60);
```

Emits:
- `ui:noteon` `{ midi, velocity }`
- `ui:noteoff` `{ midi }`
- `status` `{ state, msg }`

---

## Jackonika 🎛️

Web MIDI bridge. Handles device hot-plug, remembers last input, and emits
events for note data.

```js
Tonika.Jackonika.init({ selectorId: 'midiDeviceSelector' });

// Event style
Tonika.Jackonika.on('midi:noteon', e => piano.noteOn(e.detail.midi, e.detail.velocity));
Tonika.Jackonika.on('midi:noteoff', e => piano.noteOff(e.detail.midi));

// Still supports old callbacks (shimmed to events):
Tonika.Jackonika.init({
  onNoteOn: (m,v) => piano.noteOn(m,v),
  onNoteOff: m => piano.noteOff(m),
  onStatus: (t,m) => console.log(t,m)
});
```

Emits:
- `midi:noteon` `{ midi, velocity }`
- `midi:noteoff` `{ midi }`
- `midi:devicechange` `{ inputs:[{id,name}] }`
- `status` `{ type:'info'|'warn'|'error', message }`

---

## Soundonika 🔊

Audio/sampler engine. Loads samples from `/samples/sample-index.json`.

```js
const ac = Tonika.getAudioContext ? Tonika.getAudioContext() : new AudioContext();
const eng = new Tonika.SoundonikaEngine(ac, { sampleBasePath: './samples' });

eng.on('status', e => console.log('soundonika status', e.detail));

await eng.init();

piano.on('ui:noteon', e => {
  const t = ac.currentTime + 0.02;
  eng.scheduleSound(t, 'kick', e.detail.velocity);
});
```

Emits:
- `status` `{ state:'loading'|'ready'|'error'|'info', message?, progress? }`

API highlights:
- `init()`, `scheduleSound(time, soundType, velocity)`
- `setVolume(v)`, `getVolume()`
- `setSoundMode('samples'|'clicks')`
- `getSampleMappings()`, `setSampleMappings(map)`
- `isReady()`

---

## TonikaEmitter ⚡

Base class, used by all modules.

```js
class MyThing extends Tonika.TonikaEmitter {
  doStuff() {
    this.emit('status', { state: 'ready' });
  }
}
```

- `.on(type, fn)` → add listener, returns unsubscribe
- `.off(type, fn)` → remove listener
- `.emit(type, detail)` → send event

---

## Demo pages

See `/demo/` for working examples:
- `clavonika.html`
- `jackonika.html`
- `soundonika.html`

See `/developers/tonika_module_dev_updated.html` for the full workbench.

---

## License

MIT. Free to use, hack, and extend.
