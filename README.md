# Tonika 🎛️🎹 — Modular MIDI Rack System

**Tonika** is a modular, front-end rack UI for exploring MIDI interactions, audio control, and musical tooling — built with zero frameworks and pure Goblin engineering™. It’s designed for extensibility, visual clarity, and musician-first usability.

---

## 🎚️ Module Overview

Each module lives in its own JS file (`js/core/*.js`) and follows a unified mounting + rendering pattern.

| Module          | Description                                                          |
|-----------------|----------------------------------------------------------------------|
| `Catchonika`    | Live session logger & idle-aware recorder (BPM-aware take tracker).  |
| `Rhythonika`    | Smart metronome with polyrhythm & accented beat patterns.            |
| `Clavonika`     | Fully interactive piano keyboard with MIDI input support.            |
| `Chordonika`    | Chord detection and callback-based event logging.                    |
| `Chordify`      | Embedded library browser and iframe player for Chordify integration. |
| `Soundonika`    | Audio playback engine — sample loader with fallback click sounds.    |
| `TonikaEmitter` | Lightweight EventTarget wrapper for intra-module events.             |

---

## 🧠 Core Architecture

- **BEM-style CSS**: Every module follows the `.tonika-module yourmodule yourmodule--card` root pattern.
- **No frameworks**: Pure vanilla JS (ES6), HTML, and CSS — fully tree-shakable.
- **Dark/light theme toggle** via `TonikaTheme.toggleMode()`.
- **Local sample support**: Uses `sample-index.json` to preload local assets.
- **Fallback sounds**: Rhythonika plays clicks if samples are unavailable.
- **Registry-safe**: Modules are also attached to `window.TonikaModules` for legacy compatibility.

---

## ⚙️ Module Initialization Examples

```js
new Catchonika({
  mount: "#catchonika-card",
  bufferMinutes: 60,
  defaultBpm: 120,
});

new Rhythonika({
  mount: "#rhythonika-mount",
  mode: "card",
});

new Chordonika({
  mount: "#chord-selector",
  onChordSelected: (chord) => console.log(chord),
});
```

---

## 🗂️ Directory Structure

```
tonika/
├── css/
│   ├── tonika-layout.css
│   ├── tonika-components.css
│   └── [module].css
├── js/
│   ├── core/
│   │   ├── catchonika.js
│   │   ├── rhythonika.js
│   │   ├── chordonika.js
│   │   ├── clavonika.js
│   │   ├── chordify.js
│   │   ├── soundonika.js
│   │   └── tonika-[ui|theme|emitter].js
│   └── vendor/
│       └── midiwriter.js
├── samples/
│   └── sample-index.json
└── tonika.html
```

---

## 🥁 Sample Management

Rhythonika + Soundonika use `samples/sample-index.json` to locate local samples by category/pack. If missing or invalid, it falls back to built-in click sounds.

You can define your own mapping via:

```js
audioEngine.setSampleMappings({
  kick: "percussion/MyPack/kick1.wav",
  snare: "percussion/MyPack/snare1.wav",
});
```

---

## 🎨 Styling & Themes

- `tonika-theme-base.css` handles light/dark token logic.
- Module cards adapt to the current theme automatically.
- CSS variables used throughout: `--color-bg-primary`, `--spacing-md`, etc.
- All components use `.tonika-*` shared utility classes.

---

## 📄 License

GPL-3.0 license © 2025 [aa-parky](https://github.com/aa-parky/tonika/blob/main/LICENSE)

Goblins bless the rack.