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
 * v1.0.3 — Perfect single-octave display with default D minor
 */

(() => {
    // ========================================================================
    // 🎵 THE MAIN CHORDONIKA CLASS
    // ========================================================================
    // Think of this as the "blueprint" for creating a chord selector.
    // Just like a guitar has strings, frets, and a body, our chord selector
    // has dropdowns, a keyboard display, and chord calculation logic.

    class Chordonika extends Tonika.TonikaModule {

        // ====================================================================
        // 🏗️ CONSTRUCTOR - Setting Up Our Chord Selector
        // ====================================================================
        // This is like tuning a guitar before you play - we set up all the
        // basic settings and prepare the chord selector for use.

        constructor(opts = {}) {
            // Call the parent class (like inheriting musical knowledge)
            super({
                ...opts,
                moduleInfo: {
                    name: 'Chordonika',
                    version: '1.0.3',
                    description: 'Interactive chord selection and keyboard visualization'
                }
            });

            // 🎛️ SETTINGS: Like the knobs on an amplifier
            this.settings = {
                mode: opts.mode ?? "card",        // How it looks (card style)
                deferInit: opts.deferInit ?? false, // Wait to start or start immediately
            };

            // 🎵 STATE VARIABLES: What chord are we currently showing?
            this.currentChord = null;  // No chord selected initially
            this.isActive = true;      // The module is ready to use
        }

        // ====================================================================
        // 🚀 INITIALIZATION - Getting Everything Ready
        // ====================================================================
        // Like setting up your music studio - we prepare all the tools
        // and set a default chord so artists see something immediately.

        _initialize() {
            this._initChordData();    // Load all our chord knowledge
            this._renderUI();         // Draw the interface on the screen
            this._attachUIHandlers(); // Make buttons and dropdowns work
            this._setDefaultChord();  // Start with D minor (a friendly chord!)
        }

        // ====================================================================
        // 🎵 SETTING THE DEFAULT CHORD - D Minor
        // ====================================================================
        // Artists shouldn't see an empty interface! We start with D minor
        // because it's a beautiful, melancholy chord that sounds great.
        // D minor = D, F, A (the notes that make up this chord)

        _setDefaultChord() {
            // Find the dropdown menus on the page
            const rootSelect = this.mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this.mount?.querySelector("#chordonika-quality-select");

            // Set them to D minor (like pre-selecting on a form)
            if (rootSelect) rootSelect.value = "D";      // Root note: D
            if (qualitySelect) qualitySelect.value = "minor"; // Quality: minor

            // Now calculate and show this chord
            this._handleChordChange();
        }

        // ====================================================================
        // 🎼 CHORD DATA - Our Musical Knowledge Base
        // ====================================================================
        // This is like a music theory textbook built into code.
        // We define all the notes, chords, and the mathematical relationships
        // between them (called intervals).

        _initChordData() {
            this.chordData = {

                // 🎹 THE 12 NOTES: The building blocks of Western music
                // These repeat every octave (like the white and black keys on a piano)
                noteNames: ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],

                // 🎵 ROOT NOTES: What note the chord is "built on"
                // Each has a value (for code) and label (for humans)
                rootNotes: [
                    { value: "C",  label: "C"      },    // C natural
                    { value: "C#", label: "C#/Db"  },    // C sharp / D flat (same note!)
                    { value: "D",  label: "D"      },    // D natural
                    { value: "D#", label: "D#/Eb"  },    // D sharp / E flat
                    { value: "E",  label: "E"      },    // E natural
                    { value: "F",  label: "F"      },    // F natural
                    { value: "F#", label: "F#/Gb"  },    // F sharp / G flat
                    { value: "G",  label: "G"      },    // G natural
                    { value: "G#", label: "G#/Ab"  },    // G sharp / A flat
                    { value: "A",  label: "A"      },    // A natural (440Hz standard)
                    { value: "A#", label: "A#/Bb"  },    // A sharp / B flat
                    { value: "B",  label: "B"      }     // B natural
                ],

                // 🎼 CHORD QUALITIES: The "flavor" or "mood" of chords
                // Each chord type has specific intervals (distances between notes)
                chordQualities: {

                    // 😊 MAJOR: Happy, bright, uplifting (like C-E-G)
                    "major": {
                        intervals: [0, 4, 7],    // Root, Major 3rd, Perfect 5th
                        label: "Major",          // What users see
                        symbol: "",              // No symbol (C major = just "C")
                        priority: 1              // Show this first in lists
                    },

                    // 😢 MINOR: Sad, melancholy, emotional (like C-Eb-G)
                    "minor": {
                        intervals: [0, 3, 7],    // Root, Minor 3rd, Perfect 5th
                        label: "Minor",          // What users see
                        symbol: "m",             // C minor = "Cm"
                        priority: 2              // Show this second
                    },

                    // 😰 DIMINISHED: Tense, unstable, wants to resolve
                    "diminished": {
                        intervals: [0, 3, 6],    // Root, Minor 3rd, Diminished 5th
                        label: "Diminished",     // What users see
                        symbol: "°",             // C diminished = "C°"
                        priority: 3              // Less common, show later
                    },

                    // 🔥 AUGMENTED: Dreamy, floating, mysterious
                    "augmented": {
                        intervals: [0, 4, 8],    // Root, Major 3rd, Augmented 5th
                        label: "Augmented",      // What users see
                        symbol: "+",             // C augmented = "C+"
                        priority: 4              // Even less common
                    },

                    // ✨ MAJOR 7TH: Jazzy, sophisticated, smooth
                    "major7": {
                        intervals: [0, 4, 7, 11], // Major triad and Major 7th
                        label: "Major 7th",       // What users see
                        symbol: "maj7",           // C major 7 = "Cmaj7"
                        priority: 5               // Advanced harmony
                    },

                    // 🌙 MINOR 7TH: Mellow, contemplative, jazzy
                    "minor7": {
                        intervals: [0, 3, 7, 10], // Minor triad and Minor 7th
                        label: "Minor 7th",       // What users see
                        symbol: "m7",             // C minor 7 = "Cm7"
                        priority: 6               // Advanced harmony
                    },

                    // 🎺 DOMINANT 7TH: Bluesy, wants to resolve, powerful
                    "dominant7": {
                        intervals: [0, 4, 7, 10], // Major triad and Minor 7th
                        label: "Dominant 7th",    // What users see
                        symbol: "7",              // C dominant 7 = "C7"
                        priority: 7               // Very common in blues/jazz
                    }
                }
            };
        }

        // ====================================================================
        // 🧮 CHORD CALCULATION - The Musical Math
        // ====================================================================
        // This is where we take a root note (like "C") and a quality (like "major")
        // and figure out what notes make up that chord. It's like having a
        // music theory calculator built into the code!

        _calculateChord(rootNote, quality) {
            try {
                // 🔍 STEP 1: Look up the chord quality (major, minor, etc.)
                const chordQuality = this.chordData.chordQualities[quality];
                if (!chordQuality) return null; // Unknown chord type

                // 🔍 STEP 2: Find where the root note sits in our 12-note system
                const rootIndex = this.chordData.noteNames.indexOf(rootNote);
                if (rootIndex === -1) return null; // Unknown note

                // 🎵 STEP 3: Calculate each chord note using intervals
                // Intervals are like "steps" up from the root note
                // For C major: C(0) + 4 steps = E, C(0) + 7 steps = G
                const notes = chordQuality.intervals.map(interval => {
                    const noteIndex = (rootIndex + interval) % 12; // Wrap around after 12
                    return this.chordData.noteNames[noteIndex];
                });

                // 🏷️ STEP 4: Create the chord symbol (like "Cm7" or "F#°")
                const symbol = rootNote + chordQuality.symbol;

                // 📦 STEP 5: Package everything together
                this.currentChord = {
                    root: rootNote,              // The root note (C, D, E, etc.)
                    quality: quality,            // The chord type (major, minor, etc.)
                    symbol: symbol,              // The chord name (Cm, F#°, etc.)
                    notes: notes,                // The actual notes [C, E, G]
                    intervals: chordQuality.intervals // The math behind it
                };

                return this.currentChord;

            } catch (error) {
                console.error('Error calculating chord:', error);
                return null;
            }
        }

        // ====================================================================
        // 🎛️ HANDLING CHORD CHANGES - When Artists Select Different Chords
        // ====================================================================
        // This runs every time someone picks a different root note or chord quality.
        // It's like the "brain" that coordinates everything when changes happen.

        _handleChordChange() {
            try {
                // 🔍 STEP 1: See what the user has selected
                const rootSelect = this.mount?.querySelector("#chordonika-root-select");
                const qualitySelect = this.mount?.querySelector("#chordonika-quality-select");
                const rootNote = rootSelect?.value;    // What root note? (C, D, E...)
                const quality = qualitySelect?.value;  // What quality? (major, minor...)

                // 🎵 STEP 2: If both are selected, calculate and show the chord
                if (rootNote && quality && rootNote !== "" && quality !== "") {
                    const chord = this._calculateChord(rootNote, quality);
                    if (chord && chord.notes && Array.isArray(chord.notes)) {
                        this._updateChordDisplay(chord);    // Show chord name and notes
                        this._highlightChordNotes(chord);   // Light up piano keys
                        this.emit("ui:chordselected", chord); // Tell other modules
                        return; // Success! We're done.
                    }
                }

                // 🧹 STEP 3: If we get here, something's not selected - clear everything
                this.currentChord = null;
                this._updateChordDisplay(null);
                this._clearHighlights();
                this.emit("ui:chordselected", null); // Tell others "no chord"

            } catch (error) {
                console.error('Error handling chord change:', error);
                // If anything goes wrong, clear everything safely
                this.currentChord = null;
                this._updateChordDisplay(null);
                this._clearHighlights();
                this.emit("ui:chordselected", null);
            }
        }

        // ====================================================================
        // 🧹 CLEARING SELECTION - The "Reset" Button
        // ====================================================================
        // When artists click "Clear", we reset everything back to empty.
        // It's like erasing a whiteboard to start fresh.

        _clearSelection() {
            try {
                // Reset both dropdown menus to empty
                const rootSelect = this.mount?.querySelector("#chordonika-root-select");
                const qualitySelect = this.mount?.querySelector("#chordonika-quality-select");
                if (rootSelect) rootSelect.value = "";
                if (qualitySelect) qualitySelect.value = "";

                // Clear our internal state
                this.currentChord = null;

                // Clear the visual display
                this._updateChordDisplay(null);    // Remove chord name/notes
                this._clearHighlights();           // Turn off piano key lights

                // Tell other modules we cleared everything
                this.emit("ui:chordselected", null);

            } catch (error) {
                console.error('Error clearing selection:', error);
            }
        }

        // ====================================================================
        // 🎨 RENDERING THE USER INTERFACE - Drawing Everything On Screen
        // ====================================================================
        // This creates all the visual elements: dropdowns, buttons, piano keyboard.
        // Think of it like setting up a physical music workstation.

        _renderUI() {
            // 🏠 STEP 1: Make sure we have a place to put our interface
            if (!this.mount) {
                // Create a new container if none provided
                this.mount = document.createElement("div");
                this.mount.className = `tonika-module chordonika chordonika--${this.settings.mode}`;
                document.body.appendChild(this.mount);
            } else {
                // Use the provided container and add our styling classes
                this.mount.classList.add("tonika-module", "chordonika", `chordonika--${this.settings.mode}`);
            }

            // 🎨 STEP 2: Generate all the HTML and put it in our container
            this.mount.innerHTML = this._generateHTML();

            // 🎛️ STEP 3: Fill the dropdown menus with options
            this._populateDropdowns();
        }

        // ====================================================================
        // 📝 GENERATING HTML - The Visual Structure
        // ====================================================================
        // This creates the actual webpage elements that artists see and interact with.
        // It's like designing the layout of a physical control panel.

        _generateHTML() {
            return `
                <!-- 🎵 HEADER: Title and clear button -->
                <div class="chordonika__header">
                    <h3 class="chordonika__title">Chord Selector</h3>
                    <button class="chordonika__clear-btn tonika-btn tonika-btn--secondary" title="Clear selection">
                        Clear
                    </button>
                </div>
                
                <!-- 🎛️ CONTROLS: The dropdown menus for selecting chords -->
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
                
                <!-- 📊 DISPLAY: Shows the current chord name and notes -->
                <div class="chordonika__display">
                    <div class="chordonika__chord-info">
                        <div class="chordonika__chord-symbol">— No chord selected.</div>
                        <div class="chordonika__chord-notes"></div>
                    </div>
                </div>
                
                <!-- 🎹 KEYBOARD: Visual piano that lights up chord notes -->
                <div class="chordonika__keyboard">
                    ${this._generateKeyboardHTML()}
                </div>
            `;
        }

        // ====================================================================
        // 🎹 GENERATING THE PIANO KEYBOARD - Creating Virtual Piano Keys
        // ====================================================================
        // This creates a visual piano keyboard with both white and black keys.
        // Each key knows what note it represents and can light up when needed.

        _generateKeyboardHTML() {
            const keys = [];

            // 🎹 WHITE KEYS: The natural notes (C, D, E, F, G, A, B)
            // We create 2 octaves worth for a good range
            const whiteKeys = [
                { note: "C", octave: 3, position: "c3" },   // Low C
                { note: "D", octave: 3, position: "d3" },   // D above C
                { note: "E", octave: 3, position: "e3" },   // E above D
                { note: "F", octave: 3, position: "f3" },   // F above E
                { note: "G", octave: 3, position: "g3" },   // G above F
                { note: "A", octave: 3, position: "a3" },   // A above G
                { note: "B", octave: 3, position: "b3" },   // B above A
                { note: "C", octave: 4, position: "c4" },   // Higher C (next octave)
                { note: "D", octave: 4, position: "d4" },   // Higher D
                { note: "E", octave: 4, position: "e4" },   // Higher E
                { note: "F", octave: 4, position: "f4" },   // Higher F
                { note: "G", octave: 4, position: "g4" },   // Higher G
                { note: "A", octave: 4, position: "a4" },   // Higher A
                { note: "B", octave: 4, position: "b4" }    // Higher B
            ];

            // ⚫ BLACK KEYS: The sharp/flat notes (C#, D#, F#, G#, A#)
            // These sit "between" the white keys, just like on a real piano
            const blackKeys = [
                { note: "C#", octave: 3, position: "cs3" }, // C sharp (between C and D)
                { note: "D#", octave: 3, position: "ds3" }, // D sharp (between D and E)
                { note: "F#", octave: 3, position: "fs3" }, // F sharp (between F and G)
                { note: "G#", octave: 3, position: "gs3" }, // G sharp (between G and A)
                { note: "A#", octave: 3, position: "as3" }, // A sharp (between A and B)
                { note: "C#", octave: 4, position: "cs4" }, // Higher C sharp
                { note: "D#", octave: 4, position: "ds4" }, // Higher D sharp
                { note: "F#", octave: 4, position: "fs4" }, // Higher F sharp
                { note: "G#", octave: 4, position: "gs4" }, // Higher G sharp
                { note: "A#", octave: 4, position: "as4" }  // Higher A sharp
            ];

            // 🎨 CREATE WHITE KEY HTML
            // Each key is a clickable element that knows what note it represents
            whiteKeys.forEach(key => {
                keys.push(`
                    <div class="chordonika__key chordonika__key--white chordonika__position--${key.position}" 
                         data-note="${key.note}" data-octave="${key.octave}">
                        <span class="chordonika__note-label">${key.note}</span>
                    </div>
                `);
            });

            // ⚫ CREATE BLACK KEY HTML
            // Black keys are smaller and positioned "on top" of white keys
            blackKeys.forEach(key => {
                keys.push(`
                    <div class="chordonika__key chordonika__key--black chordonika__position--${key.position}" 
                         data-note="${key.note}" data-octave="${key.octave}">
                        <span class="chordonika__note-label">${key.note}</span>
                    </div>
                `);
            });

            // 🔗 JOIN ALL KEYS: Combine all the HTML into one string
            return keys.join("");
        }

        // ====================================================================
        // 📋 POPULATING DROPDOWNS - Filling the Selection Menus
        // ====================================================================
        // This takes our chord data and creates the options that artists can choose from.
        // It's like writing out all the available choices on a menu.

        _populateDropdowns() {
            // 🔍 Find the dropdown elements on the page
            const rootSelect = this.mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this.mount?.querySelector("#chordonika-quality-select");

            // 🎵 FILL ROOT NOTE DROPDOWN
            // Add each note (C, C#, D, etc.) as an option
            if (rootSelect) {
                this.chordData.rootNotes.forEach(root => {
                    const option = document.createElement("option");
                    option.value = root.value;        // What the code sees (C, D, E)
                    option.textContent = root.label;  // What artists see (C, C#/Db, D)
                    rootSelect.appendChild(option);
                });
            }

            // 🎼 FILL CHORD QUALITY DROPDOWN
            // Add each chord type (major, minor, etc.) in order of importance
            if (qualitySelect) {
                // Sort by priority (basic chords first, advanced chords later)
                const sorted = Object.entries(this.chordData.chordQualities)
                    .sort(([,a],[,b]) => a.priority - b.priority);

                sorted.forEach(([key, quality]) => {
                    const option = document.createElement("option");
                    option.value = key;              // What the code sees (major, minor)
                    option.textContent = quality.label; // What artists see (Major, Minor)
                    qualitySelect.appendChild(option);
                });
            }
        }

        // ====================================================================
        // 🔗 ATTACHING EVENT HANDLERS - Making Things Interactive
        // ====================================================================
        // This connects our interface elements to functions that run when
        // artists interact with them. It's like wiring up a control panel.

        _attachUIHandlers() {
            if (!this.mount) return; // Safety check

            // 🔍 Find all the interactive elements
            const rootSelect = this.mount.querySelector("#chordonika-root-select");
            const qualitySelect = this.mount.querySelector("#chordonika-quality-select");
            const clearBtn = this.mount.querySelector(".chordonika__clear-btn");

            // 🎛️ WIRE UP THE CONTROLS
            // When dropdowns change, recalculate the chord
            rootSelect?.addEventListener("change", () => this._handleChordChange());
            qualitySelect?.addEventListener("change", () => this._handleChordChange());

            // When the clear button is clicked, reset everything
            clearBtn?.addEventListener("click", () => this._clearSelection());
        }

        // ====================================================================
        // 📊 UPDATING THE CHORD DISPLAY - Showing Chord Info to Artists
        // ====================================================================
        // This updates the text that shows the chord name and notes.
        // It's like updating a digital display on a music device.

        _updateChordDisplay(chord) {
            try {
                // 🔍 Find the display elements on the page
                const symbolEl = this.mount?.querySelector(".chordonika__chord-symbol");
                const notesEl = this.mount?.querySelector(".chordonika__chord-notes");

                // 🏷️ UPDATE CHORD SYMBOL (like "Cm7" or "F#°")
                if (symbolEl) {
                    symbolEl.textContent = chord ? chord.symbol : "— No chord selected.";
                }

                // 🎵 UPDATE CHORD NOTES (like "C - E - G")
                if (notesEl) {
                    if (chord && chord.notes && Array.isArray(chord.notes) && chord.notes.length > 0) {
                        // Join notes with dashes: ["C", "E", "G"] becomes "C - E - G"
                        notesEl.textContent = chord.notes.join(" - ");
                    } else {
                        notesEl.textContent = ""; // Clear if no chord
                    }
                }

            } catch (error) {
                console.error('Error updating chord display:', error);
            }
        }

        // ====================================================================
        // 💡 HIGHLIGHTING CHORD NOTES - Lighting Up the Piano Keys
        // ====================================================================
        // This is the visual magic! When a chord is selected, we light up
        // the corresponding piano keys. Each note lights up only once,
        // starting from the lowest available key.

        _highlightChordNotes(chord) {
            try {
                // 🛡️ SAFETY CHECK: Make sure we have a valid chord
                if (!chord || !chord.notes || !Array.isArray(chord.notes)) return;

                // 🧹 STEP 1: Clear any existing highlights
                this._clearHighlights();

                // 🔍 STEP 2: Find all available piano keys on the keyboard
                const availableKeys = [];
                const allKeys = this.mount?.querySelectorAll('[data-note]');
                allKeys?.forEach(key => {
                    const note = key.getAttribute('data-note');      // What note? (C, D#, etc.)
                    const octave = parseInt(key.getAttribute('data-octave')); // What octave? (3, 4)
                    availableKeys.push({ note, octave, element: key });
                });

                // 📊 STEP 3: Sort keys by position (lowest to highest)
                // This ensures we always light up the leftmost occurrence of each note
                availableKeys.sort((a, b) => {
                    if (a.octave !== b.octave) return a.octave - b.octave; // Lower octaves first
                    // Within the same octave, sort by note position in a chromatic scale
                    const noteOrder = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
                    return noteOrder.indexOf(a.note) - noteOrder.indexOf(b.note);
                });

                // 💡 STEP 4: Light up each chord note (only the first occurrence)
                chord.notes.forEach(chordNote => {
                    // Find the FIRST (lowest/leftmost) key for this note
                    const firstKey = availableKeys.find(key => key.note === chordNote);
                    if (firstKey) {
                        // Add the "active" class to make it light up blue
                        firstKey.element.classList.add("chordonika__key--active");
                    }
                });

            } catch (error) {
                console.error('Error highlighting chord notes:', error);
            }
        }

        // ====================================================================
        // 🧹 CLEARING HIGHLIGHTS - Turning Off All Piano Key Lights
        // ====================================================================
        // This turns off all the blue highlighting on piano keys.
        // It's like turning off all the lights before setting new ones.

        _clearHighlights() {
            try {
                // Find all currently highlighted keys
                const highlightedKeys = this.mount?.querySelectorAll(".chordonika__key--active");

                // Remove the highlight class from each one
                highlightedKeys?.forEach(key => {
                    key.classList.remove("chordonika__key--active");
                });

            } catch (error) {
                console.error('Error clearing highlights:', error);
            }
        }

        // ====================================================================
        // 🎛️ PUBLIC API METHODS - Functions Other Modules Can Use
        // ====================================================================
        // These are like "remote control" functions that other parts of the
        // Tonika system can use to control this chord selector programmatically.

        // 🎵 SELECT A SPECIFIC CHORD
        // Other modules can call this to automatically select a chord
        // Example: chordSelector.selectChord("C", "major") sets it to C major
        selectChord(rootNote, quality) {
            try {
                const rootSelect = this.mount?.querySelector("#chordonika-root-select");
                const qualitySelect = this.mount?.querySelector("#chordonika-quality-select");

                // Set the dropdown values
                if (rootSelect) rootSelect.value = rootNote;
                if (qualitySelect) qualitySelect.value = quality;

                // Trigger the chord calculation and display
                this._handleChordChange();

            } catch (error) {
                console.error('Error in selectChord:', error);
            }
        }

        // 🧹 CLEAR THE SELECTION
        // Other modules can call this to clear the chord selector
        clearSelection() {
            this._clearSelection();
        }

        // 📋 GET AVAILABLE CHORD DATA
        // Other modules can ask, "what chords are available?"
        getChordData() {
            return {
                rootNotes: this.chordData.rootNotes.map(r => r.value),
                chordQualities: Object.keys(this.chordData.chordQualities)
            };
        }

        // 💡 HIGHLIGHT SPECIFIC NOTES
        // Other modules can light up specific notes on the keyboard
        // Example: chordSelector.highlightNotes(["C", "E", "G"]) lights up C major
        highlightNotes(notes) {
            try {
                this._clearHighlights(); // Clear existing highlights first

                if (Array.isArray(notes)) {
                    // Use the same single-occurrence logic as chord highlighting
                    const availableKeys = [];
                    const allKeys = this.mount?.querySelectorAll('[data-note]');
                    allKeys?.forEach(key => {
                        const note = key.getAttribute('data-note');
                        const octave = parseInt(key.getAttribute('data-octave'));
                        availableKeys.push({ note, octave, element: key });
                    });

                    // Sort by position (lowest first)
                    availableKeys.sort((a, b) => {
                        if (a.octave !== b.octave) return a.octave - b.octave;
                        const noteOrder = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
                        return noteOrder.indexOf(a.note) - noteOrder.indexOf(b.note);
                    });

                    // Light up each note (first occurrence only)
                    notes.forEach(note => {
                        const firstKey = availableKeys.find(key => key.note === note);
                        if (firstKey) {
                            firstKey.element.classList.add("chordonika__key--active");
                        }
                    });
                }

            } catch (error) {
                console.error('Error in highlightNotes:', error);
            }
        }

        // ====================================================================
        // 📊 STATUS REPORTING - Telling Other Modules About Our Capabilities
        // ====================================================================
        // This provides detailed information about what this module can do.
        // It's like a "spec sheet" that other modules can read.

        getStatus() {
            return {
                ...super.getStatus(), // Include basic module info

                // 🎛️ API INFORMATION: What functions are available?
                api: {
                    methods: ['selectChord', 'clearSelection', 'getChordData', 'highlightNotes'],
                    events: {
                        emits: ['ui:chordselected', 'app:status'],    // What events we send
                        listens: ['midi:noteon', 'midi:noteoff', 'ui:keypress'] // What we listen for
                    }
                },

                // 🎵 CURRENT STATE: What's happening right now?
                state: {
                    ...super.getStatus().state,
                    currentChord: this.currentChord,  // What chord is selected?
                    isActive: this.isActive           // Is the module working?
                },

                // 🎼 CAPABILITIES: What can this module do?
                capabilities: {
                    chordTypes: Object.keys(this.chordData?.chordQualities || {}),
                    rootNotes: this.chordData?.rootNotes?.map(n => n.value) || [],
                    supportsKeyboardHighlighting: true,    // Can light up piano keys
                    supportsProgrammaticSelection: true    // Can be controlled by code
                }
            };
        }

        // ====================================================================
        // 🔧 INTERNAL HELPER METHODS - For the Module System
        // ====================================================================
        // These help the Tonika module system understand what this module does.

        _getPublicMethods() {
            return ['selectChord', 'clearSelection', 'getChordData', 'highlightNotes', 'getStatus', 'destroy'];
        }

        _getEmittedEvents() {
            return ['ui:chordselected', 'app:status', 'system:module:registered'];
        }

        _getListenedEvents() {
            return ['midi:noteon', 'midi:noteoff', 'ui:keypress'];
        }
    }

    // ========================================================================
    // 🌍 GLOBAL REGISTRATION - Making Chordonika Available Everywhere
    // ========================================================================
    // This makes the Chordonika class available to other parts of the system.
    // It's like publishing a book so others can read it.

    window.Chordonika = Chordonika;

})();

