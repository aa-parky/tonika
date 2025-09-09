# 🧃 Tonika

Tonika is a modular, browser-based playground for music interaction, built with vanilla JS + Web APIs. It offers drop-in core modules, a unified event system, global theming, and flexible UI layout.

---

## 📦 Core Modules

Located in `/js/core/`:

| File                | Role                                     |
|---------------------|------------------------------------------|
| `tonika-emitter.js` | Base event emitter (EventTarget wrapper) |
| `tonika-theme.js`   | Theme switching (light/dark/custom)      |
| `tonika-ui.js`      | UI helpers (tabs, toggles, etc.)         |
| `clavonika.js`      | Piano keyboard UI module                 |
| `jackonika.js`      | MIDI input bridge                        |
| `soundonika.js`     | Audio engine (sample playback)           |

---

## 🎨 Styling & Theming

Located in `/css/`:

- `tonika-tokens.css`: Design tokens (`--color-bg`, `--spacing-md`, etc.)
- `tonika-theme-base.css`: Base theme structure
- `themes/*.css`: Optional full themes (e.g. `brown_01.css`)
- `tonika-layout.css`: Layout/grid helpers
- `tonika-components.css`: Buttons, inputs, selects
- `clavonika.css`: Module-specific styles
- `demo.css`: Additional styles used in demos

### Theme Switching (JS)
```js
Tonika.Theme.set("brown_01");
```

---

## 🔌 Demo Pages

Demos live in `/demo/`:

| File                   | Purpose                    |
|------------------------|----------------------------|
| `clavonika.html`       | Piano keyboard module      |
| `jackonika.html`       | MIDI input bridge test     |
| `soundonika.html`      | Audio sample test with UI  |
| `chernobyl_drone.html` | Experimental music testbed |

---

## 🧪 Developing Your Own Module

1. Add a module under `js/core/yourmodule.js`
2. Use the following pattern:

```js
class YourModule extends TonikaEmitter {
  init() { /* setup code */ }
  destroy() { /* cleanup code */ }
}
window.TonikaModules = window.TonikaModules || {};
window.TonikaModules.YourModule = YourModule;
```

3. Create a stylesheet using BEM-style:

```css

.yourmodule__button { ... }
```

4. Use global styles like:
```html
<button class="tonika-btn">Click me</button>
```

---

## 🎧 Samples & Index

Audio samples are under:

```
samples/percussion/DopeDrumsVol5/*.wav
```

The sample index is:

```json
{
  "percussion": {
    "DopeDrumsVol5": [
      "DD5_Kick_01.wav",
      "..."
    ]
  }
}
```

This is loaded by `soundonika.js` at runtime.

---

## 🧠 Event System

All modules use `TonikaEmitter` (a wrapper around `EventTarget`).

| Method    | Description                      |
|-----------|----------------------------------|
| `.on()`   | Add listener                     |
| `.off()`  | Remove listener                  |
| `.emit()` | Dispatch event with `{ detail }` |

```js
engine.on("status", ({ detail }) => console.log(detail));
engine.emit("status", { state: "ready" });
```

---

## 🪄 Recommended Loading Order

```html
<!-- CSS -->
<link rel="stylesheet" href="css/tonika-theme-base.css" />
<link rel="stylesheet" href="css/tonika-components.css" />
<link rel="stylesheet" href="css/tonika-layout.css" />
<link rel="stylesheet" href="css/themes/brown_01.css" />

<!-- JS -->
<script src="js/core/tonika-emitter.js"></script>
<script src="js/core/tonika-theme.js"></script>
<script src="js/core/tonika-ui.js"></script>
<script src="js/core/clavonika.js"></script>
<script src="js/core/jackonika.js"></script>
<script src="js/core/soundonika.js"></script>
```

---

## 🛠️ Dev Notes

- Use `developers/tonika_module_dev_updated.html` as a local dev scratchpad.
- Tabs and themes are controlled by `tonika-ui.js` and `tonika-theme.js`.
- Create your module in isolation first, then wire to other modules using events.

Happy patching, you beautiful Goblin! 🧙‍♀️
