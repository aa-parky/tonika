/**
 * Clavonika SVG - Piano Keyboard Interface (SVG Rendering Edition)
 * Fluid scaling version: keys grow/shrink with container (width + height)
 * Now with felt strip overlay
 */

(function () {
    "use strict";

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

    const SVG_LAYOUT_CONSTANTS = Object.freeze({
        WHITE_KEY: { WIDTH: 24, HEIGHT: 140, SPACING: 25 },
        BLACK_KEY: { WIDTH: 16, HEIGHT: 90, OFFSET: -6 },
        KEYBOARD: { HEIGHT: 160, FELT_HEIGHT: 6 },
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
    <p class="clavonika-title">Clavonika SVG</p>
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
        function emit(type, detail) {
            try { emitter.dispatchEvent(new CustomEvent(type, { detail })); } catch {}
            try {
                if (typeof window !== "undefined" && window.Tonika && window.Tonika.Bus) {
                    window.Tonika.Bus.dispatchEvent(new CustomEvent(type, { detail }));
                }
            } catch {}
        }

        let middleCShift = CONFIG_CONSTANTS.DEFAULT_VALUES.OCTAVE_SHIFT;
        let keyboard, toggleCOnly, toggleAllLabels, middleCSelect, midiDeviceSelector;
        let midiAccess = null, currentInput = null;
        let svgElement = null;

        function calculateKeyPosition(key, keyIndex) {
            if (key.type === "white") {
                const whiteKeyIndex = KEYS.slice(0, keyIndex).filter(k => k.type === "white").length;
                return {
                    x: whiteKeyIndex * SVG_LAYOUT_CONSTANTS.WHITE_KEY.SPACING,
                    y: 0,
                    width: SVG_LAYOUT_CONSTANTS.WHITE_KEY.WIDTH,
                    height: SVG_LAYOUT_CONSTANTS.WHITE_KEY.HEIGHT
                };
            } else {
                const whiteKeysBefore = KEYS.slice(0, keyIndex).filter(k => k.type === "white").length;
                return {
                    x: whiteKeysBefore * SVG_LAYOUT_CONSTANTS.WHITE_KEY.SPACING + SVG_LAYOUT_CONSTANTS.BLACK_KEY.OFFSET,
                    y: 0,
                    width: SVG_LAYOUT_CONSTANTS.BLACK_KEY.WIDTH,
                    height: SVG_LAYOUT_CONSTANTS.BLACK_KEY.HEIGHT
                };
            }
        }

        function calculateKeyboardWidth() {
            const whiteKeyCount = KEYS.filter(k => k.type === "white").length;
            return whiteKeyCount * SVG_LAYOUT_CONSTANTS.WHITE_KEY.SPACING;
        }

        function createSVGKey(key, keyIndex) {
            const position = calculateKeyPosition(key, keyIndex);

            const keyGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            keyGroup.setAttribute("class", key.type === "black" ? UI_CONSTANTS.CSS_CLASSES.BLACK_KEY : UI_CONSTANTS.CSS_CLASSES.WHITE_KEY);
            keyGroup.setAttribute("data-note", key.note);
            keyGroup.setAttribute("data-octave", String(key.octave));
            keyGroup.setAttribute("data-midi", String(key.midi));
            if (key.midi === MIDI_CONSTANTS.MIDDLE_C) {
                keyGroup.classList.add(UI_CONSTANTS.CSS_CLASSES.MIDDLE_C);
            }

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", position.x);
            rect.setAttribute("y", position.y);
            rect.setAttribute("width", position.width);
            rect.setAttribute("height", position.height);
            rect.setAttribute("rx", key.type === "black" ? "6" : "4");
            rect.setAttribute("ry", key.type === "black" ? "3" : "4");

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("class", UI_CONSTANTS.CSS_CLASSES.KEY_LABEL);
            label.setAttribute("x", position.x + position.width / 2);
            label.setAttribute("y", position.y + position.height - (key.type === "black" ? 8 : 12));
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.textContent = key.note.replace(/\d+$/, String(key.octave + middleCShift));

            keyGroup.appendChild(rect);
            keyGroup.appendChild(label);

            return keyGroup;
        }

        function generateKeyboard() {
            keyboard.innerHTML = "";

            svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const keyboardWidth = calculateKeyboardWidth();

            svgElement.setAttribute("viewBox", `0 0 ${keyboardWidth} ${SVG_LAYOUT_CONSTANTS.KEYBOARD.HEIGHT}`);
            svgElement.setAttribute("preserveAspectRatio", "none");
            svgElement.setAttribute("width", "100%");
            svgElement.setAttribute("height", "100%");
            svgElement.style.borderRadius = "8px";
            svgElement.style.boxSizing = "border-box";

            // Draw white keys
            KEYS.forEach((key, index) => {
                if (key.type === "white") {
                    svgElement.appendChild(createSVGKey(key, index));
                }
            });
            // Draw black keys
            KEYS.forEach((key, index) => {
                if (key.type === "black") {
                    svgElement.appendChild(createSVGKey(key, index));
                }
            });

            // --- Felt strip overlay (drawn first, so keys appear above) ---
            const feltStrip = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            feltStrip.setAttribute("x", 0);
            feltStrip.setAttribute("y", 0);
            feltStrip.setAttribute("width", keyboardWidth);
            feltStrip.setAttribute("height", SVG_LAYOUT_CONSTANTS.KEYBOARD.FELT_HEIGHT);
            feltStrip.setAttribute("fill", "#aa0000"); // piano red felt
            svgElement.appendChild(feltStrip);

            keyboard.appendChild(svgElement);
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
                const shifts = {
                    C3: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE,
                    C4: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C4_MODE,
                    C5: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C5_MODE
                };
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

            if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_OFF ||
                (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity === 0)) {
                setNoteActive(note, false);
                emit("ui:noteoff", { midi: note });
                return;
            }

            if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity > 0) {
                setNoteActive(note, true);
                emit("ui:noteon", { midi: note, velocity });
            }
        }

        function detachCurrentInput() { if (currentInput) try { currentInput.onmidimessage = null; } catch {} currentInput = null; }
        function attachInputById(id) {
            if (!midiAccess) return;
            let found = null;
            for (const input of midiAccess.inputs.values()) { if (input.id === id) { found = input; break; } }
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
            emit("app:status", { level: "ready", msg: "SVG UI mounted" });
        }

        return {
            noteOn(midiNote, velocity = 1.0) { setNoteActive(midiNote, true); emit("ui:noteon", { midi: midiNote, velocity }); },
            noteOff(midiNote) { setNoteActive(midiNote, false); emit("ui:noteoff", { midi: midiNote }); },
            initialize,
            on(type, handler, options) { emitter.addEventListener(type, handler, options); return () => emitter.removeEventListener(type, handler, options); },
            off(type, handler, options) { emitter.removeEventListener(type, handler, options); },
            emit,
        };
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