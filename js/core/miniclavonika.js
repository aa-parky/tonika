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

    function emit(type, detail) {
      try {
        emitter.dispatchEvent(new CustomEvent(type, { detail }));
        if (window.Tonika?.Bus) {
          window.Tonika.Bus.dispatchEvent(new CustomEvent(type, { detail }));
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
      if (el) el.classList.toggle("miniclavonika__active", state);
    }

    function init() {
      renderKeyboard();
      emit("app:status", { msg: "MiniClavonika ready" });
    }

    return {
      initialize: init,
      noteOn: (m, v = 100) => setActive(m, true),
      noteOff: (m) => setActive(m, false),
      on: (t, h, o) => emitter.addEventListener(t, h, o),
      off: (t, h, o) => emitter.removeEventListener(t, h, o),
      emit
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