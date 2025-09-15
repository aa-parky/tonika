/*!
 * ============================================================================
 * CHORDONIKA MODULE — Interactive Chord Selection and Keyboard Visualization
 * ============================================================================
 *
 * 🎵 WHAT THIS MODULE DOES (For Artists):
 * This is like having a smart chord chart that shows you:
 * - What notes make up any chord (like C major = C, E, G)
 * - A visual piano keyboard that lights up the chord notes
 * - The ability to explore different chord types and root notes
 * - Real-time feedback as you change selections
 *
 * 🎹 MUSICAL CONCEPTS EXPLAINED:
 * - ROOT NOTE: The "home" note of a chord (like C in C major)
 * - CHORD QUALITY: The "flavor" (major, minor, 7th, etc.)
 * - INTERVALS: The mathematical distances between notes
 * - OCTAVES: The same note in different pitch ranges
 *
 * 💻 TECHNICAL CONCEPTS FOR ARTISTS:
 * - EVENTS: Messages sent when something happens (like selecting a chord)
 * - DOM: The webpage structure that we can modify
 * - CLASSES: Blueprints for creating interactive objects
 * - METHODS: Functions that do specific tasks
 *
 * v1.1.1 — Bus sugar: subscribes via Tonika.Bus.on() and cleans up using returned unsubscribe closures
 */

