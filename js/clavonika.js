/**
 * Clavonika - Piano Keyboard Interface
 * Modular version - Requires an external CSS file
 *
 * Usage:
 *   <link rel="stylesheet" href="clavonika.css">
 *   <script src="clavonika.js"></script>
 *   <script>
 *     const piano = Clavonika.init('container-id');
 *     // Live MIDI will highlight keys automatically.
 *     // You can also call:
 *     // piano.noteOn(60);  // Play middle C
 *     // piano.noteOff(60); // Stop middle C
 *   </script>
 */

    "use strict";

    // ===== CONSTANTS =====

    // MIDI-related constants
    const MIDI_CONSTANTS = Object.freeze({
        PIANO_RANGE: {
            LOWEST_NOTE: 21,    // A0 - lowest key on an 88-key piano
            HIGHEST_NOTE: 108   // C8 - highest key on 88-key piano
        },
        MIDDLE_C: 60,           // MIDI note the number for middle C
        MESSAGE_TYPES: {
            NOTE_OFF: 0x80,
            NOTE_ON: 0x90,
            STATUS_MASK: 0xf0
        }
    });

    // Music theory constants
    const MUSIC_CONSTANTS = Object.freeze({
        SEMITONES_PER_OCTAVE: 12,
        NOTE_NAMES: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
        OCTAVE_ADJUSTMENTS: {
            C3_MODE: -1,  // Kawai VPC1, Yamaha, Logic
            C4_MODE: 0,   // Midonika, General MIDI
            C5_MODE: 1    // Notation, FL Studio
        },
        BASE_OCTAVE_OFFSET: -1  // MIDI octave calculation offset
    });

    // Layout and positioning constants
    const LAYOUT_CONSTANTS = Object.freeze({
        WHITE_KEY: {
            WIDTH: 24,      // pixels
            HEIGHT: 140,    // pixels
            SPACING: 25     // pixels between white keys
        },
        BLACK_KEY: {
            WIDTH: 16,      // pixels
            HEIGHT: 90,     // pixels
            OFFSET: 6       // pixels offset for positioning
        }
    });

    // UI element constants
    const UI_CONSTANTS = Object.freeze({
        CSS_CLASSES: {
            SHOW_C_ONLY: "show-c-only",
            HIDE_ALL_LABELS: "hide-all-labels",
            MIDDLE_C: "middle-c",
            WHITE_KEY: "white-key",
            BLACK_KEY: "black-key",
            ACTIVE: "active",
            KEY_LABEL: "key-label"
        },
        ELEMENT_IDS: {
            TOGGLE_C_ONLY: "#toggleCOnly",
            TOGGLE_ALL_LABELS: "#toggleAllLabels",
            MIDDLE_C_SELECT: "#middleC",
            MIDI_DEVICE_SELECTOR: "#midiDeviceSelector",
            KEYBOARD: "#keyboard"
        },
        LABEL_MODES: {
            C_ONLY: "c-only",
            HIDE_ALL: "hide-all",
            NORMAL: "normal"
        }
    });

    // Configuration constants
    const CONFIG_CONSTANTS = Object.freeze({
        STORAGE_KEYS: {
            LAST_MIDI_INPUT: "clavonika:lastInputId"
        },
        DEFAULT_VALUES: {
            MIDDLE_C_MODE: "C3",
            OCTAVE_SHIFT: MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE
        }
    });

    // HTML Template
    const HTML_TEMPLATE = `
<section class="piano-wrapper">
  <div class="midi-device-label">
	<label for="midiDeviceSelector">Select MIDI Input:</label>
	<select id="midiDeviceSelector"></select>
  </div>
  <div class="piano-controls">
	<label>
	  <input type="checkbox" id="toggleCOnly" />
	  Show only C notes
	</label>
	<label>
	  <input type="checkbox" id="toggleAllLabels" />
	  Hide all note labels
	</label>
	<label class="middle-c-label">
	  <span>Middle C Label:</span>
	  <select id="middleC">
		<option value="C3" selected>C3 (Kawai VPC1, Yamaha, Logic)</option>
		<option value="C4">C4 (Midonika, General MIDI)</option>
		<option value="C5">C5 (Notation, FL Studio)</option>
	  </select>
	</label>
  </div>

  <div class="piano-container">
	<div class="keyboard" id="keyboard"></div>
  </div>
</section>
`;

    // ===== CORE FUNCTIONALITY =====

    // Piano keys data generation
    function generateKeys() {
        const out = [];
        for (let midi = MIDI_CONSTANTS.PIANO_RANGE.LOWEST_NOTE;
             midi <= MIDI_CONSTANTS.PIANO_RANGE.HIGHEST_NOTE;
             midi++) {
            const name = MUSIC_CONSTANTS.NOTE_NAMES[midi % MUSIC_CONSTANTS.SEMITONES_PER_OCTAVE];
            const octave = Math.floor(midi / MUSIC_CONSTANTS.SEMITONES_PER_OCTAVE) +
                MUSIC_CONSTANTS.BASE_OCTAVE_OFFSET;
            out.push({
                note: name + octave,
                type: name.includes("#") ? UI_CONSTANTS.CSS_CLASSES.BLACK_KEY.replace("-key", "") :
                    UI_CONSTANTS.CSS_CLASSES.WHITE_KEY.replace("-key", ""),
                octave,
                midi,
            });
        }
        return out;
    }
    const keys = generateKeys();

    // Core functionality
    function createClavonikaInstance(container) {
        let middleCShift = CONFIG_CONSTANTS.DEFAULT_VALUES.OCTAVE_SHIFT;
        let keyboard, toggleCOnly, toggleAllLabels, middleCSelect, midiDeviceSelector;

        // === MIDI state ===
        let midiAccess = null;
        let currentInput = null;

        function createKeyElement(key) {
            const el = document.createElement("div");
            el.className = key.type === "black" ? UI_CONSTANTS.CSS_CLASSES.BLACK_KEY :
                UI_CONSTANTS.CSS_CLASSES.WHITE_KEY;
            el.dataset.note = key.note;
            el.dataset.octave = String(key.octave);
            el.dataset.midi = String(key.midi);

            if (key.midi === MIDI_CONSTANTS.MIDDLE_C) {
                el.classList.add(UI_CONSTANTS.CSS_CLASSES.MIDDLE_C);
            }

            const label = document.createElement("span");
            label.className = UI_CONSTANTS.CSS_CLASSES.KEY_LABEL;
            label.textContent = key.note.replace(
                /\d+$/,
                String(key.octave + middleCShift),
            );
            el.appendChild(label);

            return el;
        }

        function processKeys(keyList, isBlackKeys = false) {
            keyList.forEach((key) => {
                const keyElement = createKeyElement(key);

                if (isBlackKeys) {
                    const keysBefore = keys.slice(0, keys.indexOf(key));
                    const whiteKeysBefore = keysBefore.filter(
                        (k) => k.type === "white",
                    ).length;
                    keyElement.style.left = whiteKeysBefore * LAYOUT_CONSTANTS.WHITE_KEY.SPACING +
                        LAYOUT_CONSTANTS.BLACK_KEY.OFFSET + "px";
                }

                keyboard.appendChild(keyElement);
            });
        }

        function generateKeyboard() {
            keyboard.innerHTML = "";

            const whiteKeys = keys.filter((k) => k.type === "white");
            const blackKeys = keys.filter((k) => k.type === "black");

            processKeys(whiteKeys, false);
            processKeys(blackKeys, true);
        }

        function setLabelMode(mode) {
            if (mode === UI_CONSTANTS.LABEL_MODES.C_ONLY) {
                keyboard.classList.add(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
                toggleCOnly.checked = true;
                toggleAllLabels.checked = false;
            } else if (mode === UI_CONSTANTS.LABEL_MODES.HIDE_ALL) {
                keyboard.classList.add(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
                toggleCOnly.checked = false;
                toggleAllLabels.checked = true;
            } else {
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.SHOW_C_ONLY);
                keyboard.classList.remove(UI_CONSTANTS.CSS_CLASSES.HIDE_ALL_LABELS);
                toggleCOnly.checked = false;
                toggleAllLabels.checked = false;
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
                const octaveShifts = {
                    "C3": MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C3_MODE,
                    "C4": MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C4_MODE,
                    "C5": MUSIC_CONSTANTS.OCTAVE_ADJUSTMENTS.C5_MODE
                };
                middleCShift = octaveShifts[mode];
                generateKeyboard();
            });

            toggleCOnly.addEventListener("change", () => {
                setLabelMode(getCurrentLabelMode());
            });

            toggleAllLabels.addEventListener("change", () => {
                setLabelMode(getCurrentLabelMode());
            });

            // Ensure the UI reflects current checkbox states on init
            setLabelMode(getCurrentLabelMode());
        }

        function setNoteActive(midiNote, isActive) {
            const el = container.querySelector(`[data-midi="${midiNote}"]`);
            if (el) el.classList.toggle(UI_CONSTANTS.CSS_CLASSES.ACTIVE, isActive);
        }

        // ===== Web MIDI integration =====
        function handleMIDIMessage(ev) {
            const [status, note, velocity = 0] = ev.data || [];
            const type = status & MIDI_CONSTANTS.MESSAGE_TYPES.STATUS_MASK;

            // Note Off or Note On with velocity 0 (running note-off)
            if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_OFF ||
                (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity === 0)) {
                setNoteActive(note, false);
                return;
            }
            // Note On
            if (type === MIDI_CONSTANTS.MESSAGE_TYPES.NOTE_ON && velocity > 0) {
                setNoteActive(note, true);
            }
        }

        function detachCurrentInput() {
            if (currentInput) {
                try {
                    currentInput.onmidimessage = null;
                } catch (_) {}
            }
            currentInput = null;
        }

        function attachInputById(id) {
            if (!midiAccess) return;
            let found = null;
            for (const input of midiAccess.inputs.values()) {
                if (input.id === id) {
                    found = input;
                    break;
                }
            }
            if (!found) return;

            detachCurrentInput();
            currentInput = found;
            currentInput.onmidimessage = handleMIDIMessage;
            localStorage.setItem(CONFIG_CONSTANTS.STORAGE_KEYS.LAST_MIDI_INPUT, currentInput.id);
        }

        function createDeviceOption(input) {
            const opt = document.createElement("option");
            opt.value = input.id;
            opt.textContent = input.name || input.manufacturer || `Input ${input.id}`;
            return opt;
        }

        function createNoInputsOption() {
            const opt = document.createElement("option");
            opt.textContent = "No MIDI inputs";
            opt.disabled = true;
            opt.selected = true;
            return opt;
        }

        function getInputsArray() {
            if (!midiAccess) return [];
            return Array.from(midiAccess.inputs.values());
        }

        function getPreferredInputId(inputs) {
            if (inputs.length === 0) return null;

            const saved = localStorage.getItem(CONFIG_CONSTANTS.STORAGE_KEYS.LAST_MIDI_INPUT);
            return inputs.find(i => i.id === saved) ? saved : inputs[0].id;
        }

        function populateDeviceSelector() {
            // Clear
            midiDeviceSelector.innerHTML = "";

            const inputs = getInputsArray();
            if (inputs.length === 0) {
                midiDeviceSelector.appendChild(createNoInputsOption());
                return;
            }

            inputs.forEach((inp) => {
                midiDeviceSelector.appendChild(createDeviceOption(inp));
            });

            // Prefer last used if present; else first input
            const candidate = getPreferredInputId(inputs);
            midiDeviceSelector.value = candidate;

            // CRITICAL: bind immediately so keys respond without flipping inputs
            attachInputById(candidate);
        }

        function refreshDeviceSelection(preserveSelection = null) {
            const prev = preserveSelection || midiDeviceSelector.value;
            populateDeviceSelector();

            // If previous id still exists, ensure we stay on it
            if (prev && getInputsArray().some((i) => i.id === prev)) {
                midiDeviceSelector.value = prev;
                attachInputById(prev);
            }
        }

        function initMIDI() {
            if (!navigator.requestMIDIAccess) {
                // Hide selector if Web MIDI is not supported
                midiDeviceSelector.innerHTML = "";
                midiDeviceSelector.disabled = true;
                midiDeviceSelector.classList.add("hidden");
                return;
            }

            navigator
                .requestMIDIAccess({ sysex: false })
                .then((access) => {
                    midiAccess = access;
                    populateDeviceSelector();

                    // React to hot-plug
                    midiAccess.onstatechange = () => {
                        refreshDeviceSelection();
                    };

                    midiDeviceSelector.addEventListener("change", (e) => {
                        const id = e.target.value;
                        attachInputById(id);
                    });
                })
                .catch(() => {
                    // On failure, disable selector
                    midiDeviceSelector.disabled = true;
                    midiDeviceSelector.title = "Web MIDI access denied/unavailable";
                });
        }
        // ===== end Web MIDI integration =====

        function initialize() {
            // Get elements using constants
            keyboard = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.KEYBOARD);
            toggleCOnly = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.TOGGLE_C_ONLY);
            toggleAllLabels = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.TOGGLE_ALL_LABELS);
            middleCSelect = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.MIDDLE_C_SELECT);
            midiDeviceSelector = container.querySelector(UI_CONSTANTS.ELEMENT_IDS.MIDI_DEVICE_SELECTOR);

            // Generate keyboard and set up event handlers
            generateKeyboard();
            initializeEventHandlers();

            // Initialize Web MIDI (auto-binds to the last used input if present)
            initMIDI();
        }

        // Public API
        return {
            noteOn: function (midiNote) {
                setNoteActive(midiNote, true);
            },
            noteOff: function (midiNote) {
                setNoteActive(midiNote, false);
            },
            initialize: initialize,
        };
    }

    // Main Clavonika object
    const Clavonika = {
        init: function (containerId) {
            let container;
            if (typeof containerId === "string") {
                container = document.getElementById(containerId);
                if (!container) {
                    throw new Error(`Container with id '${containerId}' not found`);
                }
            } else if (containerId && containerId.nodeType === 1) {
                container = containerId;
            } else {
                throw new Error(
                    "Invalid container: must be an element ID string or DOM element",
                );
            }

            container.classList.add("clavonika-container");
            container.innerHTML = HTML_TEMPLATE;

            const instance = createClavonikaInstance(container);
            instance.initialize();

            return instance;
        },
    };

    export default Clavonika;

