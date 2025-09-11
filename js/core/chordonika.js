/**
 * Chordonika Module — Interactive Chord Selection and Keyboard Visualization
 * v1.1.0 — Added EventTarget emitter and unified event taxonomy
 *
 * This module creates a visual chord selector with an interactive piano keyboard.
 * Users can select root notes and chord qualities from dropdowns, and the
 * corresponding chord notes are highlighted on the keyboard display.
 *
 * Key Features:
 * - Interactive chord selection via dropdowns
 * - Visual piano keyboard with chord highlighting
 * - Event system for chord selection notifications
 * - Support for major, minor, diminished, augmented, and 7th chords
 * - Automatic optimal octave calculation for chord display
 */

// IIFE (Immediately Invoked Function Expression) to avoid polluting the global scope
(() => {
    /**
     * Chordonika Class - Main module class for chord visualization
     *
     * This class handles:
     * 1. Chord data management (notes, intervals, chord types)
     * 2. UI rendering (dropdowns, keyboard, chord info)
     * 3. User interactions (chord selection, clearing)
     * 4. Visual feedback (highlighting keyboard keys)
     * 5. Event emission for external communication
     */
    class Chordonika extends Tonika.TonikaEmitter {
        /**
         * Constructor - Initialize the Chordonika module
         * @param {Object} opts - Configuration options
         * @param {string} opts.mode - Display mode: "card" or "floating"
         * @param {Function} opts.onChordSelected - Callback when chord is selected
         * @param {string|HTMLElement} opts.mount - DOM selector or element to mount to
         */
        constructor(opts = {}) {
            super();

            // Store configuration settings with default fallbacks
            // The ?? operator provides null/undefined coalescing (safer than ||)
            this.settings = {
                mode: opts.mode ?? "card", // Visual display mode
                onChordSelected: opts.onChordSelected ?? null, // Legacy callback support
                deferInit: opts.deferInit ?? false, // Allow deferred initialization
            };

            // Handle mount target - can be CSS selector string or DOM element
            // This flexibility allows mounting to existing elements or auto-creation
            this._mount =
                typeof opts.mount === "string"
                    ? document.querySelector(opts.mount) // Find element by selector
                    : opts.mount; // Use provided DOM element directly

            // Initialize immediately unless deferred initialization is requested
            if (!this.settings.deferInit) {
                this._initialize();
            }
        }

        /**
         * Initialize the module - can be called manually if deferInit was true
         */
        _initialize() {
            // Create an internal event system using modern EventTarget API
            // This allows multiple listeners and follows web standards
            this.emit("app:status", { state: "initializing" });

            // Initialize the module in a proper sequence
            this._initChordData();    // Set up musical data (notes, chords, intervals)
            this._renderUI();         // Create and insert DOM elements
            this._attachUIHandlers();
            this.emit("app:status", { state: "ready" });
        }

        /**
         * Initialize chord and musical data structures
         * This method sets up all the musical theory data needed for chord calculations:
         * - Note names in chromatic order
         * - Root note options with enharmonic equivalents (C#/Db)
         * - Chord quality definitions with intervals and display information
         */
        _initChordData() {
            this.chordData = {
                // Chromatic scale - all 12 notes in semitone sequence
                // Used as reference for interval calculations
                noteNames: ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],

                // Root note options for dropdown - includes enharmonic spellings
                // (e.g., C# and Db are the same note but spelled differently)
                rootNotes: [
                    { value: "C",  label: "C"      },     // Natural notes
                    { value: "C#", label: "C#/Db"  },     // Sharp/flat equivalents
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

                // Chord quality definitions - the heart of the musical logic
                // Each chord type has:
                // - name: internal identifier
                // - label: user-friendly display name
                // - symbol: musical notation symbol (added to root note)
                // - intervals: semitone distances from root note
                // - priority: display order in dropdown (1=basic, 2=intermediate, 3=advanced)
                chordQualities: {
                    // Basic triads (3 notes) - Priority 1
                    major:      { name:"major", label:"Major", symbol:"",   intervals:[0,4,7], priority:1 },       // Root, Major 3rd, Perfect 5th
                    minor:      { name:"minor", label:"Minor", symbol:"m",  intervals:[0,3,7], priority:1 },       // Root, Minor 3rd, Perfect 5th
                    diminished: { name:"diminished", label:"Diminished", symbol:"°", intervals:[0,3,6], priority:1 }, // Root, Minor 3rd, Diminished 5th

                    // Extended and altered chords - Priority 2
                    augmented:  { name:"augmented", label:"Augmented", symbol:"+", intervals:[0,4,8], priority:2 },     // Root, Major 3rd, Augmented 5th
                    major7:     { name:"major7", label:"Major 7th", symbol:"maj7", intervals:[0,4,7,11], priority:2 },  // Major triad and Major 7th
                    minor7:     { name:"minor7", label:"Minor 7th", symbol:"m7", intervals:[0,3,7,10], priority:2 },    // Minor triad and Minor 7th
                    dominant7:  { name:"dominant7", label:"Dominant 7th", symbol:"7", intervals:[0,4,7,10], priority:2 }, // Major triad and Minor 7th
                    sus2:       { name:"sus2", label:"Suspended 2nd", symbol:"sus2", intervals:[0,2,7], priority:2 },   // Root, Major 2nd, Perfect 5th
                    sus4:       { name:"sus4", label:"Suspended 4th", symbol:"sus4", intervals:[0,5,7], priority:2 },   // Root, Perfect 4th, Perfect 5th

                    // Advanced/Jazz chords - Priority 3
                    diminished7:{ name:"diminished7", label:"Diminished 7th", symbol:"°7", intervals:[0,3,6,9], priority:3 },     // Diminished + Diminished 7th
                    halfDiminished7:{ name:"halfDiminished7", label:"Half Diminished 7th", symbol:"ø7", intervals:[0,3,6,10], priority:3 }, // Diminished + Minor 7th
                }
            };
        }

        /**
         * Calculate chord notes from root note and quality
         * This is the core musical logic that converts music theory into actual notes
         *
         * @param {string} rootNote - The root note (e.g., "C", "F#")
         * @param {string} qualityName - The chord quality key (e.g., "major", "minor7")
         * @returns {Object|null} Chord object with symbol, notes, and intervals
         */
        _calculateChord(rootNote, qualityName) {
            // Validation - ensure we have both required parameters
            if (!rootNote || !qualityName) return null;

            // Look up the chord quality definition
            const quality = this.chordData.chordQualities[qualityName];
            if (!quality) return null;

            // Find the root note's position in the chromatic scale (0-11)
            const rootIndex = this.chordData.noteNames.indexOf(rootNote);
            if (rootIndex === -1) return null;

            // Calculate actual note names by adding intervals to the root position
            // The modulo (%) ensures we wrap around the 12-note chromatic cycle
            const notes = quality.intervals.map(interval => {
                const noteIndex = (rootIndex + interval) % 12; // Wrap around octave
                return this.chordData.noteNames[noteIndex];
            });

            // Create chord symbol by combining root note with quality symbol
            const symbol = rootNote + quality.symbol; // e.g., "C" + "m7" = "Cm7"

            // Return complete chord information
            return {
                root: rootNote,
                quality: qualityName,
                symbol,
                notes,
                intervals: quality.intervals
            };
        }

        /**
         * Find optimal octave placement for chord notes on the keyboard
         * This ensures chords are displayed in a comfortable range that fits
         * within the keyboard's visual boundaries
         *
         * @param {string[]} notes - Array of note names (e.g., ["C", "E", "G"])
         * @returns {number[]} Array of MIDI note numbers for optimal octave
         */
        _findOptimalOctave(notes) {
            const baseOctave = 3; // Start checking from octave 3
            const keyboardRange = { min: 36, max: 71 }; // MIDI range of our visual keyboard

            // Try octaves 3 and 4 to find the best fit
            for (let octave = baseOctave; octave <= 4; octave++) {
                // Convert note names to MIDI numbers for this octave
                const midiNotes = notes.map(note => {
                    const noteIndex = this.chordData.noteNames.indexOf(note);
                    // MIDI calculation: (octave * 12) + noteIndex + 12
                    // The +12 accounts for MIDI note 0 being C-1, not C0
                    return (octave * 12) + noteIndex + 12;
                });

                // Check if all notes fit within the keyboard range
                if (midiNotes.every(midi => midi >= keyboardRange.min && midi <= keyboardRange.max)) {
                    return midiNotes; // Found optimal octave
                }
            }

            // Fallback to octave 3 if no perfect fit found
            return notes.map(note => {
                const noteIndex = this.chordData.noteNames.indexOf(note);
                return (3 * 12) + noteIndex + 12;
            });
        }

        /**
         * Create keyboard HTML structure
         * Returns the complete keyboard as an HTML string for insertion into DOM
         * @returns {string} HTML string containing keyboard structure
         */
        _createKeyboard() {
            return `
            <div class="chordonika__keyboard">
              <div class="chordonika__keys">
                ${this._generateKeyHTML()} <!-- Insert dynamically generated key elements -->
              </div>
            </div>`;
        }

        /**
         * Generate HTML for individual piano keys
         * Creates both white and black keys with proper positioning and data attributes
         * The layout represents 2 octaves (C3-B4) for chord visualization
         * @returns {string} HTML string for all keyboard keys
         */
        _generateKeyHTML() {
            // Define the complete key layout with positioning information
            // White keys are listed first, then black keys (for proper CSS layering)
            const keyLayout = [
                // White keys - Octave 3
                { note:'C',octave:3,type:'white',position:'c3' },
                { note:'D',octave:3,type:'white',position:'d3' },
                { note:'E',octave:3,type:'white',position:'e3' },
                { note:'F',octave:3,type:'white',position:'f3' },
                { note:'G',octave:3,type:'white',position:'g3' },
                { note:'A',octave:3,type:'white',position:'a3' },
                { note:'B',octave:3,type:'white',position:'b3' },
                // White keys - Octave 4
                { note:'C',octave:4,type:'white',position:'c4' },
                { note:'D',octave:4,type:'white',position:'d4' },
                { note:'E',octave:4,type:'white',position:'e4' },
                { note:'F',octave:4,type:'white',position:'f4' },
                { note:'G',octave:4,type:'white',position:'g4' },
                { note:'A',octave:4,type:'white',position:'a4' },
                { note:'B',octave:4,type:'white',position:'b4' },
                // Black keys - Octave 3 (positioned between white keys)
                { note:'C#',octave:3,type:'black',position:'cs3' },
                { note:'D#',octave:3,type:'black',position:'ds3' },
                { note:'F#',octave:3,type:'black',position:'fs3' },
                { note:'G#',octave:3,type:'black',position:'gs3' },
                { note:'A#',octave:3,type:'black',position:'as3' },
                // Black keys - Octave 4
                { note:'C#',octave:4,type:'black',position:'cs4' },
                { note:'D#',octave:4,type:'black',position:'ds4' },
                { note:'F#',octave:4,type:'black',position:'fs4' },
                { note:'G#',octave:4,type:'black',position:'gs4' },
                { note:'A#',octave:4,type:'black',position:'as4' },
            ];

            // Convert each key definition into HTML
            return keyLayout.map(key => {
                // Convert # symbol to musical sharp symbol (♯) for display
                const noteLabel = key.note.replace('#','♯');

                // Generate HTML for this key with:
                // - CSS classes for styling (type and position)
                // - data attributes for JavaScript targeting
                // - note label for user reference
                return `
              <div class="chordonika__key chordonika__key--${key.type} chordonika__position--${key.position}"
                   data-note="${key.note}" data-octave="${key.octave}">
                <div class="chordonika__note-label">${noteLabel}</div>
              </div>`;
            }).join(''); // Combine all key HTML into a single string
        }

        /**
         * Highlight chord notes on the keyboard
         * This provides visual feedback by adding active classes to keys that are part of the current chord
         *
         * @param {Object} chord - Chord object with notes array
         */
        _highlightChordNotes(chord) {
            // Always clear previous highlights first
            this._clearHighlights();
            if (!chord) return; // No chord to highlight

            // Get MIDI note numbers in optimal octave for this chord
            const midiNotes = this._findOptimalOctave(chord.notes);

            // Highlight each note in the chord
            midiNotes.forEach(midiNote => {
                // Convert MIDI number back to octave and note name
                // Math.floor handles the integer division for octave calculation
                const octave = Math.floor((midiNote - 12) / 12);
                const noteIndex = (midiNote - 12) % 12; // Get a note within octave
                const noteName = this.chordData.noteNames[noteIndex];

                // Find the corresponding key element using data attributes
                const keyElement = this._mount?.querySelector(`[data-note="${noteName}"][data-octave="${octave}"]`);

                // Add active class for visual highlighting
                if (keyElement) keyElement.classList.add("chordonika__key--active");
            });
        }

        /**
         * Clear all keyboard highlighting
         * Removes active classes from all keys to reset the visual state
         */
        _clearHighlights() {
            // Use optional chaining (?.) to safely handle null _mount
            // querySelectorAll returns NodeList, forEach applies to each element
            this._mount?.querySelectorAll(".chordonika__key--active")
                ?.forEach(key => key.classList.remove("chordonika__key--active"));
        }

        /**
         * Render the complete user interface
         * This method handles both initial creation and mounting to existing elements
         * It sets up the DOM structure and populates interactive elements
         */
        _renderUI() {
            // Check if we need to create a new container element
            if (!this._mount) {
                // Create a new container when no mount point provided
                const el = document.createElement("div");
                // Apply CSS classes based on configuration mode
                el.className = `tonika-module chordonika ${this.settings.mode === "card" ? "chordonika--card" : "chordonika--floating"}`;
                el.innerHTML = this._uiHTML(); // Insert complete UI structure
                document.body.appendChild(el); // Add to page
                this._mount = el; // Store reference for future use
            } else {
                // Mount to an existing element
                this._mount.classList.add("tonika-module", "chordonika");
                // Add mode-specific styling
                this._mount.classList.add(
                    this.settings.mode === "card" ? "chordonika--card" : "chordonika--floating"
                );
                this._mount.innerHTML = this._uiHTML(); // Insert UI content
            }

            // Populate dropdown menus with available options
            this._populateDropdowns();
        }

        /**
         * Generate complete UI HTML structure
         * Returns the full interface layout as an HTML string
         * Includes header, controls, chord info display, and keyboard
         * @returns {string} Complete UI HTML
         */
        _uiHTML() {
            return `
            <div class="chordonika__header">
              <div class="chordonika__title-section">
                <h3 class="chordonika__title">Chord Selection</h3>
                <div class="chordonika__subtitle">Select chords and see them visualized on the keyboard</div>
              </div>
            </div>
            <div class="chordonika__content">
              <div class="chordonika__chord-selector">
                <div class="chordonika__controls">
                  <!-- Root note selection dropdown -->
                  <div class="chordonika__dropdown-group">
                    <label for="chordonika-root-select">Root Note:</label>
                    <select id="chordonika-root-select" class="tonika-select chordonika__dropdown">
                      <option value="">Select root note...</option>
                    </select>
                  </div>
                  <!-- Chord quality selection dropdown -->
                  <div class="chordonika__dropdown-group">
                    <label for="chordonika-quality-select">Chord Quality:</label>
                    <select id="chordonika-quality-select" class="tonika-select chordonika__dropdown">
                      <option value="">Select chord quality...</option>
                    </select>
                  </div>
                </div>
                <!-- Chord information display and clear button -->
                <div class="chordonika__chord-info" aria-live="polite">
                  <div class="chordonika__chord-details">
                    <div class="chordonika__chord-symbol"></div> <!-- Shows chord symbol like "Cm7" -->
                    <div class="chordonika__chord-notes"></div>  <!-- Shows individual notes like "C - E♭ - G - B♭" -->
                  </div>
                  <button class="tonika-btn tonika-btn--danger chordonika__clear-btn">Clear</button>
                </div>
              </div>
              <div class="chordonika__keyboard-container">
                ${this._createKeyboard()} <!-- Insert the keyboard HTML -->
              </div>
            </div>`;
        }

        /**
         * Populate dropdown menus with available options
         * Fills the root note and chord quality select elements with data from chordData
         */
        _populateDropdowns() {
            // Get references to dropdown elements
            const rootSelect = this._mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this._mount?.querySelector("#chordonika-quality-select");

            // Populate root note dropdown
            if (rootSelect) {
                this.chordData.rootNotes.forEach(root => {
                    const option = document.createElement("option");
                    option.value = root.value;        // Internal value (e.g., "C#")
                    option.textContent = root.label;  // Display text (e.g., "C#/Db")
                    rootSelect.appendChild(option);
                });
            }

            // Populate chord quality dropdown
            if (qualitySelect) {
                // Sort chord qualities by priority (basic chords first)
                const sorted = Object.entries(this.chordData.chordQualities)
                    .sort(([,a],[,b]) => a.priority - b.priority); // Sort by priority number

                sorted.forEach(([key, quality]) => {
                    const option = document.createElement("option");
                    option.value = key;               // Internal key (e.g., "major7")
                    option.textContent = quality.label; // Display label (e.g., "Major 7th")
                    qualitySelect.appendChild(option);
                });
            }
        }

        /**
         * Attach event listeners to UI elements
         * Sets up all user interaction handlers for dropdowns and buttons
         */
        _attachUIHandlers() {
            if (!this._mount) return; // Safety check

            // Get references to interactive elements
            const rootSelect = this._mount.querySelector("#chordonika-root-select");
            const qualitySelect = this._mount.querySelector("#chordonika-quality-select");
            const clearBtn = this._mount.querySelector(".chordonika__clear-btn");

            // Attach event listeners with optional chaining for safety
            // Arrow functions preserve 'this' context automatically
            rootSelect?.addEventListener("change", () => this._handleChordChange());
            qualitySelect?.addEventListener("change", () => this._handleChordChange());
            clearBtn?.addEventListener("click", () => this._clearSelection());
        }

        /**
         * Handle chord selection changes
         * This is called whenever either dropdown changes value
         * Calculates the chord, updates the display, and notifies listeners
         */
        _handleChordChange() {
            // Get current selection values from dropdowns
            const rootSelect = this._mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this._mount?.querySelector("#chordonika-quality-select");
            const rootNote = rootSelect?.value;
            const quality = qualitySelect?.value;

            // Only proceed if both selections are made
            if (rootNote && quality) {
                // Calculate the actual chord from selections
                const chord = this._calculateChord(rootNote, quality);

                // Update all visual elements
                this._updateChordDisplay(chord);    // Show chord symbol and notes
                this._highlightChordNotes(chord);   // Light up keyboard keys

                // Notify external listeners via both methods
                if (this.settings.onChordSelected) this.settings.onChordSelected(chord); // Legacy callback
                this.emit("ui:chordselected", chord); // Modern event system
            } else {
                // Clear everything if selections are incomplete
                this._updateChordDisplay(null);
                this._clearHighlights();

                // Notify that no chord is selected
                if (this.settings.onChordSelected) this.settings.onChordSelected(null);
                this.emit("ui:chordselected", null);
            }
        }

        /**
         * Clear all selections and reset interface
         * Resets dropdowns to the default state and clears all visual feedback
         */
        _clearSelection() {
            // Reset dropdown selections to empty values
            const rootSelect = this._mount?.querySelector("#chordonika-root-select");
            const qualitySelect = this._mount?.querySelector("#chordonika-quality-select");
            if (rootSelect) rootSelect.value = "";    // Reset to "Select root note..."
            if (qualitySelect) qualitySelect.value = ""; // Reset to "Select chord quality..."

            // Clear all visual displays
            this._updateChordDisplay(null);  // Clear chord symbol and notes' text
            this._clearHighlights();        // Remove keyboard highlighting

            // Notify listeners that selection was cleared
            if (this.settings.onChordSelected) this.settings.onChordSelected(null);
            this.emit("ui:chordselected", null);
        }

        /**
         * Update chord information display
         * Shows the chord symbol and individual notes in the UI
         *
         * @param {Object|null} chord - Chord object to display, or null to clear
         */
        _updateChordDisplay(chord) {
            // Get references to display elements
            const symbolEl = this._mount?.querySelector(".chordonika__chord-symbol"); // Shows "Cm7"
            const notesEl = this._mount?.querySelector(".chordonika__chord-notes");   // Shows "C - E♭ - G - B♭"

            // Update chord symbol (e.g., "Cm7" or empty)
            if (symbolEl) symbolEl.textContent = chord ? chord.symbol : "";

            // Update individual notes display (joined with " - " separator)
            if (notesEl) notesEl.textContent = chord ? chord.notes.join(" - ") : "";
        }

        /**
         * Return status information about Chordonika for debugging or UI
         * @returns {Array<Object>} Array of API status objects
         */
        getStatus() {
            return [
                {
                    api: "app:status",
                    type: "emit",
                    active: true,
                    description: "Lifecycle status such as 'initializing' and 'ready'."
                },
                {
                    api: "ui:chordselected",
                    type: "emit",
                    active: true,
                    description: "Fires when a user selects or clears a chord."
                },
                {
                    api: "external:on",
                    type: "listen",
                    active: true,
                    description: "External listeners may subscribe to Chordonika events via .on()."
                }
            ];
        }
    }

    // Export to global scope for use by other scripts
    // This makes the Chordonika class available as a window.Chordonika
    window.Chordonika = Chordonika;

})(); // End of IIFE - immediately executes and keeps internal variables private