# Tonika

Tonika is a modular, browser‑based rack of UI and music tools. Each module is designed as a standalone component but follows the same core patterns so they can work together in a single rack.

---

## ✨ Current Modules

- **Clavonika** – 88‑key piano keyboard interface with MIDI input support.
    - Emits `ui:noteon` / `ui:noteoff`
    - Emits `app:status` (ready, info, error)
- **Chordonika** – Chord selector and visualizer with integrated keyboard highlighting.
    - Emits `ui:chordselected` with chord object or `null`
- **Jackonika** – Web MIDI input bridge.
    - Emits `midi:noteon` / `midi:noteoff` / `midi:devicechange`
    - Emits `app:status` (ready, info, error)
- **Soundonika** – Core audio engine for samples/click playback.
    - Emits `audio:status` (loading, ready, error, info)
    - Emits `app:mappings_updated` when sample mappings change
- **Chordify Integration** – Curated list of songs rendered as a searchable table. Selecting a song opens the Chordify player in an inline view with a back button.
    - Built using plain JSON (`song_data.json`) and iframe embeds.

---

## 🛠 Unified Event Taxonomy

All modules now follow a consistent event naming scheme:

- `ui:*` → User interactions (note on/off, chord selection, knob turn)
- `midi:*` → Raw MIDI device data
- `audio:*` → Audio engine lifecycle and playback
- `app:*` → General system and status messages

This ensures predictable logs and prevents namespace collisions across modules.

---

## 🚀 Usage Example

```html
<!-- Mount Clavonika -->
<div id="piano"></div>
<script type="module">
  const piano = Tonika.Clavonika.init("piano");

  piano.on("ui:noteon", (e) => console.log("Note on", e.detail));
  piano.on("ui:noteoff", (e) => console.log("Note off", e.detail));
  piano.on("app:status", (e) => console.log("Status", e.detail));
</script>

<!-- Mount Chordonika -->
<div id="chord-selector"></div>
<script>
  const chords = new Chordonika({ mount: "#chord-selector", mode: "card" });
  chords.on("ui:chordselected", (e) => console.log("Chord:", e.detail));
</script>
```

---

## 📝 Dev Notes

- **Iframe Warnings:** Chordify integration produces console warnings (`X-Frame-Options`, preload hints). These are harmless and come from Chordify’s own frontend. Nothing to fix on our side.
- **Blocked Trackers:** If you run Pi-hole or a blocker, you’ll see `ERR_CONNECTION_REFUSED` for Google Analytics/Tag Manager. This does not affect playback.
- **Permissions Policy:** To reduce console noise, the Chordify iframe now uses a tuned `allow` attribute:
  ```html
  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
  ```
- **Hidden Views:** Table view and player view swap cleanly with `display:none` via BEM classes, preventing scroll stacking.

---

## 🔮 Roadmap

- Add sortable/filterable columns to the Chordify table (key, tempo, etc.).
- Sync chord progressions from JSON to highlight notes on the 88‑key keyboard in time with playback.
- Add `destroy()` lifecycle methods to modules for clean teardown.
- Extract boilerplate UI card helpers into a shared utility (`Tonika.UICard`).
- Improve responsive layouts for small screens.

---

## 📜 License

MIT License © 2025 [aa-parky](https://github.com/aa-parky)
