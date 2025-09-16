# Tonika 🎹

Tonika is a modular, event-driven JavaScript framework for building interactive music tools.  
It provides a rack-like architecture where each module is self-contained but communicates through a shared **Bus**.

---

## ✨ Current Status

- **Version:** 1.1.1
- **Core Modules:**
    - `tonika-bus.js` (Event Bus, module registry, lifecycle management)
    - `chordonika.js` (Chord selector and keyboard visualization, Bus integrated)
    - `jackonika.js` (MIDI input bridge)
    - `catchonika.js` (MIDI recorder/logger)

---

## 🚌 Tonika Bus (v1.1.1)

The **Tonika Bus** is the central communication system.

- Built on `EventTarget`.
- Every `TonikaModule.emit()` re-dispatches events globally to `Tonika.Bus`.
- Provides **sugar API**:
  ```js
  const stop = Tonika.Bus.on("ui:chordselected", (e) => console.log(e.detail));
  stop(); // unsubscribes
  ```
- Registry (`Tonika.ModuleRegistry`) available for discovery and introspection.

### Features

- **Global Bus:** singleton `Tonika.Bus` that re-emits all events.
- **Bus Sugar API:** `Tonika.Bus.on/off` mirror module API, returning unsubscribe closures.
- **Event Log:** built-in debugging (`Tonika.TonikaModule.getEventLog()`).
- **Lifecycle events:** `app:status` (`initializing`, `ready`, `error`).
- **Module discovery:** `discoverModules()`, `findModule(name)`.
- **Debug mode:** `Tonika.TonikaModule.setDebugMode(true)`.

---

## 🎼 Chordonika Integration (v1.1.1 Example)

Chordonika demonstrates full **Bus-ready behavior**:

- **Emits** `ui:chordselected` events whenever the chord changes.
- **Listens** on the Bus for:
    - `midi:noteon` → highlights note keys
    - `midi:noteoff` → clears highlights
    - `ui:keypress` → reserved for keyboard mapping
- **Cleans up** using unsubscribe closures in `destroy()`.

### Example

```js
// Global listener (no coupling to Chordonika)
const stop = Tonika.Bus.on("ui:chordselected", (e) => {
    console.log("Chord selected:", e.detail.symbol);
});

// Later
stop();
```

### Benefits

- **Decoupling:** Modules never need direct references.
- **Consistency:** Same `.on/.off` pattern for Bus and modules.
- **Safety:** Subscriptions always cleaned up via closures.

---

## 🧩 Module Architecture

Each module extends `TonikaModule`:

- Provides `on`, `off`, `emit` for event handling.
- Auto-registers itself in the global registry.
- Reports capabilities via `getStatus()`.
- Can be initialized immediately or deferred.


## ClavonikaSVG (TonikaModule)
ClavonikaSVG has been refactored to extend `TonikaModule` (see `tonika-bus.js`).

### Events

- **Emits**
    - `ui:noteon` `{ midi, velocity }`
    - `ui:noteoff` `{ midi }`
- **Listens**
    - `midi:noteon`
    - `midi:noteoff`

### Legacy Wrapper

The old API `Tonika.Clavonika.init("piano", opts)` still exists for compatibility, but new development should use the `new Tonika.ClavonikaSVG({ ... })` constructor.


## Rhythonika (v0.1.1 – Pre-Release)

Rhythonika is Tonika’s **smart metronome and rhythmic pattern driver**, designed to provide both simple click-track functionality and advanced rhythmic structures (accents, subdivisions, and polyrhythms).

**Features**
- Plays grid-based accents (3+3+2, 3+2+3, 2+2+3, triplet mixes).
- Supports polyrhythms (3:2 overlay).
- Audio engine with **click mode** or **sample mode** (via Soundonika).
- UI for BPM, time signature, pattern, and sound selection.
- Pattern “pills” and visual highlights for practice feedback.

**Architecture**
- Extends `Tonika.TonikaModule` for lifecycle and status reporting.
- Fully integrated with the **Tonika Bus**:
    - **Emits**: `app:status`, `transport:start/stop`, `rhythm:tick`, `rhythm:patternchange`, `audio:modechange`.
    - **Listens**: `ui:keypress` (Space toggles transport).
- Public API: `start()`, `stop()`, `setBpm()`, `setTimeSignature()`, `setPattern()`, `setSoundMode()`, `getStatus()`, `destroy()`.

**Status**
- Current version: **0.1.1**
- Stable core; still in pre-release until wider testing across modules is completed.

---

## 🔧 Developer Guide

### Phase 1.1 / 1.1.1 Practices

- **Emit everything through the Bus** (automatic via `emit()`).
- **Subscribe via the Bus sugar API** (`Tonika.Bus.on`) to stay decoupled.
- **Always store and call unsubscribe closures** in `destroy()`.

---

## 📈 Roadmap

- **Phase 1.2:** Directed messaging (`emitTo(targetName, type, detail)`).
- **Phase 2.0:** Lightweight schema validation for event payloads.
- **Phase 2.1:** Developer tooling (visual Bus inspector, rack layout).

---

## 📜 License

GPL-3.0 © 2023–2025 Andrew Park