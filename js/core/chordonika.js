/*!
 * ============================================================================
 * CHORDONIKA MODULE — Chord Engine (UI-only controls; NO keyboard rendering)
 * ============================================================================
 * v2.0.0 — Refactor: removes internal keyboard; listens to Bus for note input.
 *
 * Responsibilities:
 *  - Provide chord selection UI (root + quality) and display
 *  - Perform chord math and emit `ui:chordselected` with details
 *  - Listen to both `ui:noteon/off` and `midi:noteon/off` (from MiniClavonika,
 *    Clavonika, Jackonika, etc.) WITHOUT rendering any keyboard
 */

(() => {
  "use strict";

  class Chordonika extends Tonika.TonikaModule {
    constructor(opts = {}) {
      super({
        ...opts,
        moduleInfo: {
          name: "Chordonika",
          version: "2.0.0",
          description: "Chord detection and analysis engine (no keyboard)",
        },
      });

      this.settings = {
        mode: opts.mode ?? "card",
        deferInit: opts.deferInit ?? false,
      };

      this.currentChord = null;
      this.isActive = true;

      // Bound handlers and unsub bag
      this._handleNoteOn = this._handleNoteOn.bind(this);
      this._handleNoteOff = this._handleNoteOff.bind(this);
      this._unsubs = [];
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------
    _initialize() {
      this._initChordData();
      this._renderUI();
      this._attachUIHandlers();
      this._setDefaultChord();

      // Subscribe to both UI and MIDI note events via the Bus
      const types = ["ui:noteon", "ui:noteoff", "midi:noteon", "midi:noteoff"];
      types.forEach((t) => {
        const h = t.endsWith("noteon")
          ? this._handleNoteOn
          : this._handleNoteOff;
        const unsub = Tonika.Bus?.on(t, h);
        if (typeof unsub === "function") this._unsubs.push(unsub);
      });

      this.emit("app:status", { state: "ready", module: this.moduleInfo.name });
    }

    destroy() {
      try {
        this._unsubs.forEach((fn) => fn && fn());
      } catch {}
      super.destroy();
    }

    _setDefaultChord() {
      try {
        const rootSelect = this.mount?.querySelector("#chordonika-root-select");
        const qualitySelect = this.mount?.querySelector(
          "#chordonika-quality-select",
        );

        if (rootSelect) rootSelect.value = "D";
        if (qualitySelect) qualitySelect.value = "minor";

        // Use a timeout to ensure the UI is fully rendered before handling the change
        setTimeout(() => {
          this._handleChordChange();
        }, 100);
      } catch (err) {
        console.error("Chordonika: error setting default chord", err);
      }
    }

    // -----------------------------------------------------------------------
    // Event handling (no internal keyboard to highlight)
    // -----------------------------------------------------------------------
    _handleNoteOn(e) {
      // Placeholder for future: capture active notes if you want analysis to be
      // influenced by live input. For now, we simply ignore.
    }
    _handleNoteOff(e) {}

    // -----------------------------------------------------------------------
    // Chord data & math
    // -----------------------------------------------------------------------
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

    _calculateChord(rootNote, quality) {
      try {
        const chordQuality = this.chordData.chordQualities[quality];
        if (!chordQuality) return null;
        const rootIndex = this.chordData.noteNames.indexOf(rootNote);
        if (rootIndex === -1) return null;

        const notes = chordQuality.intervals.map((iv) => {
          const noteIndex = (rootIndex + iv) % 12;
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
      } catch (err) {
        console.error("Chordonika: error calculating chord", err);
        return null;
      }
    }

    // -----------------------------------------------------------------------
    // UI (no keyboard section)
    // -----------------------------------------------------------------------
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

      this.mount.innerHTML = `
        <div class="chordonika__header">
          <h3 class="chordonika__title">Chord Selector</h3>
        </div>

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

        <div class="chordonika__display">
          <div class="chordonika__chord-info">
            <div class="chordonika__chord-symbol">— No chord selected.</div>
            <div class="chordonika__chord-notes"></div>
          </div>
        </div>
      `;

      this._populateDropdowns();
    }

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
        sorted.forEach(([key, q]) => {
          const option = document.createElement("option");
          option.value = key;
          option.textContent = q.label;
          qualitySelect.appendChild(option);
        });
      }
    }

    _attachUIHandlers() {
      if (!this.mount) return;
      const rootSelect = this.mount.querySelector("#chordonika-root-select");
      const qualitySelect = this.mount.querySelector(
        "#chordonika-quality-select",
      );

      rootSelect?.addEventListener("change", () => this._handleChordChange());
      qualitySelect?.addEventListener("change", () =>
        this._handleChordChange(),
      );
    }

    _updateChordDisplay(chord) {
      try {
        const symbolEl = this.mount?.querySelector(".chordonika__chord-symbol");
        const notesEl = this.mount?.querySelector(".chordonika__chord-notes");
        if (symbolEl)
          symbolEl.textContent = chord ? chord.symbol : "— No chord selected.";
        if (notesEl)
          notesEl.textContent = chord?.notes?.length
            ? chord.notes.join(" - ")
            : "";
      } catch (e) {
        console.error("Chordonika: error updating display", e);
      }
    }

    _handleChordChange() {
      try {
        const rootSelect = this.mount?.querySelector("#chordonika-root-select");
        const qualitySelect = this.mount?.querySelector(
          "#chordonika-quality-select",
        );
        const rootNote = rootSelect?.value;
        const quality = qualitySelect?.value;

        if (rootNote && quality) {
          const chord = this._calculateChord(rootNote, quality);
          if (chord && Array.isArray(chord.notes)) {
            this._updateChordDisplay(chord);
            this.emit("ui:chordselected", chord);
            // Also emit directly to Tonika.Bus to ensure the event reaches listeners
            if (window.Tonika?.Bus) {
              window.Tonika.Bus.dispatchEvent(
                new CustomEvent("ui:chordselected", { detail: chord }),
              );
            }
            return;
          }
        }

        this.currentChord = null;
        this._updateChordDisplay(null);
        this.emit("ui:chordselected", null);
        // Also emit directly to Tonika.Bus to ensure the event reaches listeners
        if (window.Tonika?.Bus) {
          window.Tonika.Bus.dispatchEvent(
            new CustomEvent("ui:chordselected", { detail: null }),
          );
        }
      } catch (err) {
        console.error("Chordonika: error handling chord change", err);
        this.currentChord = null;
        this._updateChordDisplay(null);
        this.emit("ui:chordselected", null);
      }
    }


    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    selectChord(rootNote, quality) {
      try {
        const rootSelect = this.mount?.querySelector("#chordonika-root-select");
        const qualitySelect = this.mount?.querySelector(
          "#chordonika-quality-select",
        );
        if (rootSelect) rootSelect.value = rootNote;
        if (qualitySelect) qualitySelect.value = quality;
        this._handleChordChange();
      } catch (e) {
        console.error("Chordonika: selectChord error", e);
      }
    }


    getChordData() {
      return {
        rootNotes: this.chordData.rootNotes.map((r) => r.value),
        chordQualities: Object.keys(this.chordData.chordQualities),
      };
    }

    getStatus() {
      const base = super.getStatus();
      return {
        ...base,
        api: {
          methods: [
            "selectChord",
            "getChordData",
            "getStatus",
          ],
          events: {
            emits: ["ui:chordselected", "app:status"],
            listens: ["ui:noteon", "ui:noteoff", "midi:noteon", "midi:noteoff"],
          },
        },
        state: {
          ...base.state,
          currentChord: this.currentChord,
          isActive: this.isActive,
        },
        capabilities: {
          chordTypes: Object.keys(this.chordData?.chordQualities || {}),
          rootNotes: this.chordData?.rootNotes?.map((n) => n.value) || [],
          supportsKeyboardHighlighting: false,
          supportsProgrammaticSelection: true,
        },
      };
    }

    _getPublicMethods() {
      return [
        "selectChord",
        "getChordData",
        "getStatus",
        "destroy",
      ];
    }
    _getEmittedEvents() {
      return ["ui:chordselected", "app:status", "system:module:registered"];
    }
    _getListenedEvents() {
      return ["ui:noteon", "ui:noteoff", "midi:noteon", "midi:noteoff"];
    }
  }

  window.Chordonika = Chordonika;
})();
