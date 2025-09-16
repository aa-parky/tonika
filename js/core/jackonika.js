/*!
 * Jackonika — Web MIDI Input Bridge (TonikaModule Edition)
 * Location: js/core/jackonika.js
 * Version: 2.1.0
 */

(function () {
  "use strict";

  const LS_KEY = "tonika_jackonika_last_input_id";

  class Jackonika extends Tonika.TonikaModule {
    constructor(opts = {}) {
      super({
        ...opts,
        moduleInfo: {
          name: "Jackonika",
          version: "2.1.0",
          description: "Web MIDI input bridge with Tonika.Bus integration",
          ...(opts.moduleInfo || {}),
        },
      });

      this._midiAccess = null;
      this._currentInput = null;
      this._selectorId = opts.selectorId || "midiDeviceSelector";
    }

    // ---------------------------------------------------------------------------
    // INITIALIZATION
    // ---------------------------------------------------------------------------
    _initialize() {
      this._ensureSelector();
      this._boot();
    }

    async _boot() {
      const secure =
        location.protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(location.hostname);
      if (!secure) {
        this._status("warn", "Web MIDI requires https/localhost.");
      }

      if (!("requestMIDIAccess" in navigator)) {
        this._status("error", "Web MIDI API not available in this browser.");
        return;
      }

      try {
        this._midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      } catch (err) {
        this._status("error", "Failed to get MIDI access (permission denied?).");
        return;
      }

      this._midiAccess.onstatechange = () => this._refreshDevices();
      this._wireSelectorChange();
      this._refreshDevices();
      this._status("info", "Jackonika ready.");
    }

    // ---------------------------------------------------------------------------
    // INTERNAL HELPERS
    // ---------------------------------------------------------------------------
    _status(level, msg) {
      this.emit("app:status", { level, msg });
      if (level === "error") console.warn("[Jackonika] " + msg);
      else console.log("[Jackonika] " + msg);
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
          `Created <select id="${this._selectorId}"> automatically`
        );
      }
      this.mount = el;
      return el;
    }

    _listInputs() {
      return Array.from(this._midiAccess?.inputs?.values?.() || []);
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
        const [statusByte, data1, data2] = ev.data || [];
        const type = statusByte & 0xf0;
        const channel = statusByte & 0x0f;

        switch (type) {
          case 0x80: // Note Off
            this.emit("midi:noteoff", { midi: data1, velocity: data2, channel });
            break;
          case 0x90: // Note On
            if (data2 > 0) {
              this.emit("midi:noteon", { midi: data1, velocity: data2, channel });
            } else {
              this.emit("midi:noteoff", { midi: data1, velocity: 0, channel });
            }
            break;
          case 0xA0: // Polyphonic Aftertouch
            this.emit("midi:aftertouch", { midi: data1, pressure: data2, channel });
            break;
          case 0xB0: // Control Change
            this.emit("midi:cc", { controller: data1, value: data2, channel });
            break;
          case 0xC0: // Program Change
            this.emit("midi:programchange", { program: data1, channel });
            break;
          case 0xD0: // Channel Pressure (Aftertouch)
            this.emit("midi:channelpressure", { pressure: data1, channel });
            break;
          case 0xE0: // Pitch Bend
            const value = (data2 << 7) | data1; // 14-bit
            this.emit("midi:pitchbend", { value, channel });
            break;
          default:
            this.emit("midi:unknown", { statusByte, data1, data2 });
            break;
        }
      };
    }

    _refreshDevices() {
      const selector = this._ensureSelector();
      const prevValue = selector.value;
      const inputs = this._listInputs();

      selector.innerHTML = "";
      inputs.forEach((inp) => {
        const opt = document.createElement("option");
        opt.value = inp.id;
        opt.textContent = `${inp.name} ${
          inp.manufacturer ? "— " + inp.manufacturer : ""
        }`;
        selector.appendChild(opt);
      });

      this.emit("midi:devicechange", {
        inputs: inputs.map((i) => ({ id: i.id, name: i.name })),
      });

      if (inputs.length === 0) {
        selector.disabled = true;
        this._status("warn", "No MIDI inputs available. Connect a device and try again.");
        this._attachInput(null);
        return;
      }

      selector.disabled = false;

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

    // ---------------------------------------------------------------------------
    // STATUS API
    // ---------------------------------------------------------------------------
    getStatus() {
      const base = super.getStatus();
      return {
        ...base,
        jackonika: {
          currentInput: this._currentInput
            ? { id: this._currentInput.id, name: this._currentInput.name }
            : null,
          availableInputs: this._listInputs().map((i) => ({
            id: i.id,
            name: i.name,
          })),
        },
      };
    }

    _getPublicMethods() {
      return [...super._getPublicMethods(), "getStatus"];
    }
    _getEmittedEvents() {
      return [
        ...super._getEmittedEvents(),
        "midi:noteon",
        "midi:noteoff",
        "midi:aftertouch",
        "midi:cc",
        "midi:programchange",
        "midi:channelpressure",
        "midi:pitchbend",
        "midi:devicechange",
        "midi:unknown",
      ];
    }
  }

  // ---------------------------------------------------------------------------
  // REGISTRATION
  // ---------------------------------------------------------------------------
  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.Jackonika = Jackonika;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Jackonika };
  }
})();