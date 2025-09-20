(() => {
  "use strict";

  class MiniClavonika extends Tonika.TonikaModule {
    constructor(opts = {}) {
      super({
        ...opts,
        moduleInfo: {
          name: "MiniClavonika",
          version: "2.0.0",
          description: "A two-octave SVG piano keyboard.",
        },
      });

      this._keys = [];
      this._unsubs = [];
    }

    _initialize() {
      try {
        this._renderKeyboard();
        this._attachUIHandlers();
        this._subscribeToBus();

        this.emit("app:status", {
          state: "ready",
          module: this.moduleInfo.name,
        });
      } catch (err) {
        console.error("[MiniClavonika] Initialization failed:", err);
      }
    }

    _renderKeyboard() {
      const selector = this.opts?.mount || this.mount;
      const container =
        typeof selector === "string"
          ? document.querySelector(selector)
          : selector;

      if (!container) {
        console.error("[MiniClavonika] mount container not found:", selector);
        return;
      }

      container.innerHTML = "";

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "miniclavonika__svg");
      svg.setAttribute("width", "600");
      svg.setAttribute("height", "150");

      // Key layout constants
      const whiteWidth = 40;
      const whiteHeight = 150;
      const blackWidth = 25;
      const blackHeight = 90;

      const notes = [
        { name: "C", type: "white" },
        { name: "C#", type: "black" },
        { name: "D", type: "white" },
        { name: "D#", type: "black" },
        { name: "E", type: "white" },
        { name: "F", type: "white" },
        { name: "F#", type: "black" },
        { name: "G", type: "white" },
        { name: "G#", type: "black" },
        { name: "A", type: "white" },
        { name: "A#", type: "black" },
        { name: "B", type: "white" },
      ];

      let midi = 48; // start at C3
      let whiteIndex = 0;

      for (let octave = 0; octave < 2; octave++) {
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i];
          if (note.type === "white") {
            const x = whiteIndex * whiteWidth;
            const key = this._createKey(svgNS, note.name, midi, octave + 3, x, 0, whiteWidth, whiteHeight, note.type);
            svg.appendChild(key.el);
            this._keys.push(key);
            whiteIndex++;
          }
          midi++;
        }
      }

      // Draw black keys after whites (so they overlay)
      midi = 48;
      whiteIndex = 0;
      for (let octave = 0; octave < 2; octave++) {
        for (let i = 0; i < notes.length; i++) {
          const note = notes[i];
          if (note.type === "white") {
            whiteIndex++;
          } else {
            // Position black key between whites
            const x = whiteIndex * whiteWidth - blackWidth / 2;
            const key = this._createKey(svgNS, note.name, midi, octave + 3, x, 0, blackWidth, blackHeight, note.type);
            svg.appendChild(key.el);
            this._keys.push(key);
          }
          midi++;
        }
      }

      container.appendChild(svg);
    }

    _createKey(svgNS, note, midi, octave, x, y, width, height, type) {
      const group = document.createElementNS(svgNS, "g");
      group.setAttribute("class", `miniclavonika__key miniclavonika__key--${type}`);

      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", width);
      rect.setAttribute("height", height);

      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x + width / 2);
      label.setAttribute("y", y + height - 10);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "miniclavonika__label");
      label.textContent = note;

      group.appendChild(rect);
      group.appendChild(label);

      return { midi, note, octave, el: group, rect };
    }

    _attachUIHandlers() {
      this._keys.forEach((key) => {
        key.el.addEventListener("mousedown", () => {
          this.noteOn(key.midi, 100);
          key.el.classList.add("miniclavonika__active");
        });
        key.el.addEventListener("mouseup", () => {
          this.noteOff(key.midi);
          key.el.classList.remove("miniclavonika__active");
        });
      });
    }

    _subscribeToBus() {
      const unsubChord = Tonika.Bus.on(
        "ui:chordselected",
        this._handleChordSelected.bind(this)
      );
      this._unsubs.push(unsubChord);
    }

    _handleChordSelected(event) {
      const chord = event.detail;
      if (chord && chord.notes) {
        this._highlightChordNotes(chord.notes);
      } else {
        this._clearAllActive();
      }
    }

    _noteNameToMidiNumbers(noteName) {
      const noteMap = {
        "C": 0, "C#": 1, "Db": 1,
        "D": 2, "D#": 3, "Eb": 3,
        "E": 4,
        "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8,
        "A": 9, "A#": 10, "Bb": 10,
        "B": 11
      };

      const baseNote = noteMap[noteName];
      if (baseNote === undefined) return [];

      // Return MIDI numbers for this note in both available octaves
      return [48 + baseNote, 60 + baseNote];
    }

    _highlightChordNotes(noteNames) {
      this._clearAllActive();

      if (noteNames.length === 0) return;

      // Convert note names to their base note values (0-11)
      const noteMap = {
        "C": 0, "C#": 1, "Db": 1,
        "D": 2, "D#": 3, "Eb": 3,
        "E": 4,
        "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8,
        "A": 9, "A#": 10, "Bb": 10,
        "B": 11
      };

      const chordNoteValues = noteNames
        .map(noteName => noteMap[noteName])
        .filter(value => value !== undefined)
        .sort((a, b) => a - b); // Sort to get consistent ordering

      if (chordNoteValues.length === 0) return;

      // Find the best starting octave (prefer C3 octave, fallback to C4 if needed)
      const startOctaveMidi = 48; // C3
      const fallbackOctaveMidi = 60; // C4

      // Try to highlight in the lower octave first
      const midiNumbers = chordNoteValues.map(noteValue => startOctaveMidi + noteValue);

      // Check if all notes in the chord can fit in the lower octave
      const allKeysExist = midiNumbers.every(midi => 
        this._keys.some(key => key.midi === midi)
      );

      if (allKeysExist) {
        // Highlight in the lower octave
        midiNumbers.forEach(midi => {
          const key = this._keys.find(k => k.midi === midi);
          if (key) key.el.classList.add("miniclavonika__active");
        });
      } else {
        // Fallback to higher octave if lower octave doesn't have all notes
        const fallbackMidiNumbers = chordNoteValues.map(noteValue => fallbackOctaveMidi + noteValue);
        fallbackMidiNumbers.forEach(midi => {
          const key = this._keys.find(k => k.midi === midi);
          if (key) key.el.classList.add("miniclavonika__active");
        });
      }
    }

    _clearAllActive() {
      this._keys.forEach((key) => key.el.classList.remove("miniclavonika__active"));
    }

    noteOn(midi, velocity = 100) {
      this.emit("ui:noteon", { midi, velocity });
    }

    noteOff(midi) {
      this.emit("ui:noteoff", { midi });
    }

    destroy() {
      this._unsubs.forEach((fn) => fn && fn());
      this._unsubs = [];
      super.destroy();
    }
  }

  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.MiniClavonika = MiniClavonika;
  }
})();
