// Jackonika (Tonika core edition) — Web MIDI input bridge with EventTarget emitter
/* eslint-env browser, node */

(function () {
  const LS_KEY = "tonika_jackonika_last_input_id";

  // Emitter base
  const EmitterBase =
    (typeof window !== "undefined" &&
      window.Tonika &&
      window.Tonika.TonikaEmitter) ||
    EventTarget;

  class JackonikaCore extends EmitterBase {
    constructor() {
      super();
      this._midiAccess = null;
      this._currentInput = null;
      this._selectorId = "midiDeviceSelector";
      this._optionsRef = {
        onNoteOn: null,
        onNoteOff: null,
        onStatus: null, // ('info'|'warn'|'error', message)
      };
    }

    // ---- public API ---------------------------------------------------------

    /**
     * Initialize the bridge.
     * @param {{selectorId?:string, onNoteOn?:(m,v)=>void, onNoteOff?:(m)=>void, onStatus?:(t,m)=>void}} opts
     * @returns {JackonikaCore}
     */
    init(opts = {}) {
      this._selectorId = opts.selectorId || this._selectorId;
      this._optionsRef = { ...this._optionsRef, ...opts };

      // Shim legacy callbacks using events
      if (typeof this._optionsRef.onStatus === "function") {
        this.addEventListener("status", (e) => {
          const { type, message } = e.detail || {};
          this._optionsRef.onStatus(type, message);
        });
      }
      if (typeof this._optionsRef.onNoteOn === "function") {
        this.addEventListener("midi:noteon", (e) => {
          const { midi, velocity } = e.detail || {};
          this._optionsRef.onNoteOn(midi, velocity);
        });
      }
      if (typeof this._optionsRef.onNoteOff === "function") {
        this.addEventListener("midi:noteoff", (e) => {
          const { midi } = e.detail || {};
          this._optionsRef.onNoteOff(midi);
        });
      }

      this._boot();
      return this;
    }

    // Allow direct event usage:
    on(type, handler, options) {
      this.addEventListener(type, handler, options);
      return () => this.removeEventListener(type, handler, options);
    }
    off(type, handler, options) {
      this.removeEventListener(type, handler, options);
    }
    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }

    // ---- internals ----------------------------------------------------------

    _status(type, message) {
      this.emit("status", { type, message });
      if (type === "error") console.warn("[Jackonika] " + message);
      else console.log("[Jackonika] " + message);
    }

    async _boot() {
      const secure =
        location.protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(location.hostname);
      if (!secure) this._status("warn", "Web MIDI requires https/localhost.");

      if (!("requestMIDIAccess" in navigator)) {
        this._status("error", "Web MIDI API not available in this browser.");
        return;
      }

      try {
        this._midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      } catch (err) {
        this._status(
          "error",
          "Failed to get MIDI access (permission denied?).",
        );
        return;
      }

      this._midiAccess.onstatechange = () => this._refreshDevices();
      this._ensureSelector();
      this._wireSelectorChange();
      this._refreshDevices();
      this._status("info", "Jackonika ready.");
    }

    _ensureSelector() {
      let el = document.getElementById(this._selectorId);
      if (!el) {
        el = document.createElement("select");
        el.id = this._selectorId;
        el.className = "tonika-select";
        document.body.insertBefore(el, document.body.firstChild);
        this._status(
          "info",
          `Created <select id="${this._selectorId}"> automatically`,
        );
      }
      return el;
    }

    _listInputs() {
      return Array.from(this._midiAccess.inputs.values());
    }

    _saveLastInputId(id) {
      try {
        localStorage.setItem(LS_KEY, id || "");
      } catch {}
    }

    _getLastInputId() {
      try {
        return localStorage.getItem(LS_KEY) || "";
      } catch {
        return "";
      }
    }

    _attachInput(input) {
      if (this._currentInput && this._currentInput.state !== "disconnected") {
        this._currentInput.onmidimessage = null;
      }
      this._currentInput = input || null;
      if (!this._currentInput) return;

      this._currentInput.onmidimessage = (ev) => {
        const [statusByte, note, vel] = ev.data || [];
        const type = statusByte & 0xf0;

        if (type === 0x90 && vel > 0) {
          this.emit("midi:noteon", { midi: note, velocity: vel });
        } else if (type === 0x80 || (type === 0x90 && vel === 0)) {
          this.emit("midi:noteoff", { midi: note });
        }
      };
    }

    _refreshDevices() {
      const selector = this._ensureSelector();
      const prevValue = selector.value;
      const inputs = this._listInputs();

      // Rebuild list
      selector.innerHTML = "";
      inputs.forEach((inp) => {
        const opt = document.createElement("option");
        opt.value = inp.id;
        opt.textContent = `${inp.name} ${inp.manufacturer ? "— " + inp.manufacturer : ""}`;
        selector.appendChild(opt);
      });

      this.emit("midi:devicechange", {
        inputs: inputs.map((i) => ({ id: i.id, name: i.name })),
      });

      if (inputs.length === 0) {
        selector.disabled = true;
        this._status(
          "warn",
          "No MIDI inputs available. Connect a device and try again.",
        );
        this._attachInput(null);
        return;
      }

      selector.disabled = false;

      // Choose target input
      let targetId = "";
      const lastUsed = this._getLastInputId();
      if (prevValue && inputs.some((i) => i.id === prevValue)) {
        targetId = prevValue;
      } else if (lastUsed && inputs.some((i) => i.id === lastUsed)) {
        targetId = lastUsed;
      } else {
        targetId = inputs[0].id;
      }

      selector.value = targetId;
      const target = inputs.find((i) => i.id === targetId);
      this._attachInput(target);
      this._saveLastInputId(targetId);
      this._status("info", `Selected MIDI input: ${target?.name || "(none)"}`);
    }

    _wireSelectorChange() {
      const selector = this._ensureSelector();
      selector.addEventListener("change", () => {
        const id = selector.value;
        const found = this._listInputs().find((i) => i.id === id);
        this._attachInput(found || null);
        this._saveLastInputId(found?.id || "");
        this._status("info", `Switched to: ${found?.name || "(none)"}`);
      });
    }
  }

  // Expose under Tonika (singleton) + back-compat alias
  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.Jackonika = new JackonikaCore();
    window.Jackonika = window.Jackonika || {};
    window.Jackonika.init = (opts) => window.Tonika.Jackonika.init(opts); // back-compat
  }

  // Optional CommonJS export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { JackonikaCore };
  }
})();
