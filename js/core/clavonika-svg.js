/**
 * Clavonika SVG (TonikaModule edition)
 * - Refactored to extend Tonika.TonikaModule (tonika-bus.js)
 * - Uses central Bus for eventing/logging
 * - Standardized lifecycle + getStatus()
 * - Backwards compatibility wrapper: Tonika.Clavonika.init(idOrEl, opts)
 */

(function () {
  "use strict";

  // ===== CONSTANTS (unchanged where possible) =====
  const MIDI_CONSTANTS = Object.freeze({
    PIANO_RANGE: { LOWEST_NOTE: 21, HIGHEST_NOTE: 108 },
    MIDDLE_C: 60,
    MESSAGE_TYPES: { NOTE_OFF: 0x80, NOTE_ON: 0x90, STATUS_MASK: 0xf0 },
  });

  const MUSIC_CONSTANTS = Object.freeze({
    SEMITONES_PER_OCTAVE: 12,
    NOTE_NAMES: ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],
    OCTAVE_ADJUSTMENTS: { C3_MODE: -1, C4_MODE: 0, C5_MODE: 1 },
    BASE_OCTAVE_OFFSET: -1,
  });

  const SVG_LAYOUT_CONSTANTS = Object.freeze({
    WHITE_KEY: { WIDTH: 24, HEIGHT: 140, SPACING: 25 },
    BLACK_KEY: { WIDTH: 16, HEIGHT: 90, OFFSET: -6 },
    KEYBOARD: { HEIGHT: 160, FELT_HEIGHT: 6 },
  });

  const UI_CONSTANTS = Object.freeze({
    CSS_CLASSES: {
      SHOW_C_ONLY: "clavonika__keyboard--show-c-only",
      HIDE_ALL_LABELS: "clavonika__keyboard--hide-all-labels",
      KEY_BASE: "clavonika__key",
      MIDDLE_C: "clavonika__key--middle-c",
      WHITE_KEY: "clavonika__key--white",
      BLACK_KEY: "clavonika__key--black",
      ACTIVE: "clavonika__key--active",
      KEY_LABEL: "clavonika__key-label",
      HIDDEN: "clavonika__hidden",
    },
    ELEMENT_IDS: {
      TOGGLE_C_ONLY: "#toggleCOnly",
      TOGGLE_ALL_LABELS: "#toggleAllLabels",
      MIDDLE_C_SELECT: "#middleC",
      MIDI_DEVICE_SELECTOR: "#midiDeviceSelector",
      KEYBOARD: "#keyboard",
    },
    LABEL_MODES: { C_ONLY: "c-only", HIDE_ALL: "hide-all", NORMAL: "normal" },
  });

  const CONFIG_CONSTANTS = Object.freeze({
    STORAGE_KEYS: { LAST_MIDI_INPUT: "clavonika:lastInputId" },
    DEFAULT_VALUES: {
      MIDDLE_C_MODE: "C3",
      OCTAVE_SHIFT: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE,
    },
  });

  const HTML_TEMPLATE = `
<section class="clavonika__wrapper">
  <div class="clavonika__midi-device-label">
    <label for="midiDeviceSelector">Select MIDI Input:</label>
    <select id="midiDeviceSelector" class="clavonika__midi-device-selector tonika-select"></select>
  </div>

  <div class="clavonika__controls">
    <label><input type="checkbox" id="toggleCOnly" /> Show only C notes</label>
    <label><input type="checkbox" id="toggleAllLabels" /> Hide all note labels</label>
    <label class="clavonika__middle-c-label">
      <span>Middle C Label:</span>
      <select id="middleC" class="tonika-select">
        <option value="C3" selected>C3 (Kawai VPC1, Yamaha, Logic)</option>
        <option value="C4">C4 (General MIDI)</option>
        <option value="C5">C5 (Notation, FL)</option>
      </select>
    </label>
  </div>

  <div class="clavonika__container">
    <p class="clavonika__title">Clavonika SVG</p>
    <div class="clavonika__keyboard" id="keyboard"></div>
  </div>
</section>
`;

  // ===== PRECOMPUTE KEYS (MIDI 21..108) =====
  function generateKeys() {
    const out = [];
    for (let midi = MIDI_CONSTANTS.PIANO_RANGE.LOWEST_NOTE; midi <= MIDI_CONSTANTS.PIANO_RANGE.HIGHEST_NOTE; midi++) {
      const name = MUSIC_CONSTANTS.NOTE_NAMES[midi % MUSIC_CONSTANTS.SEMITONES_PER_OCTAVE];
      const octave = Math.floor(midi / MUSIC_CONSTANTS.SEMITONES_PER_OCTAVE) + MUSIC_CONSTANTS.BASE_OCTAVE_OFFSET;
      out.push({
        note: name + octave,
        type: name.includes("#") ? "black" : "white",
        octave,
        midi,
      });
    }
    return out;
  }
  const KEYS = generateKeys();

  // ==========================================================================
  // CLASS: ClavonikaSVG (TonikaModule)
  // ==========================================================================
  class ClavonikaSVG extends (window?.Tonika?.TonikaModule || EventTarget) {
    constructor(opts = {}) {
      super({
        ...opts,
        moduleInfo: {
          name: "ClavonikaSVG",
          version: "2.0.0",
          description: "SVG-rendered piano keyboard",
          ...(opts.moduleInfo || {}),
        },
      });

      // Internal state
      this._middleCShift = CONFIG_CONSTANTS.DEFAULT_VALUES.OCTAVE_SHIFT;
      this._midiAccess = null;
      this._currentInput = null;

      // DOM refs
      this._els = {
        keyboard: null,
        toggleCOnly: null,
        toggleAllLabels: null,
        middleCSelect: null,
        midiDeviceSelector: null,
      };

      // SVG root
      this._svgElement = null;

      // Optional bus unsubs
      this._offBus = [];
    }

    // Called automatically by TonikaModule during init
    _initialize() {
      if (!this.mount) throw new Error("[ClavonikaSVG] Missing mount element.");

      // Mount DOM
      this.mount.classList.add("clavonika");
      this.mount.innerHTML = HTML_TEMPLATE;

      // Cache DOM
      this._cacheDom();

      // Render & wire UI
      this._generateKeyboard();
      this._initializeEventHandlers();
      this._initMIDI();

      // Listen to global bus (optional): reflect external MIDI note events
      if (window?.Tonika?.Bus) {
        const onNoteOn = (e) => {
          const d = e.detail || {};
          const midi = d?.midi ?? d?.note ?? d?.noteNumber;
          if (typeof midi === "number") this._setNoteActive(midi, true);
        };
        const onNoteOff = (e) => {
          const d = e.detail || {};
          const midi = d?.midi ?? d?.note ?? d?.noteNumber;
          if (typeof midi === "number") this._setNoteActive(midi, false);
        };
        this._offBus.push(window.Tonika.Bus.on("midi:noteon", onNoteOn));
        this._offBus.push(window.Tonika.Bus.on("midi:noteoff", onNoteOff));
      }

      this.emit("app:status", { state: "ready", msg: "SVG UI mounted" });
    }

    // ------------------------ Public API ------------------------
    noteOn(midiNote, velocity = 1.0) {
      this._setNoteActive(midiNote, true);
      this.emit("ui:noteon", { midi: midiNote, velocity });
    }
    noteOff(midiNote) {
      this._setNoteActive(midiNote, false);
      this.emit("ui:noteoff", { midi: midiNote });
    }
    refreshDeviceSelection(preserve = null) {
      const prev = preserve || this._els.midiDeviceSelector?.value;
      this._populateDeviceSelector();
      if (prev && this._getInputsArray().some((i) => i.id === prev)) {
        this._els.midiDeviceSelector.value = prev;
        this._attachInputById(prev);
      }
    }

    // Extend status with module specifics
    getStatus() {
      const base = (super.getStatus && super.getStatus()) || {};
      return {
        ...base,
        state: {
          ...base.state,
          labelMode: this._getCurrentLabelMode(),
          midiDevice: this._currentInput ? (this._currentInput.name || this._currentInput.id) : null,
          webMIDI: !!navigator.requestMIDIAccess,
        },
        api: {
          ...(base.api || {}),
          methods: [...(base.api?.methods || []), "noteOn", "noteOff", "refreshDeviceSelection"],
          events: {
            emits: [...(base.api?.events?.emits || []), "ui:noteon", "ui:noteoff"],
            listens: [...(base.api?.events?.listens || []), "midi:noteon", "midi:noteoff"],
          },
        },
      };
    }

    _getPublicMethods() {
      const parent = (super._getPublicMethods && super._getPublicMethods()) || [];
      return [...parent, "noteOn", "noteOff", "refreshDeviceSelection"];
    }
    _getEmittedEvents() {
      const parent = (super._getEmittedEvents && super._getEmittedEvents()) || [];
      return [...parent, "ui:noteon", "ui:noteoff"];
    }
    _getListenedEvents() {
      const parent = (super._getListenedEvents && super._getListenedEvents()) || [];
      return [...parent, "midi:noteon", "midi:noteoff"];
    }

    destroy() {
      try {
        // Detach MIDI
        this._detachCurrentInput();
        if (this._midiAccess) {
          this._midiAccess.onstatechange = null;
        }
        // Bus listeners
        this._offBus.forEach((off) => { try { off && off(); } catch (_) {} });
        this._offBus = [];
        // Clear DOM (non-destructive to mount)
        if (this.mount) this.mount.innerHTML = "";
      } finally {
        if (super.destroy) super.destroy();
      }
    }

    // ------------------------ DOM + Rendering ------------------------
    _cacheDom() {
      this._els.keyboard = this.mount.querySelector(UI_CONSTANTS.ELEMENT_IDS.KEYBOARD);
      this._els.toggleCOnly = this.mount.querySelector(UI_CONSTANTS.ELEMENT_IDS.TOGGLE_C_ONLY);
      this._els.toggleAllLabels = this.mount.querySelector(UI_CONSTANTS.ELEMENT_IDS.TOGGLE_ALL_LABELS);
      this._els.middleCSelect = this.mount.querySelector(UI_CONSTANTS.ELEMENT_IDS.MIDDLE_C_SELECT);
      this._els.midiDeviceSelector = this.mount.querySelector(UI_CONSTANTS.ELEMENT_IDS.MIDI_DEVICE_SELECTOR);
    }

    _calculateKeyPosition(key, keyIndex) {
      if (key.type === "white") {
        const whiteKeyIndex = KEYS.slice(0, keyIndex).filter((k) => k.type === "white").length;
        return {
          x: whiteKeyIndex * SVG_LAYOUT_CONSTANTS.WHITE_KEY.SPACING,
          y: 0,
          width: SVG_LAYOUT_CONSTANTS.WHITE_KEY.WIDTH,
          height: SVG_LAYOUT_CONSTANTS.WHITE_KEY.HEIGHT,
        };
      } else {
        const whiteKeysBefore = KEYS.slice(0, keyIndex).filter((k) => k.type === "white").length;
        return {
          x: whiteKeysBefore * SVG_LAYOUT_CONSTANTS.WHITE_KEY.SPACING + SVG_LAYOUT_CONSTANTS.BLACK_KEY.OFFSET,
          y: 0,
          width: SVG_LAYOUT_CONSTANTS.BLACK_KEY.WIDTH,
          height: SVG_LAYOUT_CONSTANTS.BLACK_KEY.HEIGHT,
        };
      }
    }

    _calculateKeyboardWidth() {
      const whiteKeyCount = KEYS.filter((k) => k.type === "white").length;
      return whiteKeyCount * SVG_LAYOUT_CONSTANTS.WHITE_KEY.SPACING;
    }

    _createSVGKey(key, keyIndex) {
      const pos = this._calculateKeyPosition(key, keyIndex);

      const keyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const modifier = key.type === "black" ? UI_CONSTANTS.CSS_CLASSES.BLACK_KEY : UI_CONSTANTS.CSS_CLASSES.WHITE_KEY;
      keyGroup.setAttribute("class", `${UI_CONSTANTS.CSS_CLASSES.KEY_BASE} ${modifier}`);
      keyGroup.setAttribute("data-note", key.note);
      keyGroup.setAttribute("data-octave", String(key.octave));
      keyGroup.setAttribute("data-midi", String(key.midi));
      if (key.midi === MIDI_CONSTANTS.MIDDLE_C) {
        keyGroup.classList.add(UI_CONSTANTS.CSS_CLASSES.MIDDLE_C);
      }

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", pos.x);
      rect.setAttribute("y", pos.y);
      rect.setAttribute("width", pos.width);
      rect.setAttribute("height", pos.height);
      rect.setAttribute("rx", key.type === "black" ? "6" : "4");
      rect.setAttribute("ry", key.type === "black" ? "3" : "4");
      rect.setAttribute("fill", key.type === "black" ? "#111" : "#fff");
      rect.setAttribute("stroke", key.type === "black" ? "#000" : "#ddd");

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("class", UI_CONSTANTS.CSS_CLASSES.KEY_LABEL);
      label.setAttribute("x", pos.x + pos.width / 2);
      label.setAttribute("y", pos.y + pos.height - (key.type === "black" ? 8 : 12));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.textContent = key.note.replace(/\d+$/, String(key.octave + this._middleCShift));

      keyGroup.appendChild(rect);
      keyGroup.appendChild(label);

      return keyGroup;
    }

    _generateKeyboard() {
      const keyboard = this._els.keyboard;
      keyboard.innerHTML = "";

      this._svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const keyboardWidth = this._calculateKeyboardWidth();

      this._svgElement.setAttribute("viewBox", `0 0 ${keyboardWidth} ${SVG_LAYOUT_CONSTANTS.KEYBOARD.HEIGHT}`);
      this._svgElement.setAttribute("preserveAspectRatio", "none");
      this._svgElement.setAttribute("width", "100%");
      this._svgElement.setAttribute("height", "100%");
      this._svgElement.style.borderRadius = "8px";
      this._svgElement.style.boxSizing = "border-box";

      // Draw white keys
      KEYS.forEach((key, idx) => {
        if (key.type === "white") this._svgElement.appendChild(this._createSVGKey(key, idx));
      });
      // Draw black keys
      KEYS.forEach((key, idx) => {
        if (key.type === "black") this._svgElement.appendChild(this._createSVGKey(key, idx));
      });

      // Felt strip overlay
      const feltStrip = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      feltStrip.setAttribute("x", 0);
      feltStrip.setAttribute("y", 0);
      feltStrip.setAttribute("width", keyboardWidth);
      feltStrip.setAttribute("height", SVG_LAYOUT_CONSTANTS.KEYBOARD.FELT_HEIGHT);
      feltStrip.setAttribute("fill", "#aa0000");
      this._svgElement.appendChild(feltStrip);

      keyboard.appendChild(this._svgElement);
    }

    // ------------------------ UI Behaviour ------------------------
    _setLabelMode(mode) {
      const kb = this._els.keyboard;
      if (!kb) return;
      if (mode === UI_CONSTANTS.LABEL_MODES.C_ONLY) {
        kb.classList.add(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
        kb.classList.remove(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
      } else if (mode === UI_CONSTANTS.LABEL_MODES.HIDE_ALL) {
        kb.classList.add(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
        kb.classList.remove(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
      } else {
        kb.classList.remove(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY, UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
      }
    }
    _getCurrentLabelMode() {
      if (this._els.toggleCOnly?.checked) return UI_CONSTANTS.LABEL_MODES.C_ONLY;
      if (this._els.toggleAllLabels?.checked) return UI_CONSTANTS.LABEL_MODES.HIDE_ALL;
      return UI_CONSTANTS.LABEL_MODES.NORMAL;
    }
    _initializeEventHandlers() {
      // Middle C label mode
      this._els.middleCSelect.addEventListener("change", (e) => {
        const mode = e.target.value;
        const shifts = {
          C3: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE,
          C4: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C4_MODE,
          C5: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C5_MODE,
        };
        this._middleCShift = shifts[mode];
        this._generateKeyboard();
      });

      // Label toggles
      this._els.toggleCOnly.addEventListener("change", () => this._setLabelMode(this._getCurrentLabelMode()));
      this._els.toggleAllLabels.addEventListener("change", () => this._setLabelMode(this._getCurrentLabelMode()));
      this._setLabelMode(this._getCurrentLabelMode());
    }

    _setNoteActive(midiNote, isActive) {
      const el = this.mount.querySelector(`[data-midi="${midiNote}"]`);
      if (el) el.classList.toggle(UI_CONSTANTS.CSS_CLASSES.ACTIVE, !!isActive);
    }

    // ------------------------ MIDI ------------------------
    _handleMIDIMessage(ev) {
      const [status, note, velocity = 0] = ev.data || [];
      const type = status & MIDI_CONSTANTS.MESSAGE_TYPES.STATUS_MASK;

      if (
        type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_OFF ||
        (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity === 0)
      ) {
        this._setNoteActive(note, false);
        this.emit("ui:noteoff", { midi: note });
        return;
      }
      if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity > 0) {
        this._setNoteActive(note, true);
        this.emit("ui:noteon", { midi: note, velocity });
      }
    }

    _detachCurrentInput() {
      if (this._currentInput) {
        try { this._currentInput.onmidimessage = null; } catch (_) {}
      }
      this._currentInput = null;
    }

    _attachInputById(id) {
      if (!this._midiAccess) return;
      let found = null;
      for (const input of this._midiAccess.inputs.values()) {
        if (input.id === id) {
          found = input;
          break;
        }
      }
      if (!found) return;
      this._detachCurrentInput();
      this._currentInput = found;
      this._currentInput.onmidimessage = (e) => this._handleMIDIMessage(e);
      try {
        localStorage.setItem(CONFIG_CONSTANTS.STORAGE_KEYS.LAST_MIDI_INPUT, this._currentInput.id);
      } catch (_) {}
    }

    _createDeviceOption(input) {
      const opt = document.createElement("option");
      opt.value = input.id;
      opt.textContent = input.name || input.manufacturer || `Input ${input.id}`;
      return opt;
    }
    _createNoInputsOption() {
      const opt = document.createElement("option");
      opt.textContent = "No MIDI inputs";
      opt.disabled = true;
      opt.selected = true;
      return opt;
    }

    _getInputsArray() {
      return this._midiAccess ? Array.from(this._midiAccess.inputs.values()) : [];
    }
    _getPreferredInputId(inputs) {
      if (inputs.length === 0) return null;
      let saved = null;
      try {
        saved = localStorage.getItem(CONFIG_CONSTANTS.STORAGE_KEYS.LAST_MIDI_INPUT);
      } catch (_) {}
      return inputs.find((i) => i.id === saved) ? saved : inputs[0].id;
    }

    _populateDeviceSelector() {
      const sel = this._els.midiDeviceSelector;
      sel.innerHTML = "";
      const inputs = this._getInputsArray();
      if (inputs.length === 0) {
        sel.appendChild(this._createNoInputsOption());
        return;
      }
      inputs.forEach((inp) => sel.appendChild(this._createDeviceOption(inp)));
      const candidate = this._getPreferredInputId(inputs);
      sel.value = candidate;
      this._attachInputById(candidate);
    }

    _initMIDI() {
      const sel = this._els.midiDeviceSelector;
      if (!navigator.requestMIDIAccess) {
        sel.innerHTML = "";
        sel.disabled = true;
        sel.classList.add(UI_CONSTANTS.CSS_CLASSES.HIDDEN);
        this.emit("app:status", { level: "info", msg: "Web MIDI not supported" });
        return;
      }
      navigator
        .requestMIDIAccess({ sysex: false })
        .then((access) => {
          this._midiAccess = access;
          this._populateDeviceSelector();
          this._midiAccess.onstatechange = () => this.refreshDeviceSelection();
          sel.addEventListener("change", (e) => this._attachInputById(e.target.value));
          this.emit("app:status", { level: "ready", msg: "MIDI ready" });
        })
        .catch(() => {
          sel.disabled = true;
          sel.title = "Web MIDI access denied/unavailable";
          this.emit("app:status", { level: "error", msg: "MIDI access denied" });
        });
    }
  }

  // ==========================================================================
  // EXPORTS
  // ==========================================================================
  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.ClavonikaSVG = ClavonikaSVG;

    // Backwards compatibility wrapper for existing code:
    // Tonika.Clavonika.init("piano", { ... })
    window.Tonika.Clavonika = {
      init(containerIdOrEl, opts = {}) {
        let mountEl = null;
        if (typeof containerIdOrEl === "string") {
          // Accept bare id like "piano" or a selector like "#piano"
          mountEl = document.getElementById(containerIdOrEl) || document.querySelector(containerIdOrEl);
          if (!mountEl) throw new Error(`Clavonika.init(): could not find mount for "${containerIdOrEl}"`);
        } else if (containerIdOrEl && containerIdOrEl.nodeType === 1) {
          mountEl = containerIdOrEl;
        } else {
          throw new Error("Clavonika.init(): invalid mount argument");
        }
        return new ClavonikaSVG({ mount: mountEl, ...opts });
      },
    };
  }
})();