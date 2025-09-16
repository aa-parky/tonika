/*!
 * Jackonika — Web MIDI Input Bridge (TonikaModule Edition)
 * Location: js/core/jackonika.js
 * Version: 2.2.1
 */

(function () {
  "use strict";

  const LS_KEY_LAST_SINGLE = "tonika_jackonika_last_input_id";
  const LS_KEY_SELECTED_IDS = "tonika_jackonika_selected_ids";

  class Jackonika extends Tonika.TonikaModule {
    constructor(opts = {}) {
      super({
        ...opts,
        moduleInfo: {
          name: "Jackonika",
          version: "2.2.1",
          description: "Web MIDI input bridge with Tonika.Bus integration",
          ...(opts.moduleInfo || {}),
        },
      });

      this._selectorId = opts.selectorId || "midiDeviceSelector";
      this._mode = opts.mode || "all"; // "all" | "select"
      this._selectedIds = new Set(Array.isArray(opts.selectedIds) ? opts.selectedIds : []);

      this._midiAccess = null;
      this._currentInput = null;
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

      this._midiAccess.onstatechange = () => {
        this._refreshDevices();
        this._rewireAccordingToMode();
      };

      this._wireSelectorChange();
      this._refreshDevices();
      this._rewireAccordingToMode();

      this._status("info", `Jackonika ready in "${this._mode}" mode.`);
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
        document.body.insertBefore(el, document.body.firstChild);
        this._status("info", `Created <select id="${this._selectorId}"> automatically`);
      }
      this.mount = el;
      return el;
    }

    _listInputs() {
      return Array.from(this._midiAccess?.inputs?.values?.() || []);
    }

    _saveLastSingleId(id) {
      try { localStorage.setItem(LS_KEY_LAST_SINGLE, id || ""); } catch {}
    }
    _getLastSingleId() {
      try { return localStorage.getItem(LS_KEY_LAST_SINGLE) || ""; } catch { return ""; }
    }

    _saveSelectedIds() {
      try { localStorage.setItem(LS_KEY_SELECTED_IDS, JSON.stringify(Array.from(this._selectedIds))); } catch {}
    }
    _getSelectedIds() {
      try {
        const raw = localStorage.getItem(LS_KEY_SELECTED_IDS);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }

    _detachAllInputs() {
      for (const input of this._listInputs()) {
        try { input.onmidimessage = null; } catch {}
      }
    }

    _attachAllInputs() {
      this._detachAllInputs();
      const inputs = this._listInputs();
      for (const input of inputs) {
        input.onmidimessage = (ev) => this._handleMidi(ev, input);
      }
      const labels = inputs.map(i => `${i.id} (${i.name})`).join(", ") || "(none)";
      this._status("info", `Listening to ALL MIDI inputs: ${labels}`);
    }

    _attachSelectedInputs(ids) {
      this._detachAllInputs();
      const set = new Set(ids);
      const inputs = this._listInputs();
      const attached = [];
      for (const input of inputs) {
        if (set.has(input.id)) {
          input.onmidimessage = (ev) => this._handleMidi(ev, input);
          attached.push(`${input.id} (${input.name})`);
        }
      }
      this._status("info", `Listening to selected inputs: ${attached.join(", ") || "(none)"}`);
    }

    _handleMidi(ev, input) {
      const [statusByte, data1, data2] = ev.data || [];
      const type = statusByte & 0xf0;
      const channel = statusByte & 0x0f;
      const meta = { deviceId: input.id, deviceName: input.name, channel };

      switch (type) {
        case 0x80: this.emit("midi:noteoff", { midi: data1, velocity: data2, ...meta }); break;
        case 0x90: data2 > 0
          ? this.emit("midi:noteon", { midi: data1, velocity: data2, ...meta })
          : this.emit("midi:noteoff", { midi: data1, velocity: 0, ...meta });
          break;
        case 0xA0: this.emit("midi:aftertouch", { midi: data1, pressure: data2, ...meta }); break;
        case 0xB0: this.emit("midi:cc", { controller: data1, value: data2, ...meta }); break;
        case 0xC0: this.emit("midi:programchange", { program: data1, ...meta }); break;
        case 0xD0: this.emit("midi:channelpressure", { pressure: data1, ...meta }); break;
        case 0xE0: { const value = (data2 << 7) | data1;
          this.emit("midi:pitchbend", { value, ...meta }); break; }
        default: this.emit("midi:unknown", { statusByte, data1, data2, ...meta }); break;
      }
    }

    _refreshDevices() {
      const selector = this._ensureSelector();
      const inputs = this._listInputs();

      selector.innerHTML = "";
      for (const inp of inputs) {
        const opt = document.createElement("option");
        opt.value = inp.id;
        opt.textContent = `${inp.name}${inp.manufacturer ? " — " + inp.manufacturer : ""}`;
        selector.appendChild(opt);
      }

      this.emit("midi:devicechange", {
        inputs: inputs.map((i) => ({ id: i.id, name: i.name })),
      });

      if (this._mode === "select") {
        selector.multiple = true;
        const fromStore = new Set(this._getSelectedIds());
        for (const opt of selector.options) {
          opt.selected = fromStore.has(opt.value);
        }
      } else {
        selector.multiple = false;
        const prev = selector.value;
        const lastUsed = this._getLastSingleId();
        const ids = inputs.map((i) => i.id);
        let targetId = prev && ids.includes(prev) ? prev :
          lastUsed && ids.includes(lastUsed) ? lastUsed :
            (ids[0] || "");
        selector.value = targetId;
      }
    }

    _wireSelectorChange() {
      const selector = this._ensureSelector();

      selector.addEventListener("change", () => {
        if (this._mode === "select") {
          const ids = Array.from(selector.selectedOptions).map((o) => o.value);
          this._selectedIds = new Set(ids);
          this._saveSelectedIds();
          this._attachSelectedInputs(ids);
        } else {
          const id = selector.value;
          const found = this._listInputs().find((i) => i.id === id) || null;
          this._currentInput = found;
          this._saveLastSingleId(found?.id || "");
          this._status("info", `Info selection (all mode): ${found ? `${found.id} (${found.name})` : "(none)"}`);
        }
      });
    }

    _rewireAccordingToMode() {
      if (this._mode === "select") {
        const ids = Array.from(this._selectedIds);
        this._attachSelectedInputs(ids);
      } else {
        this._attachAllInputs();
      }
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    setMode(mode) {
      if (mode !== "all" && mode !== "select") return;
      this._mode = mode;
      const selector = this._ensureSelector();
      selector.multiple = mode === "select";
      this._rewireAccordingToMode();
      this._status("info", `Mode switched to "${mode}".`);
    }

    setSelectedDevices(ids = []) {
      this._selectedIds = new Set(ids);
      this._saveSelectedIds();
      if (this._mode === "select") {
        const selector = this._ensureSelector();
        for (const opt of selector.options) opt.selected = this._selectedIds.has(opt.value);
        this._attachSelectedInputs(ids);
      }
    }

    getSelectedDevices() {
      return Array.from(this._selectedIds);
    }

    // ---------------------------------------------------------------------------
    // STATUS API
    // ---------------------------------------------------------------------------
    getStatus() {
      const base = super.getStatus();
      const inputs = this._listInputs();
      const attached = [];

      for (const inp of inputs) {
        if (typeof inp.onmidimessage === "function") {
          attached.push({ id: inp.id, name: inp.name });
        }
      }

      return {
        ...base,
        jackonika: {
          mode: this._mode,
          selectedDeviceIds: Array.from(this._selectedIds),
          attachedInputs: attached,
          currentInput: this._currentInput
            ? { id: this._currentInput.id, name: this._currentInput.name }
            : null,
          availableInputs: inputs.map((i) => ({ id: i.id, name: i.name })),
        },
      };
    }

    _getPublicMethods() {
      return [...super._getPublicMethods(), "getStatus", "setMode", "setSelectedDevices", "getSelectedDevices"];
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

  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.Jackonika = Jackonika;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Jackonika };
  }
})();