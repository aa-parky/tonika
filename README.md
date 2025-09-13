# Tonika 🎹

Tonika is a modular, event-driven JavaScript framework for building interactive music tools.  
It provides a rack-like architecture where each module is self-contained but communicates through a shared **Bus**.

---

## ✨ Current Status
- **Version:** 1.1.0
- **Core Modules:**
    - `tonika-bus.js` (Event Bus, module registry, lifecycle management)
    - `chordonika.js` (Chord selector + keyboard visualization, Bus integrated)
    - `jackonika.js` (MIDI input bridge)
    - `catchonika.js` (MIDI recorder/logger)

---

## 🚌 Tonika Bus (v1.1.0)
The **Tonika Bus** is the central communication system.

- Built on `EventTarget`.
- Every `TonikaModule.emit()` now re-dispatches events globally to `Tonika.Bus`.
- Developers can listen to any event without needing to know which module emits it:
  ```js
  Tonika.Bus.on("ui:chordselected", e => console.log("Chord:", e.detail));
  ```
- Module registry (`Tonika.ModuleRegistry`) is still available for discovery and introspection.

### Features
- **Global Bus:** singleton `Tonika.Bus` that re-emits all events.
- **Event Log:** built-in debugging (`Tonika.TonikaModule.getEventLog()`).
- **Lifecycle events:** `app:status` (`initializing`, `ready`, `error`).
- **Module discovery:** `discoverModules()`, `findModule(name)`.
- **Debug mode:** `Tonika.TonikaModule.setDebugMode(true)`.

---

## 🎼 Chordonika Integration (Phase 1.1 Example)
Chordonika now demonstrates full **Bus-ready behavior**:

- **Emits** `ui:chordselected` events whenever the selected chord changes.
- **Listens** on the Bus for:
    - `midi:noteon` → highlights note keys
    - `midi:noteoff` → clears highlights
    - `ui:keypress` → reserved for keyboard mapping

### Example
```js
// Global listener (no coupling to Chordonika)
Tonika.Bus.on("ui:chordselected", e => {
  console.log("Chord selected:", e.detail.symbol);
});

// Simulated external MIDI note
Tonika.Bus.dispatchEvent(new CustomEvent("midi:noteon", {
  detail: { note: "C" }
}));
```

### Benefits
- **Decoupling:** Modules no longer need direct references to each other.
- **Consistency:** `getStatus()` truthfully lists what events a module emits/listens for.
- **Lifecycle safety:** Chordonika unsubscribes from the Bus when destroyed.

---

## 🧩 Module Architecture
Each module extends `TonikaModule`:
- Provides `on`, `off`, `emit` for event handling.
- Auto-registers itself in the global registry.
- Reports capabilities via `getStatus()`.
- Can be initialized immediately or deferred.

### Example Skeleton
```js
class MyModule extends Tonika.TonikaModule {
  constructor(opts = {}) {
    super({
      ...opts,
      moduleInfo: { name: "MyModule", version: "1.0.0" }
    });
  }
  _initialize() {
    this.emit("app:status", { state: "ready" });
  }
}
```

---

## 🔧 Developer Guide
### Phase 1.1 Practices
- **Emit everything through the Bus** (already automatic via `emit()`).
- **Subscribe via the Bus** to decouple from module names.
- **Unsubscribe in `destroy()`** to prevent memory leaks.

### Debugging
```js
Tonika.TonikaModule.setDebugMode(true);
console.table(Tonika.TonikaModule.discoverModules());
console.log(Tonika.TonikaModule.getEventLog(20));
```

---

## 📈 Roadmap
- **Phase 1.2:** Directed messaging (`emitTo(targetName, type, detail)`).
- **Phase 2.0:** Lightweight schema validation for event payloads.
- **Phase 2.1:** Developer tooling (visual Bus inspector, rack layout).

---

## 📜 License
GPL-3.0 © 2023–2025 Andrew Park
