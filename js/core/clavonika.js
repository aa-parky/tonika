/**
 * Clavonika - Piano Keyboard Interface (Tonika core edition)
 * - Factory API preserved: Tonika.Clavonika.init(containerId|el) -> instance
 * - Adds EventTarget-based emitter: instance.on/off/emit
 * - Emits: 'ui:noteon' {midi, velocity}, 'ui:noteoff' {midi}, 'app:status' {level,msg}
 * - Removes ESM export; attaches to window.Tonika
 */

/* eslint-env browser */

(function () {
    "use strict";

    // Emitter base (TonikaEmitter if present, else EventTarget)
    const EmitterBase =
        (typeof window !== "undefined" &&
            window.Tonika &&
            window.Tonika.TonikaEmitter) ||
        EventTarget;

    // ===== CONSTANTS =====

    const MIDI_CONSTANTS = Object.freeze({
        PIANO_RANGE: { LOWEST_NOTE: 21, HIGHEST_NOTE: 108 },
        MIDDLE_C: 60,
        MESSAGE_TYPES: { NOTE_OFF: 0x80, NOTE_ON: 0x90, STATUS_MASK: 0xf0 },
    });

    const MUSIC_CONSTANTS = Object.freeze({
        SEMITONES_PER_OCTAVE: 12,
        NOTE_NAMES: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
        OCTAVE_ADJUSTMENTS: { C3_MODE: -1, C4_MODE: 0, C5_MODE: 1 },
        BASE_OCTAVE_OFFSET: -1,
    });

    const LAYOUT_CONSTANTS = Object.freeze({
        WHITE_KEY: { WIDTH: 24, HEIGHT: 140, SPACING: 25 },
        BLACK_KEY: { WIDTH: 16, HEIGHT: 90, OFFSET: 6 },
    });

    const UI_CONSTANTS = Object.freeze({
        CSS_CLASSES: {
            SHOW_C_ONLY: "show-c-only",
            HIDE_ALL_LABELS: "hide-all-labels",
            MIDDLE_C: "middle-c",
            WHITE_KEY: "white-key",
            BLACK_KEY: "black-key",
            ACTIVE: "active",
            KEY_LABEL: "key-label",
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
        DEFAULT_VALUES: { MIDDLE_C_MODE: "C3", OCTAVE_SHIFT: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE },
    });

    const HTML_TEMPLATE = `
<section class="piano-wrapper">
  <div class="midi-device-label">
    <label for="midiDeviceSelector">Select MIDI Input:</label>
    <select id="midiDeviceSelector"></select>
  </div>
  <div class="piano-controls">
    <label><input type="checkbox" id="toggleCOnly"/> Show only C notes</label>
    <label><input type="checkbox" id="toggleAllLabels"/> Hide all note labels</label>
    <label class="middle-c-label">
      <span>Middle C Label:</span>
      <select id="middleC">
        <option value="C3" selected>C3 (Kawai VPC1, Yamaha, Logic)</option>
        <option value="C4">C4 (General MIDI)</option>
        <option value="C5">C5 (Notation, FL)</option>
      </select>
    </label>
  </div>

  <div class="piano-container">
 <p class="clavonika-title">Clavonika</p>
    <div class="keyboard" id="keyboard"></div>
  </div>
</section>
`;

    function generateKeys() {
        const out = [];
        for (let midi = MIDI_CONSTANTS.PIANO_RANGE.LOWEST_NOTE; midi <= MIDI_CONSTANTS.PIANO_RANGE.HIGHEST_NOTE; midi++) {
            const name = MUSIC_CONSTANTS.NOTE_NAMES[midi % MUSIC_CONSTANTS.SEMITONES_PER_OCTAVE];
            const octave = Math.floor(midi / MUSIC_CONSTANTS.SEMITONES_PER_OCTAVE) + MUSIC_CONSTANTS.BASE_OCTAVE_OFFSET;
            out.push({ note: name + octave, type: name.includes("#") ? "black" : "white", octave, midi });
        }
        return out;
    }
    const KEYS = generateKeys();

    function createClavonikaInstance(container) {
        const emitter = new EmitterBase();
        const emit = (type, detail) => emitter.dispatchEvent(new CustomEvent(type, { detail }));

        let middleCShift = CONFIG_CONSTANTS.DEFAULT_VALUES.OCTAVE_SHIFT;
        let keyboard, toggleCOnly, toggleAllLabels, middleCSelect, midiDeviceSelector;
        let midiAccess = null, currentInput = null;

        function createKeyElement(key) {
            const el = document.createElement("div");
            el.className = key.type === "black" ? UI_CONSTANTS.CSS_CLASSES.BLACK_KEY : UI_CONSTANTS.CSS_CLASSES.WHITE_KEY;
            el.dataset.note = key.note;
            el.dataset.octave = String(key.octave);
            el.dataset.midi = String(key.midi);
            if (key.midi === MIDI_CONSTANTS.MIDDLE_C) el.classList.add(UI_CONSTANTS.CSS_CLASSES.MIDDLE_C);
            const label = document.createElement("span");
            label.className = UI_CONSTANTS.CSS_CLASSES.KEY_LABEL;
            label.textContent = key.note.replace(/\d+$/, String(key.octave + middleCShift));
            el.appendChild(label);
            return el;
        }

        function processKeys(keyList, isBlackKeys = false) {
            keyList.forEach((key) => {
                const keyElement = createKeyElement(key);
                if (isBlackKeys) {
                    const idx = KEYS.indexOf(key);
                    const whiteBefore = KEYS.slice(0, idx).filter((k) => k.type === "white").length;
                    keyElement.style.left = whiteBefore * LAYOUT_CONSTANTS.WHITE_KEY.SPACING + LAYOUT_CONSTANTS.BLACK_KEY.OFFSET + "px";
                }
                keyboard.appendChild(keyElement);
            });
        }

        function generateKeyboard() {
            keyboard.innerHTML = "";
            processKeys(KEYS.filter((k) => k.type === "white"), false);
            processKeys(KEYS.filter((k) => k.type === "black"), true);
        }

        function setLabelMode(mode) {
            if (mode === UI_CONSTANTS.LABEL_MODES.C_ONLY) {
                keyboard.classList.add(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
            } else if (mode === UI_CONSTANTS.LABEL_MODES.HIDE_ALL) {
                keyboard.classList.add(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
            } else {
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY, UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
            }
        }

        function getCurrentLabelMode() {
            if (toggleCOnly.checked) return UI_CONSTANTS.LABEL_MODES.C_ONLY;
            if (toggleAllLabels.checked) return UI_CONSTANTS.LABEL_MODES.HIDE_ALL;
            return UI_CONSTANTS.LABEL_MODES.NORMAL;
        }

        function initializeEventHandlers() {
            middleCSelect.addEventListener("change", (e) => {
                const mode = e.target.value;
                const shifts = { C3: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE, C4: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C4_MODE, C5: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C5_MODE };
                middleCShift = shifts[mode];
                generateKeyboard();
            });
            toggleCOnly.addEventListener("change", () => setLabelMode(getCurrentLabelMode()));
            toggleAllLabels.addEventListener("change", () => setLabelMode(getCurrentLabelMode()));
            setLabelMode(getCurrentLabelMode());
        }

        function setNoteActive(midiNote, isActive) {
            const el = container.querySelector(`[data-midi="${midiNote}"]`);
            if (el) el.classList.toggle(UI_CONSTANTS.CSS_CLASSES.ACTIVE, isActive);
        }

        function handleMIDIMessage(ev) {
            const [status, note, velocity = 0] = ev.data || [];
            const type = status & MIDI_CONSTANTS.MESSAGE_TYPES.STATUS_MASK;
            if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_OFF || (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity === 0)) {
                setNoteActive(note, false);
                emit("ui:noteoff", { midi: note });
                return;
            }
            if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity > 0) {
                setNoteActive(note, true);
                emit("ui:noteon", { midi: note, velocity });
            }
        }

        function detachCurrentInput() {
            if (currentInput) try { currentInput.onmidimessage = null; } catch {}
            currentInput = null;
        }

        function attachInputById(id) {
            if (!midiAccess) return;
            let found = null;
            for (const input of midiAccess.inputs.values()) {
                if (input.id === id) { found = input; break; }
            }
            if (!found) return;
            detachCurrentInput();
            currentInput = found;
            currentInput.onmidimessage = handleMIDIMessage;
            try { localStorage.setItem(CONFIG_CONSTANTS.STORAGE_KEYS.LAST_MIDI_INPUT, currentInput.id); } catch {}
        }

        function createDeviceOption(input) {
            const opt = document.createElement("option");
            opt.value = input.id;
            opt.textContent = input.name || input.manufacturer || `Input ${input.id}`;
            return opt;
        }
        function createNoInputsOption() {
            const opt = document.createElement("option");
            opt.textContent = "No MIDI inputs"; opt.disabled = true; opt.selected = true;
            return opt;
        }

        function getInputsArray() { return midiAccess ? Array.from(midiAccess.inputs.values()) : []; }

        function getPreferredInputId(inputs) {
            if (inputs.length === 0) return null;
            let saved = null;
            try { saved = localStorage.getItem(CONFIG_CONSTANTS.STORAGE_KEYS.LAST_MIDI_INPUT); } catch {}
            return inputs.find((i) => i.id === saved) ? saved : inputs[0].id;
        }

        function populateDeviceSelector() {
            midiDeviceSelector.innerHTML = "";
            const inputs = getInputsArray();
            if (inputs.length === 0) { midiDeviceSelector.appendChild(createNoInputsOption()); return; }
            inputs.forEach((inp) => midiDeviceSelector.appendChild(createDeviceOption(inp)));
            const candidate = getPreferredInputId(inputs);
            midiDeviceSelector.value = candidate;
            attachInputById(candidate);
        }

        function refreshDeviceSelection(preserve = null) {
            const prev = preserve || midiDeviceSelector.value;
            populateDeviceSelector();
            if (prev && getInputsArray().some((i) => i.id === prev)) {
                midiDeviceSelector.value = prev;
                attachInputById(prev);
            }
        }

        function initMIDI() {
            if (!navigator.requestMIDIAccess) {
                midiDeviceSelector.innerHTML = "";
                midiDeviceSelector.disabled = true;
                midiDeviceSelector.classList.add("hidden");
                emit("app:status", { level: "info", msg: "Web MIDI not supported" });
                return;
            }
            navigator.requestMIDIAccess({ sysex: false })
                .then((access) => {
                    midiAccess = access;
                    populateDeviceSelector();
                    midiAccess.onstatechange = () => refreshDeviceSelection();
                    midiDeviceSelector.addEventListener("change", (e) => attachInputById(e.target.value));
                    emit("app:status", { level: "ready", msg: "MIDI ready" });
                })
                .catch(() => {
                    midiDeviceSelector.disabled = true;
                    midiDeviceSelector.title = "Web MIDI access denied/unavailable";
                    emit("app:status", { level: "error", msg: "MIDI access denied" });
                });
        }

        function initialize() {
            keyboard = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.KEYBOARD);
            toggleCOnly = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.TOGGLE_C_ONLY);
            toggleAllLabels = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.TOGGLE_ALL_LABELS);
            middleCSelect = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.MIDDLE_C_SELECT);
            midiDeviceSelector = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.MIDI_DEVICE_SELECTOR);
            generateKeyboard();
            initializeEventHandlers();
            initMIDI();
            emit("app:status", { level: "ready", msg: "UI mounted" });
        }

        const api = {
            noteOn(midiNote, velocity = 1.0) { setNoteActive(midiNote, true); emit("ui:noteon", { midi: midiNote, velocity }); },
            noteOff(midiNote) { setNoteActive(midiNote, false); emit("ui:noteoff", { midi: midiNote }); },
            initialize,
            on(type, handler, options) { emitter.addEventListener(type, handler, options); return () => emitter.removeEventListener(type, handler, options); },
            off(type, handler, options) { emitter.removeEventListener(type, handler, options); },
            emit,
        };
        return api;
    }

    const Clavonika = {
        init(containerIdOrEl) {
            let container;
            if (typeof containerIdOrEl === "string") {
                container = document.getElementById(containerIdOrEl);
                if (!container) throw new Error(`Container with id '${containerIdOrEl}' not found`);
            } else if (containerIdOrEl && containerIdOrEl.nodeType === 1) {
                container = containerIdOrEl;
            } else {
                throw new Error("Invalid container: must be an element ID string or DOM element");
            }
            container.classList.add("clavonika-container");
            container.innerHTML = HTML_TEMPLATE;
            const instance = createClavonikaInstance(container);
            instance.initialize();
            return instance;
        },
    };

    if (typeof window !== "undefined") {
        window.Tonika = window.Tonika || {};
        window.Tonika.Clavonika = Clavonika;
    }
})();