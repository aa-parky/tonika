# 🎛 Tonika

Tonika is a modular, browser-based music rack. Each module is a self-contained UI/audio tool that plugs into a shared rack architecture — perfect for live musical experimentation, prototyping, or educational environments.

> Goblin-built and beautifully themed, Tonika is designed to be developer-friendly, themable, and interoperable.

---

## ✨ Current Modules

### 🎹 Clavonika
- 88-key virtual piano keyboard
- Responds to Web MIDI input
- Emits: `ui:noteon`, `ui:noteoff`, `app:status`

### 🎼 Chordonika
- Chord selector and visualizer
- Highlights notes on Clavonika
- Emits: `ui:chordselected`, `app:status`

### 🎛 Jackonika
- Web MIDI input bridge (device selection + note monitoring)
- Emits: `midi:noteon`, `midi:noteoff`, `midi:devicechange`, `app:status`

### 🔊 Soundonika
- Core audio engine for playing mapped audio samples
- Uses `sample-index.json` to preload sounds
- Emits: `audio:status`, `app:mappings_updated`

### 🎧 Chordify Integration
- Inline iframe-based player for curated songs
- Built using `song_data.json` table for selection
- Provides visual tabular access to preselected chordified YouTube tracks

---

## 🔁 Unified Event Taxonomy

All modules emit events via `tonika-emitter.js`, following a shared format:
- `ui:*` — user interface actions (notes, chords, tabs)
- `midi:*` — hardware MIDI events
- `audio:*` — audio status or sample playback
- `app:*` — general status messages and logs

Use `TonikaEmitter.on(...)` to subscribe and coordinate between modules.

---

## 🎨 Theming

Tonika supports multiple visual themes via CSS class switching:
- Dark/Light base themes
- Extended palettes via `/css/themes/*.css`
- Uses CSS variables (`tonika-tokens.css`) for consistent styling

Switch theme by toggling the class on `<body>`:
```js
document.body.classList.toggle('tonika-theme-dark');
```

---

## 📁 Project Structure

```
tonika/
├── css/
│   ├── tonika-layout.css          # Core layout styles
│   ├── tonika-components.css      # Buttons, inputs, etc.
│   ├── tonika-tokens.css          # Design tokens (colors, spacing)
│   ├── themes/                    # Optional alternate themes
├── js/core/
│   ├── clavonika.js               # Piano keyboard
│   ├── chordonika.js              # Chord visualizer
│   ├── jackonika.js               # MIDI device handler
│   ├── soundonika.js              # Audio engine
│   ├── tonika-emitter.js          # Shared event bus
│   ├── tonika-ui.js               # Common UI helpers
│   ├── tonika-theme.js            # Theme switching logic
├── demo/
│   ├── clavonika.html             # Individual module tests
│   ├── chordify-demo.html         # Chordify integration test
├── developers/
│   ├── tonika_module_dev_updated.html # Dev onboarding shell
├── samples/
│   ├── sample-index.json          # Sample map used by Soundonika
│   ├── percussion/...             # Audio samples
├── song_data.json                 # Chordify song definitions
├── tonika.html                    # Main multi-module rack view
└── README.md                      # You're here!
```

---

## 👨‍💻 Developer Guide

### Creating a Module
1. Use BEM naming: `.yourmodule`, `.yourmodule__element`, `.yourmodule--modifier`
2. Wrap in: `<div class="tonika-module yourmodule yourmodule--card">`
3. Export a JS class with `.init()` and `.destroy()` methods
4. Emit events using `TonikaEmitter.emit('ui:youraction', payload)`
5. Respect layout and theme tokens

### Dev Shell
Use `developers/tonika_module_dev_updated.html` to:
- Mount modules easily (`new YourModule({ mount: "#demo-mount" })`)
- Test themes and tab switching
- Auto-refresh during development

---

## 🚧 TODO / Ideas

- [ ] Extract shared logic to `tonika-utils.js`
- [ ] Auto-generate module documentation
- [ ] Add npm/Vite dev server and build scripts
- [ ] Create config-driven rack loader from JSON
- [ ] Improve dark/light toggle UX globally

---

## 🧪 Credits & Philosophy

Hand-forged by Goblin hands 🐾 in the spirit of modularity, joy, and musical experimentation.

MIT Licensed — feel free to fork, extend, and remix.