(() => {
    // ========================================================================
    // 🎵 THE MAIN CHORDONIKA CLASS
    // ========================================================================
    class Chordonika extends Tonika.TonikaModule {
        // ====================================================================
        // 🏗️ CONSTRUCTOR - Setting Up Our Chord Selector
        // ====================================================================
        constructor(opts = {}) {
            super({
                ...opts,
                moduleInfo: {
                    name: "Chordonika",
                    version: "1.1.1",
                    description: "Interactive chord selection and keyboard visualization",
                },
            });

            // 🎛️ SETTINGS
            this.settings = {
                mode: opts.mode ?? "card",
                deferInit: opts.deferInit ?? false,
            };

            // 🎵 STATE
            this.currentChord = null;
            this.isActive = true;

            // ✅ Bus handler bindings (so we can remove them in destroy)
            this._boundOnMidiNoteOn = this._onMidiNoteOn.bind(this);
            this._boundOnMidiNoteOff = this._onMidiNoteOff.bind(this);

            // ✅ Unsubscribe closures (assigned in _initialize via Tonika.Bus.on)
            this._unsubNoteOn = null;
            this._unsubNoteOff = null;
        }

        // ====================================================================
        // 🚀 INITIALIZATION
        // ====================================================================
        _initialize() {
            this._initChordData();
            this._renderUI();
            this._attachUIHandlers();
            this._setDefaultChord();

            // ✅ Subscribe to the central bus (decoupled listening) via sugar API
            // Store unsubscribe closures so destroy() can clean up safely.
            this._unsubNoteOn = Tonika.Bus?.on(
                "midi:noteon",
                this._boundOnMidiNoteOn,
            );
            this._unsubNoteOff = Tonika.Bus?.on(
                "midi:noteoff",
                this._boundOnMidiNoteOff,
            );
        }

        // ====================================================================
        // 🎹 NEW: BUS HANDLERS.
        // ====================================================================
        _onMidiNoteOn(e) {
            const detail = e?.detail || e; // tolerate direct calls in tests
            const note = detail?.note || detail?.data?.note;
            if (note) this.highlightNotes([note]);
        }
        _onMidiNoteOff(e) {
            this._clearHighlights();
        }

        // ====================================================================
        // 🎵 SETTING THE DEFAULT CHORD - D Minor
        // ====================================================================
        _setDefaultChord() {
            const rootSelect = this.mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this.mount?.querySelector(
                "#chordonika-quality-select",
            );

            if (rootSelect) rootSelect.value = "D";
            if (qualitySelect) qualitySelect.value = "minor";

            this._handleChordChange();
        }

        // ====================================================================
        // 🎼 CHORD DATA - Our Musical Knowledge Base
        // ====================================================================
        _initChordData() {
            this.chordData = {
                noteNames: [
                    "C",
                    "C#",
                    "D",
                    "D#",
                    "E",
                    "F",
                    "F#",
                    "G",
                    "G#",
                    "A",
                    "A#",
                    "B",
                ],
                rootNotes: [
                    { value: "C", label: "C" },
                    { value: "C#", label: "C#/Db" },
                    { value: "D", label: "D" },
                    { value: "D#", label: "D#/Eb" },
                    { value: "E", label: "E" },
                    { value: "F", label: "F" },
                    { value: "F#", label: "F#/Gb" },
                    { value: "G", label: "G" },
                    { value: "G#", label: "G#/Ab" },
                    { value: "A", label: "A" },
                    { value: "A#", label: "A#/Bb" },
                    { value: "B", label: "B" },
                ],
                chordQualities: {
                    major: {
                        intervals: [0, 4, 7],
                        label: "Major",
                        symbol: "",
                        priority: 1,
                    },
                    minor: {
                        intervals: [0, 3, 7],
                        label: "Minor",
                        symbol: "m",
                        priority: 2,
                    },
                    diminished: {
                        intervals: [0, 3, 6],
                        label: "Diminished",
                        symbol: "°",
                        priority: 3,
                    },
                    augmented: {
                        intervals: [0, 4, 8],
                        label: "Augmented",
                        symbol: "+",
                        priority: 4,
                    },
                    major7: {
                        intervals: [0, 4, 7, 11],
                        label: "Major 7th",
                        symbol: "maj7",
                        priority: 5,
                    },
                    minor7: {
                        intervals: [0, 3, 7, 10],
                        label: "Minor 7th",
                        symbol: "m7",
                        priority: 6,
                    },
                    dominant7: {
                        intervals: [0, 4, 7, 10],
                        label: "Dominant 7th",
                        symbol: "7",
                        priority: 7,
                    },
                },
            };
        }

        // ====================================================================
        // 🧮 CHORD CALCULATION - The Musical Math
        // ====================================================================
        _calculateChord(rootNote, quality) {
            try {
                const chordQuality = this.chordData.chordQualities[quality];
                if (!chordQuality) return null;

                const rootIndex = this.chordData.noteNames.indexOf(rootNote);
                if (rootIndex === -1) return null;

                const notes = chordQuality.intervals.map((interval) => {
                    const noteIndex = (rootIndex + interval) % 12;
                    return this.chordData.noteNames[noteIndex];
                });

                const symbol = rootNote + chordQuality.symbol;

                this.currentChord = {
                    root: rootNote,
                    quality,
                    symbol,
                    notes,
                    intervals: chordQuality.intervals,
                };

                return this.currentChord;
            } catch (error) {
                console.error("Error calculating chord:", error);
                return null;
            }
        }

        // ====================================================================
        // 🎛️ HANDLING CHORD CHANGES
        // ====================================================================
        _handleChordChange() {
            try {
                const rootSelect = this.mount?.querySelector("#chordonika-root-select");
                const qualitySelect = this.mount?.querySelector(
                    "#chordonika-quality-select",
                );
                const rootNote = rootSelect?.value;
                const quality = qualitySelect?.value;

                if (rootNote && quality && rootNote !== "" && quality !== "") {
                    const chord = this._calculateChord(rootNote, quality);
                    if (chord && chord.notes && Array.isArray(chord.notes)) {
                        this._updateChordDisplay(chord);
                        this._highlightChordNotes(chord);
                        this.emit("ui:chordselected", chord);
                        return;
                    }
                }

                this.currentChord = null;
                this._updateChordDisplay(null);
                this._clearHighlights();
                this.emit("ui:chordselected", null);
            } catch (error) {
                console.error("Error handling chord change:", error);
                this.currentChord = null;
                this._updateChordDisplay(null);
                this._clearHighlights();
                this.emit("ui:chordselected", null);
            }
        }

        // ====================================================================
        // 🧹 CLEARING SELECTION
        // ====================================================================
        _clearSelection() {
            try {
                const rootSelect = this.mount?.querySelector("#chordonika-root-select");
                const qualitySelect = this.mount?.querySelector(
                    "#chordonika-quality-select",
                );
                if (rootSelect) rootSelect.value = "";
                if (qualitySelect) qualitySelect.value = "";

                this.currentChord = null;
                this._updateChordDisplay(null);
                this._clearHighlights();
                this.emit("ui:chordselected", null);
            } catch (error) {
                console.error("Error clearing selection:", error);
            }
        }

        // ====================================================================
        // 🎨 RENDERING THE USER INTERFACE
        // ====================================================================
        _renderUI() {
            if (!this.mount) {
                this.mount = document.createElement("div");
                this.mount.className = `tonika-module chordonika chordonika--${this.settings.mode}`;
                document.body.appendChild(this.mount);
            } else {
                this.mount.classList.add(
                    "tonika-module",
                    "chordonika",
                    `chordonika--${this.settings.mode}`,
                );
            }

            this.mount.innerHTML = this._generateHTML();
            this._populateDropdowns();
        }

        // ====================================================================
        // 📝 GENERATING HTML
        // ====================================================================
        _generateHTML() {
            return `
                <!-- 🎵 HEADER: Title and clear button -->
                <div class="chordonika__header">
                    <h3 class="chordonika__title">Chord Selector</h3>
                    <button class="chordonika__clear-btn tonika-btn tonika-btn--secondary" title="Clear selection">
                        Clear
                    </button>
                </div>

                <!-- 🎛️ CONTROLS -->
                <div class="chordonika__controls">
                    <div class="chordonika__control-group">
                        <label for="chordonika-root-select" class="chordonika__label">Root Note:</label>
                        <select id="chordonika-root-select" class="chordonika__select">
                            <option value="">Select root note...</option>
                        </select>
                    </div>

                    <div class="chordonika__control-group">
                        <label for="chordonika-quality-select" class="chordonika__label">Chord Quality:</label>
                        <select id="chordonika-quality-select" class="chordonika__select">
                            <option value="">Select chord quality...</option>
                        </select>
                    </div>
                </div>

                <!-- 📊 DISPLAY -->
                <div class="chordonika__display">
                    <div class="chordonika__chord-info">
                        <div class="chordonika__chord-symbol">— No chord selected.</div>
                        <div class="chordonika__chord-notes"></div>
                    </div>
                </div>

                <!-- 🎹 KEYBOARD -->
                <div class="chordonika__keyboard">
                    ${this._generateKeyboardHTML()}
                </div>
            `;
        }

        // ====================================================================
        // 🎹 GENERATING THE PIANO KEYBOARD
        // ====================================================================
        _generateKeyboardHTML() {
            const keys = [];

            const whiteKeys = [
                { note: "C", octave: 3, position: "c3" },
                { note: "D", octave: 3, position: "d3" },
                { note: "E", octave: 3, position: "e3" },
                { note: "F", octave: 3, position: "f3" },
                { note: "G", octave: 3, position: "g3" },
                { note: "A", octave: 3, position: "a3" },
                { note: "B", octave: 3, position: "b3" },
                { note: "C", octave: 4, position: "c4" },
                { note: "D", octave: 4, position: "d4" },
                { note: "E", octave: 4, position: "e4" },
                { note: "F", octave: 4, position: "f4" },
                { note: "G", octave: 4, position: "g4" },
                { note: "A", octave: 4, position: "a4" },
                { note: "B", octave: 4, position: "b4" },
            ];

            const blackKeys = [
                { note: "C#", octave: 3, position: "cs3" },
                { note: "D#", octave: 3, position: "ds3" },
                { note: "F#", octave: 3, position: "fs3" },
                { note: "G#", octave: 3, position: "gs3" },
                { note: "A#", octave: 3, position: "as3" },
                { note: "C#", octave: 4, position: "cs4" },
                { note: "D#", octave: 4, position: "ds4" },
                { note: "F#", octave: 4, position: "fs4" },
                { note: "G#", octave: 4, position: "gs4" },
                { note: "A#", octave: 4, position: "as4" },
            ];

            whiteKeys.forEach((key) => {
                keys.push(`
                    <div class="chordonika__key chordonika__key--white chordonika__position--${key.position}"
                         data-note="${key.note}" data-octave="${key.octave}">
                        <span class="chordonika__note-label">${key.note}</span>
                    </div>
                `);
            });

            blackKeys.forEach((key) => {
                keys.push(`
                    <div class="chordonika__key chordonika__key--black chordonika__position--${key.position}"
                         data-note="${key.note}" data-octave="${key.octave}">
                        <span class="chordonika__note-label">${key.note}</span>
                    </div>
                `);
            });

            return keys.join("");
        }

        // ====================================================================
        // 📋 POPULATING DROPDOWNS
        // ====================================================================
        _populateDropdowns() {
            const rootSelect = this.mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this.mount?.querySelector(
                "#chordonika-quality-select",
            );

            if (rootSelect) {
                this.chordData.rootNotes.forEach((root) => {
                    const option = document.createElement("option");
                    option.value = root.value;
                    option.textContent = root.label;
                    rootSelect.appendChild(option);
                });
            }

            if (qualitySelect) {
                const sorted = Object.entries(this.chordData.chordQualities).sort(
                    ([, a], [, b]) => a.priority - b.priority,
                );

                sorted.forEach(([key, quality]) => {
                    const option = document.createElement("option");
                    option.value = key;
                    option.textContent = quality.label;
                    qualitySelect.appendChild(option);
                });
            }
        }

        // ====================================================================
        // 🔗 ATTACHING EVENT HANDLERS
        // ====================================================================
        _attachUIHandlers() {
            if (!this.mount) return;

            const rootSelect = this.mount.querySelector("#chordonika-root-select");
            const qualitySelect = this.mount.querySelector(
                "#chordonika-quality-select",
            );
            const clearBtn = this.mount.querySelector(".chordonika__clear-btn");

            rootSelect?.addEventListener("change", () => this._handleChordChange());
            qualitySelect?.addEventListener("change", () =>
                this._handleChordChange(),
            );
            clearBtn?.addEventListener("click", () => this._clearSelection());
        }

        // ====================================================================
        // 📊 UPDATING THE CHORD DISPLAY
        // ====================================================================
        _updateChordDisplay(chord) {
            try {
                const symbolEl = this.mount?.querySelector(".chordonika__chord-symbol");
                const notesEl = this.mount?.querySelector(".chordonika__chord-notes");

                if (symbolEl) {
                    symbolEl.textContent = chord ? chord.symbol : "— No chord selected.";
                }

                if (notesEl) {
                    if (
                        chord &&
                        chord.notes &&
                        Array.isArray(chord.notes) &&
                        chord.notes.length > 0
                    ) {
                        notesEl.textContent = chord.notes.join(" - ");
                    } else {
                        notesEl.textContent = "";
                    }
                }
            } catch (error) {
                console.error("Error updating chord display:", error);
            }
        }

        // ====================================================================
        // 💡 HIGHLIGHTING CHORD NOTES
        // ====================================================================
        _highlightChordNotes(chord) {
            try {
                if (!chord || !chord.notes || !Array.isArray(chord.notes)) return;

                this._clearHighlights();

                const availableKeys = [];
                const allKeys = this.mount?.querySelectorAll("[data-note]");
                allKeys?.forEach((key) => {
                    const note = key.getAttribute("data-note");
                    const octave = parseInt(key.getAttribute("data-octave"));
                    availableKeys.push({ note, octave, element: key });
                });

                availableKeys.sort((a, b) => {
                    if (a.octave !== b.octave) return a.octave - b.octave;
                    const noteOrder = [
                        "C",
                        "C#",
                        "D",
                        "D#",
                        "E",
                        "F",
                        "F#",
                        "G",
                        "G#",
                        "A",
                        "A#",
                        "B",
                    ];
                    return noteOrder.indexOf(a.note) - noteOrder.indexOf(b.note);
                });

                chord.notes.forEach((chordNote) => {
                    const firstKey = availableKeys.find((key) => key.note === chordNote);
                    if (firstKey) {
                        firstKey.element.classList.add("chordonika__key--active");
                    }
                });
            } catch (error) {
                console.error("Error highlighting chord notes:", error);
            }
        }

        // ====================================================================
        // 🧹 CLEARING HIGHLIGHTS
        // ====================================================================
        _clearHighlights() {
            try {
                const highlightedKeys = this.mount?.querySelectorAll(
                    ".chordonika__key--active",
                );
                highlightedKeys?.forEach((key) =>
                    key.classList.remove("chordonika__key--active"),
                );
            } catch (error) {
                console.error("Error clearing highlights:", error);
            }
        }

        // ====================================================================
        // 🎛️ PUBLIC API METHODS
        // ====================================================================
        selectChord(rootNote, quality) {
            try {
                const rootSelect = this.mount?.querySelector("#chordonika-root-select");
                const qualitySelect = this.mount?.querySelector(
                    "#chordonika-quality-select",
                );
                if (rootSelect) rootSelect.value = rootNote;
                if (qualitySelect) qualitySelect.value = quality;
                this._handleChordChange();
            } catch (error) {
                console.error("Error in selectChord:", error);
            }
        }

        clearSelection() {
            this._clearSelection();
        }

        getChordData() {
            return {
                rootNotes: this.chordData.rootNotes.map((r) => r.value),
                chordQualities: Object.keys(this.chordData.chordQualities),
            };
        }

        highlightNotes(notes) {
            try {
                this._clearHighlights();

                if (Array.isArray(notes)) {
                    const availableKeys = [];
                    const allKeys = this.mount?.querySelectorAll("[data-note]");
                    allKeys?.forEach((key) => {
                        const note = key.getAttribute("data-note");
                        const octave = parseInt(key.getAttribute("data-octave"));
                        availableKeys.push({ note, octave, element: key });
                    });

                    availableKeys.sort((a, b) => {
                        if (a.octave !== b.octave) return a.octave - b.octave;
                        const noteOrder = [
                            "C",
                            "C#",
                            "D",
                            "D#",
                            "E",
                            "F",
                            "F#",
                            "G",
                            "G#",
                            "A",
                            "A#",
                            "B",
                        ];
                        return noteOrder.indexOf(a.note) - noteOrder.indexOf(b.note);
                    });

                    notes.forEach((note) => {
                        const firstKey = availableKeys.find((key) => key.note === note);
                        if (firstKey)
                            firstKey.element.classList.add("chordonika__key--active");
                    });
                }
            } catch (error) {
                console.error("Error in highlightNotes:", error);
            }
        }

        // ====================================================================
        // 📊 STATUS REPORTING
        // ====================================================================
        getStatus() {
            return {
                ...super.getStatus(),
                api: {
                    methods: [
                        "selectChord",
                        "clearSelection",
                        "getChordData",
                        "highlightNotes",
                    ],
                    events: {
                        emits: ["ui:chordselected", "app:status"],
                        listens: ["midi:noteon", "midi:noteoff"],
                    },
                },
                state: {
                    ...super.getStatus().state,
                    currentChord: this.currentChord,
                    isActive: this.isActive,
                },
                capabilities: {
                    chordTypes: Object.keys(this.chordData?.chordQualities || {}),
                    rootNotes: this.chordData?.rootNotes?.map((n) => n.value) || [],
                    supportsKeyboardHighlighting: true,
                    supportsProgrammaticSelection: true,
                },
            };
        }

        // ====================================================================
        // 🔧 INTERNAL HELPER METHODS (Module System)
        // ====================================================================
        _getPublicMethods() {
            return [
                "selectChord",
                "clearSelection",
                "getChordData",
                "highlightNotes",
                "getStatus",
                "destroy",
            ];
        }
        _getEmittedEvents() {
            return ["ui:chordselected", "app:status", "system:module:registered"];
        }
        _getListenedEvents() {
            return ["midi:noteon", "midi:noteoff"];
        }

        // ====================================================================
        // 🧼 CLEANUP
        // ====================================================================
        destroy() {
            // Use unsubscribe closures created by Tonika.Bus.on() sugar
            try {
                this._unsubNoteOn?.();
                this._unsubNoteOff?.();
            } catch (e) {
                console.warn("Chordonika: error while unsubscribing from Bus", e);
            }
            super.destroy();
        }
    }

    // ========================================================================
    // 🌍 GLOBAL REGISTRATION
    // ========================================================================
    window.Chordonika = Chordonika;
})();

/* ============================================================================
 * 🎓 LEARNING RESOURCES FOR ARTISTS
 * (unchanged section omitted for brevity in code; keep your original comments)
 * ============================================================================
 */
