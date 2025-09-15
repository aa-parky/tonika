/**
 * MiniClavonika SVG - Two Octave Piano Keyboard
 * Simplified version of Clavonika (24 keys: C3–B4)
 */

(function () {
  "use strict";

  const EmitterBase =
    (typeof window !== "undefined" &&
      window.Tonika &&
      window.Tonika.TonikaEmitter) ||
    EventTarget;

  const MIDI_RANGE = { LOWEST: 48, HIGHEST: 71 }; // C3–B4 inclusive
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const SVG_LAYOUT = {
    WHITE: { WIDTH: 24, HEIGHT: 120, SPACING: 25 },
    BLACK: { WIDTH: 16, HEIGHT: 80, OFFSET: -6 },
    KEYBOARD: { HEIGHT: 130, FELT_HEIGHT: 6 }
  };

  function generateKeys() {
    const keys = [];
    for (let midi = MIDI_RANGE.LOWEST; midi <= MIDI_RANGE.HIGHEST; midi++) {
      const name = NOTE_NAMES[midi % 12];
      const octave = Math.floor(midi / 12) - 1; // MIDI octave rule
      keys.push({
        note: name + octave,
        type: name.includes("#") ? "black" : "white",
        octave,
        midi
      });
    }
    return keys;
  }
  const KEYS = generateKeys();

  function createMiniInstance(container) {
    const emitter = new EmitterBase();
    let svgEl = null;
    let activeNotes = new Set(); // Track currently active notes

    function emit(type, detail) {
      try {
        emitter.dispatchEvent(new CustomEvent(type, { detail }));
        if (window.Tonika?.Bus) {
          window.Tonika.Bus.dispatchEvent(new CustomEvent(type, { detail }));
        }
      } catch {}

      // Standardized debug log
      try {
        if (window.Tonika?.Utils?.debugLog) {
          Tonika.Utils.debugLog("MiniClavonika", type, detail);
        }
      } catch {}
    }

    function calculatePosition(key, idx) {
      if (key.type === "white") {
        const wIndex = KEYS.slice(0, idx).filter(k => k.type === "white").length;
        return {
          x: wIndex * SVG_LAYOUT.WHITE.SPACING,
          y: 0,
          width: SVG_LAYOUT.WHITE.WIDTH,
          height: SVG_LAYOUT.WHITE.HEIGHT
        };
      } else {
        const wBefore = KEYS.slice(0, idx).filter(k => k.type === "white").length;
        return {
          x: wBefore * SVG_LAYOUT.WHITE.SPACING + SVG_LAYOUT.BLACK.OFFSET,
          y: 0,
          width: SVG_LAYOUT.BLACK.WIDTH,
          height: SVG_LAYOUT.BLACK.HEIGHT
        };
      }
    }

    function keyboardWidth() {
      return KEYS.filter(k => k.type === "white").length * SVG_LAYOUT.WHITE.SPACING;
    }

    function createKey(key, idx) {
      const pos = calculatePosition(key, idx);

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `miniclavonika__key miniclavonika__key--${key.type}`);
      g.dataset.midi = key.midi;
      g.dataset.note = key.note;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", pos.x);
      rect.setAttribute("y", pos.y);
      rect.setAttribute("width", pos.width);
      rect.setAttribute("height", pos.height);
      rect.setAttribute("rx", key.type === "black" ? 4 : 3);
      rect.setAttribute("fill", key.type === "black" ? "#111" : "#fff");
      rect.setAttribute("stroke", key.type === "black" ? "#000" : "#aaa");

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", pos.x + pos.width / 2);
      label.setAttribute("y", pos.y + pos.height - 10);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "miniclavonika__label");
      label.textContent = key.note;

      g.appendChild(rect);
      g.appendChild(label);

      // Simple mouse events for demo
      g.addEventListener("mousedown", () => {
        setActive(key.midi, true);
        emit("ui:noteon", { midi: key.midi, velocity: 100 });
      });
      g.addEventListener("mouseup", () => {
        setActive(key.midi, false);
        emit("ui:noteoff", { midi: key.midi });
      });

      return g;
    }

    function renderKeyboard() {
      container.innerHTML = "";
      svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgEl.setAttribute("viewBox", `0 0 ${keyboardWidth()} ${SVG_LAYOUT.KEYBOARD.HEIGHT}`);
      svgEl.setAttribute("width", "100%");
      svgEl.setAttribute("height", "100%");

      KEYS.forEach((k, i) => { if (k.type === "white") svgEl.appendChild(createKey(k, i)); });
      KEYS.forEach((k, i) => { if (k.type === "black") svgEl.appendChild(createKey(k, i)); });

      const felt = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      felt.setAttribute("x", 0);
      felt.setAttribute("y", 0);
      felt.setAttribute("width", keyboardWidth());
      felt.setAttribute("height", SVG_LAYOUT.KEYBOARD.FELT_HEIGHT);
      felt.setAttribute("fill", "#aa0000");
      svgEl.appendChild(felt);

      container.appendChild(svgEl);
    }

    function setActive(midi, state) {
      const el = container.querySelector(`[data-midi="${midi}"]`);
      if (el) {
        el.classList.toggle("miniclavonika__active", state);
        if (state) {
          activeNotes.add(midi);
        } else {
          activeNotes.delete(midi);
        }
      }
    }

    function clearAllActive() {
      activeNotes.forEach(midi => setActive(midi, false));
      activeNotes.clear();
    }

    function findOptimalChordPosition(chordNotes) {
      if (!Array.isArray(chordNotes) || chordNotes.length === 0) return [];

      // Convert note names to note indices (0-11)
      const noteIndices = chordNotes.map(noteName => {
        const noteIndex = NOTE_NAMES.indexOf(noteName);
        return noteIndex;
      }).filter(idx => idx !== -1);

      if (noteIndices.length === 0) return [];

      // Try different starting octaves to find the best fit
      const possibleOctaves = [2, 3, 4, 5]; // MIDI octaves

      for (const baseOctave of possibleOctaves) {
        const chordMidis = [];
        let baseNote = noteIndices[0]; // Start with root note
        let currentOctave = baseOctave;

        // Build chord in close position
        for (let i = 0; i < noteIndices.length; i++) {
          let noteIndex = noteIndices[i];

          // If this note is lower than our base, put it in the next octave
          if (i > 0 && noteIndex < baseNote) {
            currentOctave = baseOctave + 1;
          } else if (i === 0) {
            currentOctave = baseOctave;
          }

          const midi = (currentOctave + 1) * 12 + noteIndex;

          // Check if this MIDI note is within our keyboard range
          if (midi >= MIDI_RANGE.LOWEST && midi <= MIDI_RANGE.HIGHEST) {
            chordMidis.push(midi);
            baseNote = noteIndex; // Update base for next iteration
          }
        }

        // If we got all the notes within range, this octave works
        if (chordMidis.length === noteIndices.length) {
          return chordMidis;
        }
      }

      // Fallback: try to fit as many notes as possible starting from lowest octave
      const fallbackMidis = [];
      const startOctave = 3; // C3 = MIDI 48

      noteIndices.forEach(noteIndex => {
        const midi3 = (startOctave + 1) * 12 + noteIndex; // Octave 3
        const midi4 = (startOctave + 2) * 12 + noteIndex; // Octave 4

        if (midi3 >= MIDI_RANGE.LOWEST && midi3 <= MIDI_RANGE.HIGHEST) {
          fallbackMidis.push(midi3);
        } else if (midi4 >= MIDI_RANGE.LOWEST && midi4 <= MIDI_RANGE.HIGHEST) {
          fallbackMidis.push(midi4);
        }
      });

      return fallbackMidis;
    }

    function highlightChordNotes(notes) {
      // Clear previous highlights
      clearAllActive();

      if (!Array.isArray(notes)) return;

      // Find optimal positioning for the chord
      const chordMidis = findOptimalChordPosition(notes);

      // Highlight the chord notes
      chordMidis.forEach(midi => setActive(midi, true));
    }

    function handleChordSelected(event) {
      const chord = event.detail;
      if (chord && chord.notes) {
        highlightChordNotes(chord.notes);
      } else {
        clearAllActive();
      }
    }

    function init() {
      renderKeyboard();

      // Subscribe to chord selection events
      if (window.Tonika?.Bus) {
        window.Tonika.Bus.addEventListener('ui:chordselected', handleChordSelected);
      }

      emit("app:status", { state: "ready", module: "MiniClavonika", msg: "MiniClavonika ready" });
    }

    return {
      initialize: init,
      noteOn: (m, v = 100) => setActive(m, true),
      noteOff: (m) => setActive(m, false),
      highlightChord: (notes) => highlightChordNotes(notes),
      clearHighlights: () => clearAllActive(),
      on: (t, h, o) => emitter.addEventListener(t, h, o),
      off: (t, h, o) => emitter.removeEventListener(t, h, o),
      emit,
      destroy: () => {
        if (window.Tonika?.Bus) {
          window.Tonika.Bus.removeEventListener('ui:chordselected', handleChordSelected);
        }
        clearAllActive();
      }
    };
  }

  const MiniClavonika = {
    init(containerId) {
      const container = document.getElementById(containerId);
      if (!container) throw new Error("MiniClavonika container not found");
      const inst = createMiniInstance(container);
      inst.initialize();
      return inst;
    }
  };

  if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.MiniClavonika = MiniClavonika;
  }
})();