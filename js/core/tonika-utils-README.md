# Tonika Utils

Tonika Utils provides a shared library of utility functions for the **Tonika ecosystem**. Its purpose is to eliminate duplication, enforce consistent behavior across modules, and provide a single place for low-level helpers (music theory, timing, DOM, storage, etc.).

This file is structured into categories with clear inclusion criteria. Functions only live here if they are **generic, reusable, and used by 2+ modules**.

---

## ✅ Current Implemented Utilities

### Error Handling
- **`debugLog(moduleName, eventName, detail = {})`**  
  Conditional logger. Outputs `[ModuleName] → EventName` only if `window.Tonika.debug` is enabled.  
  Used by multiple modules for consistent, optional debugging.

### Dev / Demo Utilities
These are primarily used in developer shells (e.g. `streamonika_demo.html`) but can be reused across module demos.

- **`toggleDebug(container, enabled?)`**  
  Adds/removes `synthonika--debug` class to visually show grid outlines.  
  If `enabled` is passed, sets explicitly; otherwise toggles state.

- **`resetModuleStyles(container, { bgColorPicker, textureSelect, textureMode, textureScale })`**  
  Restores a container to a “clean” default state:
    - Resets background to `var(--color-bg)`
    - Clears shadows and textures
    - Resets optional control elements (color picker, texture dropdowns)

- **`applyBleedTint(container, color)`**  
  Applies tinted glow/shadow effects to Synthonika UI elements (`button`, `rotary`, `touchbar`) based on a selected hex color. Brightness-aware so dark colors get boosted.

- **`applyTexture(container, file, mode, scale)`**  
  Applies a texture background to a module container.
    - **file**: URL of the texture, or `""` for none
    - **mode**: `"tile"` (repeat) or `"stretch"` (cover)
    - **scale**: pixel size for tiling (default: 200px)

---

## 🚧 TODO: Future Utilities to Populate

The following categories are scaffolded in the file but not yet implemented. Each has candidate functions ready to be written as soon as modules need them.

### Music Theory
- [ ] `midiToNoteName(midi)` → `"C4"`
- [ ] `noteNameToMidi("A4")` → `69`
- [ ] `midiToFrequency(69)` → `440` Hz
- [ ] `transposeNote(midi, interval)` → shifted MIDI value
- [ ] Scale and chord helpers (major, minor, seventh, etc.)

### Timing & Rhythm
- [ ] `bpmToMs(120)` → `500` (ms per beat)
- [ ] `msToBpm(500)` → `120` BPM
- [ ] `quantizeToGrid(time, bpm, subdivision)`
- [ ] `timeSignatureToBeats("4/4")` → `{beatsPerBar, beatUnit}`

### DOM & UI
- [ ] `createElement(tag, attrs, children)`
- [ ] `addBemModifier(el, "active")`
- [ ] `debounce(fn, ms)` / `throttle(fn, ms)`

### Audio Context
- [ ] `getAudioContext()` → shared `AudioContext`
- [ ] `resumeAudioContext()` → handles browser unlocks
- [ ] `createGainNode(volume)`

### Validation
- [ ] `isValidMidiNote()`
- [ ] `isValidBpm()`
- [ ] `clamp(value, min, max)`
- [ ] `sanitizeUserInput()`

### Arrays & Objects
- [ ] `unique(array)`
- [ ] `deepClone(obj)`
- [ ] `groupBy(array, key)`
- [ ] `findClosest(array, target)`

### Storage & Persistence
- [ ] `saveToStorage(key, value)`
- [ ] `loadFromStorage(key, defaultValue)`
- [ ] `clearStorage(prefix)`

### Performance
- [ ] `measurePerformance(name, fn)` → time a function call
- [ ] `createAnimationFrame(callback)` → wrapper for RAF
- [ ] `createIdleCallback(callback)`

---

## Contributing Guidelines
- Only add a utility if **2+ modules** use it.
- Keep functions **pure** and **single-purpose**.
- Provide JSDoc with usage examples.
- Write unit tests for every function.
- Document edge cases and limitations.  
