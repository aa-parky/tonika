# Tonika Modules — Self-Contained Add-Ons

This directory is for **user-created, drop-in modules** that extend Tonika without waiting on core releases. Each module ships **everything it needs in its own folder** (HTML demo, CSS, JS, assets, metadata), so creators can share a folder and others can just drop it into `modules/` to use.

No edits to `tonika.html` required. Zero friction. Maximum fun. Goblin-friendly. 🛠️🎛️

---

## What “self-contained” means

A module must **work by itself** when opened in a browser (served via `https://` or `http://localhost` for WebMIDI), and it should also play nicely when embedded into Tonika pages later.

- **Standalone demo:** `index.html` (or another HTML name) that loads the module and locates Tonika core automatically.
- **Theme-aware:** CSS uses Tonika variables *with fallbacks* so it looks good alone and blends into themes when hosted.
- **Bus-native:** JS listens to/uses `Tonika.Bus` events when available, but degrades gracefully.

---

## Standard folder layout (blueprint)

```
modules/
  <your-module>/
    README.md                 # Describe your module & usage
    module.json               # Metadata for future auto-loader
    index.html                # Standalone demo page
    <slug>.js                 # Module code (Tonika.Bus-friendly)
    <slug>.css                # Styles (theme vars + fallbacks)
    assets/                   # Optional images, fonts, etc.
```

### `module.json` (fields)
For now, this file documents your module and readies it for a future loader.

```json
{
  "name": "My Module Name",
  "slug": "my-module",
  "version": "1.0.0",
  "description": "Short what/why.",
  "entry_js": "my-module.js",
  "entry_css": "my-module.css",
  "demo_html": "index.html",
  "requires": ["tonika-bus", "jackonika"],
  "mount_recommendation": "#my-module-slot",
  "author": "You",
  "license": "MIT"
}
```

---

## Quick start (for creators)

1) **Create a folder**
```
modules/<your-module>/
```

2) **Add your files**
- `index.html` — a **standalone demo** (see loader snippet below).
- `<slug>.css` — use CSS vars with fallbacks, e.g.:
  ```css
  background: var(--card-background, #171717);
  border-color: var(--panel-border, #333);
  color: var(--foreground, #eee);
  ```
- `<slug>.js` — your logic; **listen to MIDI** by subscribing to Tonika’s Bus if available:
  ```js
  if (window.Tonika && Tonika.Bus) {
    Tonika.Bus.addEventListener("midi:noteon", (ev) => {
      const { midi, velocity } = ev.detail || {};
      // your update here
    });
  }
  ```
- `module.json` — metadata (see above).

3) **Make the demo robust**  
   In `index.html` use a tiny loader that tries common paths for Tonika core and falls back gracefully. Example:

```html
<script>
  // minimal smart loader: tries likely paths for tonika-bus & jackonika
  function load(src){return new Promise((ok,err)=>{const s=document.createElement('script');s.src=src;s.defer=true;s.onload=ok;s.onerror=()=>err(src);document.head.appendChild(s);});}
  async function ensureTonika(){
    if (window.Tonika && Tonika.Bus) return;
    const candidates = ["../../js/core/tonika-bus.js","../js/core/tonika-bus.js","/js/core/tonika-bus.js"];
    for (const c of candidates){ try { await load(c); break; } catch {} }
    const jacks = ["../../js/core/jackonika.js","../js/core/jackonika.js","/js/core/jackonika.js"];
    for (const j of jacks){ try { await load(j); break; } catch {} }
  }
  (async () => {
    await ensureTonika();            // optional; keeps demo working inside repo
    // init your module here…
  })();
</script>
```

4) **Serve over `https://` or `localhost`** if you need WebMIDI (browser requirement).
5) **Document usage** in your module’s `README.md`.

---

## Using modules inside Tonika pages (optional)

Although modules are self-contained, you can embed them in `tonika.html` or any host page by:

```html
<link rel="stylesheet" href="modules/<your-module>/<slug>.css" />
<script src="modules/<your-module>/<slug>.js"></script>
```

Then mount/instantiate per your module’s instructions. (A future **module loader** will read each module’s `module.json` and do this automatically.)

---

## Events & MIDI — how to listen

Tonika rebroadcasts module events on a central **Event Bus**:

- MIDI: `midi:noteon`, `midi:noteoff`, `midi:controlchange`, `midi:aftertouch`, etc.
- Your module can listen:
  ```js
  if (window.Tonika && Tonika.Bus) {
    Tonika.Bus.addEventListener("midi:noteon", (e) => {
      const { midi, velocity, channel } = e.detail || {};
      // react to note-on
    });
  }
  ```
- Your module may also **emit** custom events (namespaced to avoid collisions), e.g.:
  ```js
  const evt = new CustomEvent("module:my-module:changed", { detail: { value } });
  (window.Tonika?.Bus || document).dispatchEvent(evt);
  ```

> If you want richer lifecycle features (mount resolution, status API, timing, debug hooks), you can **extend `Tonika.TonikaModule`** from `js/core/tonika-bus.js`.

---

## Theming — play nice with skins

- **Use variables** with sensible **fallbacks** so your module looks good alone and blends into themes when hosted:
  ```css
  .mybox {
    background: var(--card-background, #171717);
    border: 1px solid var(--panel-border, #3a3a3a);
    color: var(--foreground, #eee);
    box-shadow: var(--panel-shadow, 0 4px 12px rgba(0,0,0,.35));
  }
  ```
- If you introduce new “local” variables (e.g., `--vu-needle-color`), set them to default to Tonika tokens:
  ```css
  --vu-needle-color: var(--accent, #ff3366);
  ```
- Avoid global element selectors; **prefix your classes**, e.g. `.garroshvu__needle`.

---

## Accessibility & UX

- Prefer semantic HTML, add `role`/`aria-*` where helpful.
- Support keyboard simulation in demos (e.g., press `V` to simulate a hit).
- Keep animation frame-efficient (`requestAnimationFrame`) and avoid layout thrashing.

---

## Naming, style & quality

- **Slug**: `kebab-case` is preferred (underscores OK if you already use them).
- **CSS**: BEM-ish, prefixed class names to avoid collisions.
- **JS**: No globals except your module export. Avoid shadowing `Tonika.*`.
- **Licensing**: Add a header in your JS/CSS; default is MIT unless you specify otherwise.

---

## Testing checklist

- [ ] `index.html` works standalone from the module folder via a local server.
- [ ] WebMIDI path works (served via `https://` or `localhost`).
- [ ] No console errors on load or interaction.
- [ ] CSS respects Tonika variables but has fallbacks.
- [ ] Events wire up to `Tonika.Bus` when available.
- [ ] `module.json` present and accurate.
- [ ] `README.md` explains what it does and how to use it.

---

## Roadmap: Module Auto-Loader (optional future)

Soon, Tonika will be able to **discover modules automatically** by scanning `modules/*/module.json` and:
- Inject each module’s CSS/JS into the host page,
- Provide enable/disable and mount tools in Settings,
- Surface module docs/versions in the UI.

If you follow this README now, your module will be ready for that with **no changes**.

---

GPL-3.0 (project) / MIT (modules recommended) — **Tonika**

Be bold, be musical, and may your goblin hacks delight.
