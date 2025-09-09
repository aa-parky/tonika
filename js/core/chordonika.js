// Chordonika Module — Chord Selection and Keyboard Visualization
// A Tonika module for interactive chord selection with visual keyboard feedback
// v1.0.2 — Fixed keyboard rendering and highlighting

(() => {
    class Chordonika {
        /**
         * @param {Object} opts
         * @param {HTMLElement|string} [opts.mount] - Element to mount the module in
         * @param {"card"|"floating"} [opts.mode="card"] - Display mode
         * @param {Function} [opts.onChordSelected] - Callback when chord is selected
         */
        constructor(opts = {}) {
            this.settings = {
                mode: opts.mode ?? "card",
                onChordSelected: opts.onChordSelected ?? null,
            };

            this._mount =
                typeof opts.mount === "string"
                    ? document.querySelector(opts.mount)
                    : opts.mount;
// Initialize chord data
            this._initChordData();

            this._renderUI();
            this._attachUIHandlers();
        }
// === CHORD DATA INITIALIZATION ==========================================
        _initChordData() {
            this.chordData = {
                noteNames: ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],

                rootNotes: [
                    { value: "C",  label: "C"      },
                    { value: "C#", label: "C#/Db"  },
                    { value: "D",  label: "D"      },
                    { value: "D#", label: "D#/Eb"  },
                    { value: "E",  label: "E"      },
                    { value: "F",  label: "F"      },
                    { value: "F#", label: "F#/Gb"  },
                    { value: "G",  label: "G"      },
                    { value: "G#", label: "G#/Ab"  },
                    { value: "A",  label: "A"      },
                    { value: "A#", label: "A#/Bb"  },
                    { value: "B",  label: "B"      },
                ],

                chordQualities: {
                    major: {
                        name: "major",
                        label: "Major",
                        symbol: "",
                        intervals: [0, 4, 7],
                        priority: 1,
                    },
                    minor: {
                        name: "minor",
                        label: "Minor",
                        symbol: "m",
                        intervals: [0, 3, 7],
                        priority: 1,
                    },
                    diminished: {
                        name: "diminished",
                        label: "Diminished",
                        symbol: "°",
                        intervals: [0, 3, 6],
                        priority: 1,
                    },
                    augmented: {
                        name: "augmented",
                        label: "Augmented",
                        symbol: "+",
                        intervals: [0, 4, 8],
                        priority: 2,
                    },
                    major7: {
                        name: "major7",
                        label: "Major 7th",
                        symbol: "maj7",
                        intervals: [0, 4, 7, 11],
                        priority: 2,
                    },
                    minor7: {
                        name: "minor7",
                        label: "Minor 7th",
                        symbol: "m7",
                        intervals: [0, 3, 7, 10],
                        priority: 2,
                    },
                    dominant7: {
                        name: "dominant7",
                        label: "Dominant 7th",
                        symbol: "7",
                        intervals: [0, 4, 7, 10],
                        priority: 2,
                    },
                    diminished7: {
                        name: "diminished7",
                        label: "Diminished 7th",
                        symbol: "°7",
                        intervals: [0, 3, 6, 9],
                        priority: 3,
                    },
                    halfDiminished7: {
                        name: "halfDiminished7",
                        label: "Half Diminished 7th",
                        symbol: "ø7",
                        intervals: [0, 3, 6, 10],
                        priority: 3,
                    },
                    sus2: {
                        name: "sus2",
                        label: "Suspended 2nd",
                        symbol: "sus2",
                        intervals: [0, 2, 7],
                        priority: 2,
                    },
                    sus4: {
                        name: "sus4",
                        label: "Suspended 4th",
                        symbol: "sus4",
                        intervals: [0, 5, 7],
                        priority: 2,
                    },
                }
            };
        }

        // === CHORD CALCULATION ==============================================

        _calculateChord(rootNote, qualityName) {
            if (!rootNote || !qualityName) return null;

            const quality = this.chordData.chordQualities[qualityName];
            if (!quality) return null;

            const rootIndex = this.chordData.noteNames.indexOf(rootNote);
            if (rootIndex === -1) return null;

            const notes = quality.intervals.map(interval => {
                const noteIndex = (rootIndex + interval) % 12;
                return this.chordData.noteNames[noteIndex];
            });

            const symbol = rootNote + quality.symbol;

            return {
                root: rootNote,
                quality: qualityName,
                symbol: symbol,
                notes: notes,
                intervals: quality.intervals
            };
        }

        _findOptimalOctave(notes) {
            // Find the best octave to display the chord (C3-B4 range)
            const baseOctave = 3;
            const keyboardRange = { min: 36, max: 71 }; // C3 to B4 in MIDI

            for (let octave = baseOctave; octave <= 4; octave++) {
                const midiNotes = notes.map(note => {
                    const noteIndex = this.chordData.noteNames.indexOf(note);
                    return (octave * 12) + noteIndex + 12; // +12 for C0 = 12
                });

                if (midiNotes.every(midi => midi >= keyboardRange.min && midi <= keyboardRange.max)) {
                    return midiNotes;
                }
            }

            // Fallback: use octave 3
            return notes.map(note => {
                const noteIndex = this.chordData.noteNames.indexOf(note);
                return (3 * 12) + noteIndex + 12;
            });
        }

        // === KEYBOARD MANAGEMENT ============================================

        _createKeyboard() {
            return `
                <div class="chordonika__keyboard">
                    <div class="chordonika__keys">
                        ${this._generateKeyHTML()}
                    </div>
                </div>
            `;
        }

        _generateKeyHTML() {
            const keyLayout = [
                // white keys
                { note:'C',  octave:3, type:'white', position:'c3' },
                { note:'D',  octave:3, type:'white', position:'d3' },
                { note:'E',  octave:3, type:'white', position:'e3' },
                { note:'F',  octave:3, type:'white', position:'f3' },
                { note:'G',  octave:3, type:'white', position:'g3' },
                { note:'A',  octave:3, type:'white', position:'a3' },
                { note:'B',  octave:3, type:'white', position:'b3' },
                { note:'C',  octave:4, type:'white', position:'c4' },
                { note:'D',  octave:4, type:'white', position:'d4' },
                { note:'E',  octave:4, type:'white', position:'e4' },
                { note:'F',  octave:4, type:'white', position:'f4' },
                { note:'G',  octave:4, type:'white', position:'g4' },
                { note:'A',  octave:4, type:'white', position:'a4' },
                { note:'B',  octave:4, type:'white', position:'b4' },
                // black keys
                { note:'C#', octave:3, type:'black', position:'cs3' },
                { note:'D#', octave:3, type:'black', position:'ds3' },
                { note:'F#', octave:3, type:'black', position:'fs3' },
                { note:'G#', octave:3, type:'black', position:'gs3' },
                { note:'A#', octave:3, type:'black', position:'as3' },
                { note:'C#', octave:4, type:'black', position:'cs4' },
                { note:'D#', octave:4, type:'black', position:'ds4' },
                { note:'F#', octave:4, type:'black', position:'fs4' },
                { note:'G#', octave:4, type:'black', position:'gs4' },
                { note:'A#', octave:4, type:'black', position:'as4' },
            ];

            return keyLayout.map(key => {
                const keyId = `key-${key.position}`;
                const noteLabel = key.note.replace('#', '♯');
                return `
                    <div class="chordonika__key chordonika__key--${key.type} chordonika__position--${key.position}"
                         data-note="${key.note}"
                         data-octave="${key.octave}"
                         data-key-id="${keyId}">
                        <div class="chordonika__note-label">${noteLabel}</div>
                    </div>
                `;
            }).join('');
        }

        _highlightChordNotes(chord) {
            this._clearHighlights();
            if (!chord) return;

            const midiNotes = this._findOptimalOctave(chord.notes);
            midiNotes.forEach(midiNote => {
                const octave = Math.floor((midiNote - 12) / 12);
                const noteIndex = (midiNote - 12) % 12;
                const noteName = this.chordData.noteNames[noteIndex];

                const keyElement = this._mount?.querySelector(
                    `[data-note="${noteName}"][data-octave="${octave}"]`
                );

                if (keyElement) {
                    keyElement.classList.add('chordonika__key--active');
                }
            });
        }

        _clearHighlights() {
            const activeKeys = this._mount?.querySelectorAll('.chordonika__key--active');
            activeKeys?.forEach(key => key.classList.remove('chordonika__key--active'));
        }

        // === UI RENDERING =======================================================
        _renderUI() {
            if (!this._mount) {
                const el = document.createElement("div");
                el.className = `tonika-module chordonika ${this.settings.mode === "card" ? "chordonika--card" : "chordonika--floating"}`;
                el.innerHTML = this._uiHTML();
                document.body.appendChild(el);
                this._mount = el;
            } else {
                this._mount.classList.add("tonika-module", "chordonika");
                this._mount.classList.add(
                    this.settings.mode === "card" ? "chordonika--card" : "chordonika--floating"
                );
                this._mount.innerHTML = this._uiHTML();
            }

            this._populateDropdowns();
        }

        _uiHTML() {
            return `
                <div class="chordonika__header">
                    <div class="chordonika__title-section">
                        <h3 class="chordonika__title">Chord Selection</h3>
                        <div class="chordonika__subtitle">
                            Select chords and see them visualized on the keyboard
                        </div>
                    </div>
                </div>

                <div class="chordonika__content">
                    <div class="chordonika__chord-selector">
                        <div class="chordonika__controls">
                            <div class="chordonika__dropdown-group">
                                <label for="chordonika-root-select">Root Note:</label>
                                <select id="chordonika-root-select" class="tonika-select chordonika__dropdown">
                                    <option value="">Select root note...</option>
                                </select>
                            </div>
                            <div class="chordonika__dropdown-group">
                                <label for="chordonika-quality-select">Chord Quality:</label>
                                <select id="chordonika-quality-select" class="tonika-select chordonika__dropdown">
                                    <option value="">Select chord quality...</option>
                                </select>
                            </div>
                        </div>

                        <div class="chordonika__chord-info" aria-live="polite">
                            <div class="chordonika__chord-details">
                                <div class="chordonika__chord-symbol"></div>
                                <div class="chordonika__chord-notes"></div>
                            </div>
                            <button class="tonika-btn tonika-btn--danger chordonika__clear-btn">Clear</button>
                        </div>
                    </div>

                    <div class="chordonika__keyboard-container">
                        ${this._createKeyboard()}
                    </div>
                </div>
            `;
        }

        _populateDropdowns() {
            const rootSelect = this._mount?.querySelector('#chordonika-root-select');
            const qualitySelect = this._mount?.querySelector('#chordonika-quality-select');

            if (rootSelect) {
                this.chordData.rootNotes.forEach(root => {
                    const option = document.createElement('option');
                    option.value = root.value;
                    option.textContent = root.label;
                    rootSelect.appendChild(option);
                });
            }

            if (qualitySelect) {
                // Sort qualities by priority
                const sortedQualities = Object.entries(this.chordData.chordQualities)
                    .sort(([,a], [,b]) => a.priority - b.priority);

                sortedQualities.forEach(([key, quality]) => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = quality.label;
                    qualitySelect.appendChild(option);
                });
            }
        }

        // === EVENT HANDLING ==================================================

        _attachUIHandlers() {
            if (!this._mount) return;

            // Dropdown change handlers
            const rootSelect = this._mount.querySelector('#chordonika-root-select');
            const qualitySelect = this._mount.querySelector('#chordonika-quality-select');
            const clearBtn = this._mount.querySelector('.chordonika__clear-btn');

            rootSelect?.addEventListener('change', () => this._handleChordChange());
            qualitySelect?.addEventListener('change', () => this._handleChordChange());
            clearBtn?.addEventListener('click', () => this._clearSelection());
        }

        _handleChordChange() {
            const rootSelect = this._mount?.querySelector('#chordonika-root-select');
            const qualitySelect = this._mount?.querySelector('#chordonika-quality-select');

            const rootNote = rootSelect?.value;
            const quality = qualitySelect?.value;

            if (rootNote && quality) {
                const chord = this._calculateChord(rootNote, quality);
                this._updateChordDisplay(chord);
                this._highlightChordNotes(chord);

                if (this.settings.onChordSelected) {
                    this.settings.onChordSelected(chord);
                }
            } else {
                this._updateChordDisplay(null);
                this._clearHighlights();

                if (this.settings.onChordSelected) {
                    this.settings.onChordSelected(null);
                }
            }
        }

        _clearSelection() {
            const rootSelect = this._mount?.querySelector('#chordonika-root-select');
            const qualitySelect = this._mount?.querySelector('#chordonika-quality-select');

            if (rootSelect) rootSelect.value = "";
            if (qualitySelect) qualitySelect.value = "";
            this._updateChordDisplay(null);
            this._clearHighlights();

            if (this.settings.onChordSelected) {
                this.settings.onChordSelected(null);
            }
        }

        _updateChordDisplay(chord) {
            const symbolEl = this._mount?.querySelector('.chordonika__chord-symbol');
            const notesEl = this._mount?.querySelector('.chordonika__chord-notes');

            if (symbolEl) {
                symbolEl.textContent = chord ? chord.symbol : "";
            }

            if (notesEl) {
                notesEl.textContent = chord ? chord.notes.join(' - ') : "";
            }
        }
// === PUBLIC API ======================================================
    }

    // Export to global scope
    window.Chordonika = Chordonika;
})();