// ============================================================================
// 🎓 LEARNING RESOURCES FOR ARTISTS
// ============================================================================
//
// 🎵 MUSIC THEORY CONCEPTS USED HERE:
// - Intervals: Mathematical distances between notes (measured in semitones)
// - Chromatic Scale: All 12 notes in Western music (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
// - Octaves: The same note at different pitch levels (C3 is lower than C4)
// - Chord Construction: Building chords using specific interval patterns
// - Enharmonic Equivalents: Same note with different names (C# = Db)
//
// 💻 PROGRAMMING CONCEPTS EXPLAINED:
// - Classes: Blueprints for creating objects (like a template for making chord selectors)
// - Methods: Functions that belong to a class (like actions the chord selector can perform)
// - Events: Messages sent when things happen (like "a chord was selected")
// - DOM: The webpage structure that JavaScript can modify
// - Arrays: Lists of things (like lists of notes or chord qualities)
// - Objects: Containers that hold related information (like chord data)
//
// 🔗 HOW THIS CONNECTS TO OTHER MODULES:
// - Sends 'ui:chordselected' events when chords change
// - Can receive MIDI events from piano modules
// - Provides chord data to other modules that need it
// - Integrates with the overall Tonika event system
//
// 🎯 FOR ARTISTS LEARNING TO CODE:
// - Start by understanding the musical concepts first
// - Each function has a clear, single purpose
// - Comments explain both the "what" and the "why"
// - The code structure mirrors musical thinking
// - Events allow modules to "talk" to each other
//
// ============================================================================

