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

## Clavonika Integration (v0.2.x)

**Purpose**: Virtual 88-key piano interface, accepts MIDI input and user interaction.

### Event API

- Emits `ui:noteon`, `ui:noteoff`, `app:status`.
- Events are also re-emitted globally on `Tonika.Bus`.

### Initialization

```js
// ✅ Correct
Tonika.Clavonika.init("piano", { octaves: 2, startOctave: 3 });

// ❌ Incorrect (will fail)
Tonika.Clavonika.init("#piano", { octaves: 2, startOctave: 3 });
```

> `init()` requires the **raw element ID string**. Passing `#id` will fail.

### Capabilities

- Full 88-key visual keyboard.
- Configurable octaves, start octave, and label modes.
- Supports both UI interactions and MIDI device input.
- Styled with `clavonika.css`.

### Bus Integration

Clavonika has been patched so that its events (`ui:noteon`, `ui:noteoff`, `app:status`) are also re-emitted globally to `Tonika.Bus`.  
This ensures that activity is visible in the **Bus Activity monitor** (Catchonika tab).

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
