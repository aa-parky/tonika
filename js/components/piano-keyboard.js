/**
 * Self-contained Piano Keyboard Component
 * A modular, reusable piano keyboard with MIDI integration
 */

// Utility functions
function rafThrottle(fn) {
  let raf = 0, lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        fn(...lastArgs);
      });
    }
  };
}

function midiNoteName(n) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[n % 12]}${Math.floor(n / 12) - 1}`;
}

const pc = (n) => ((n % 12) + 12) % 12;
const isBlack = (midi) => {
  const p = pc(midi);
  return p === 1 || p === 3 || p === 6 || p === 8 || p === 10;
};
const isWhite = (midi) => !isBlack(midi);

// Piano Renderer Class
class PianoRenderer {
  constructor() {
    this.A0 = 21;
    this.C8 = 108;
    
    // Colors
    this.colors = {
      white: "#ffffff",
      black: "#111111",
      whiteOutline: "#444444",
      blackOutline: "#222222",
      scale: "#58d68d",
      pressed: "#1e3a8a",
      root: "#f43f5e",
      label: "#b9c1c9",
      highlight: "#6aa0ff"
    };
  }

  getWhiteKeyIndex(midi) {
    const octave = Math.floor((midi - 12) / 12);
    const noteInOctave = pc(midi);
    
    let whiteIndexInOctave;
    switch (noteInOctave) {
      case 0: whiteIndexInOctave = 0; break; // C
      case 2: whiteIndexInOctave = 1; break; // D
      case 4: whiteIndexInOctave = 2; break; // E
      case 5: whiteIndexInOctave = 3; break; // F
      case 7: whiteIndexInOctave = 4; break; // G
      case 9: whiteIndexInOctave = 5; break; // A
      case 11: whiteIndexInOctave = 6; break; // B
      default: return -1;
    }
    
    return octave * 7 + whiteIndexInOctave;
  }

  getBlackKeyPosition(midi) {
    const noteInOctave = pc(midi);
    
    switch (noteInOctave) {
      case 1: return { leftWhiteNote: 0, rightWhiteNote: 2, offset: 0.75 }; // C#
      case 3: return { leftWhiteNote: 2, rightWhiteNote: 4, offset: 0.25 }; // D#
      case 6: return { leftWhiteNote: 5, rightWhiteNote: 7, offset: 0.75 }; // F#
      case 8: return { leftWhiteNote: 7, rightWhiteNote: 9, offset: 0.5 }; // G#
      case 10: return { leftWhiteNote: 9, rightWhiteNote: 11, offset: 0.25 }; // A#
      default: return null;
    }
  }

  drawCLabels(ctx, whiteKeys, whiteW, H) {
    const fontPx = Math.max(10, Math.floor(whiteW * 0.8));
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = this.colors.label;
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 1;
    ctx.shadowOffsetY = 1;

    whiteKeys.forEach((key) => {
      if (pc(key.midi) === 0) {
        const cx = key.x + whiteW / 2;
        ctx.fillText(`C${Math.floor(key.midi / 12) - 1}`, cx, H - 3);
      }
    });

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  draw(canvas, state) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Determine viewport range
    let startMidi = this.A0;
    let endMidi = this.C8;
    if (state.view) {
      startMidi = this.A0 + state.view.offset;
      endMidi = startMidi + state.view.keys - 1;
    }

    // Generate all MIDI notes in range
    const allMidi = [];
    for (let midi = startMidi; midi <= endMidi; midi++) {
      allMidi.push(midi);
    }

    // Separate white and black keys
    const whiteMidi = allMidi.filter(isWhite);
    const blackMidi = allMidi.filter(isBlack);

    // Calculate white key layout
    const whiteCount = whiteMidi.length;
    if (whiteCount === 0) return;

    const whiteW = W / whiteCount;
    const blackH = Math.floor(H * 0.62);
    const blackW = whiteW * 0.6;

    // Create white key objects with positions
    const whiteKeys = whiteMidi.map((midi, i) => ({
      midi,
      x: i * whiteW,
      width: whiteW,
    }));

    ctx.clearRect(0, 0, W, H);

    // Draw white keys first
    whiteKeys.forEach((key) => {
      const n = pc(key.midi);

      // Base white key
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.colors.white;
      ctx.fillRect(key.x, 0, key.width, H);

      // Scale tint
      if (state.scaleMask && state.scaleMask & (1 << n)) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = this.colors.scale;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;
      }

      // Root tint
      if (state.scaleMask && n === state.rootPc) {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = this.colors.root;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;
      }

      // Highlight tint
      if (state.highlightedNotes && state.highlightedNotes.has(key.midi)) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.colors.highlight;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;
      }

      // Pressed overlay
      if (state.pressedNotes && state.pressedNotes.has(key.midi)) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = this.colors.pressed;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;

        // Root note ring
        if (state.scaleMask && n === state.rootPc) {
          ctx.strokeStyle = "#f5b041";
          ctx.lineWidth = 3;
          ctx.strokeRect(
            Math.floor(key.x) + 6,
            6,
            Math.ceil(key.width) - 12,
            H - 12,
          );
        }
      }

      // Border
      ctx.strokeStyle = this.colors.whiteOutline;
      ctx.strokeRect(
        Math.floor(key.x) + 0.5,
        0.5,
        Math.ceil(key.width) - 1,
        H - 1,
      );
    });

    // Draw black keys on top
    blackMidi.forEach((midi) => {
      const n = pc(midi);
      const blackPos = this.getBlackKeyPosition(midi);
      if (!blackPos) return;

      // Find the white keys this black key should be positioned between
      const octave = Math.floor((midi - 12) / 12);
      const leftWhiteMidi = octave * 12 + 12 + blackPos.leftWhiteNote;
      const rightWhiteMidi = octave * 12 + 12 + blackPos.rightWhiteNote;

      // Find these white keys in our visible white keys
      const leftWhiteKey = whiteKeys.find((k) => k.midi === leftWhiteMidi);
      const rightWhiteKey = whiteKeys.find((k) => k.midi === rightWhiteMidi);

      if (!leftWhiteKey || !rightWhiteKey) return;

      // Calculate black key position
      const leftEdge = leftWhiteKey.x + leftWhiteKey.width;
      const rightEdge = rightWhiteKey.x;
      const gap = rightEdge - leftEdge;
      const blackX = leftEdge + (gap - blackW) / 2;

      // Draw black key
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.colors.black;
      ctx.fillRect(blackX, 0, blackW, blackH);

      // Scale tint
      if (state.scaleMask && state.scaleMask & (1 << n)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = this.colors.scale;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;
      }

      // Root tint
      if (state.scaleMask && n === state.rootPc) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = this.colors.root;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;
      }

      // Highlight tint
      if (state.highlightedNotes && state.highlightedNotes.has(midi)) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = this.colors.highlight;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;
      }

      // Pressed overlay
      if (state.pressedNotes && state.pressedNotes.has(midi)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = this.colors.pressed;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;

        // Root note ring
        if (state.scaleMask && n === state.rootPc) {
          ctx.strokeStyle = "#f5b041";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            Math.floor(blackX) + 3,
            3,
            Math.ceil(blackW) - 6,
            blackH - 6,
          );
        }
      }

      // Border
      ctx.strokeStyle = this.colors.blackOutline;
      ctx.strokeRect(
        Math.floor(blackX) + 0.5,
        0.5,
        Math.ceil(blackW) - 1,
        blackH - 1,
      );
    });

    // Draw C labels if enabled
    if (state.showLabels) {
      this.drawCLabels(ctx, whiteKeys, whiteW, H);
    }
  }
}

// Piano Controls Class
class PianoControls {
  constructor(container, options, callbacks) {
    this.container = container;
    this.options = options;
    this.callbacks = callbacks;
    this.A0 = 21;
    this.C8 = 108;
    
    this.view = { ...options.initialView };
    this.layout = { ...options.layout };
    
    this.createElement();
    this.bindEvents();
    this.updateDisplay();
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.className = "piano-controls";
    this.element.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      flex-wrap: wrap;
      font-size: 14px;
    `;
    
    this.element.innerHTML = `
      <button data-preset="88">88</button>
      <button data-preset="61">61</button>
      <button data-preset="49">49</button>
      <button data-preset="12">1 Oct</button>
      <span style="margin-left:8px"></span>
      <button data-shift="-12">Oct −</button>
      <button data-shift="12">Oct +</button>
      <span class="range-label" style="opacity:.8; margin-left:8px"></span>
      <span style="margin-left:12px"></span>
      <label>
        <input class="fit-toggle" type="checkbox" />
        Fit to panel
      </label>
      <label title="Pixels per white key (scroll mode)">
        Key width
        <input class="key-px" type="range" min="8" max="28" value="16" />
      </label>
    `;
    
    this.container.appendChild(this.element);
  }

  bindEvents() {
    // Preset buttons
    this.element.querySelectorAll("button[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const keys = parseInt(btn.dataset.preset, 10);
        const offsets = { 88: this.A0, 61: 36, 49: 36, 12: 60 };
        this.view.offset = offsets[keys] ?? this.A0;
        this.view.keys = keys;
        this.clampAndNotify();
      });
    });

    // Shift buttons
    this.element.querySelectorAll("button[data-shift]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = parseInt(btn.dataset.shift, 10);
        this.view.offset += delta;
        this.clampAndNotify();
      });
    });

    // Layout controls
    const fitToggle = this.element.querySelector(".fit-toggle");
    const keyPx = this.element.querySelector(".key-px");

    fitToggle.addEventListener("change", () => {
      this.layout.mode = fitToggle.checked ? "fit" : "scroll";
      this.callbacks.onLayoutChange?.(this.layout);
    });

    keyPx.addEventListener("input", () => {
      this.layout.pxWhite = parseInt(keyPx.value, 10);
      this.callbacks.onLayoutChange?.(this.layout);
    });
  }

  clampAndNotify() {
    this.view.keys = Math.max(1, Math.min(88, this.view.keys));
    const end = this.view.offset + this.view.keys - 1;
    if (end > this.C8) this.view.offset = this.C8 - (this.view.keys - 1);
    if (this.view.offset < this.A0) this.view.offset = this.A0;

    this.updateDisplay();
    this.callbacks.onViewChange?.(this.view);
  }

  updateDisplay() {
    const start = this.view.offset;
    const stop = this.view.offset + this.view.keys - 1;
    const label = `${midiNoteName(start)} – ${midiNoteName(stop)} (${this.view.keys})`;
    this.element.querySelector(".range-label").textContent = label;
  }

  setView(view) {
    this.view = { ...view };
    this.updateDisplay();
  }

  destroy() {
    this.element.remove();
  }
}

// MIDI Handler Class
class MIDIHandler {
  constructor(eventBus, callbacks) {
    this.eventBus = eventBus;
    this.callbacks = callbacks;
    this.offs = [];
    
    if (eventBus) {
      this.bindEvents();
    }
  }

  bindEvents() {
    this.offs.push(
      this.eventBus.on("midi:noteon", (ev) => {
        this.callbacks.onNoteOn?.(ev.note, ev.velocity);
      })
    );
    
    this.offs.push(
      this.eventBus.on("midi:noteoff", (ev) => {
        this.callbacks.onNoteOff?.(ev.note);
      })
    );
    
    this.offs.push(
      this.eventBus.on("midi:cc", (ev) => {
        if (ev.cc === 64) { // Sustain pedal
          this.callbacks.onPedal?.('sustain', ev.value >= 64);
        }
      })
    );
  }

  destroy() {
    this.offs.forEach((off) => off && off());
    this.offs = [];
  }
}

// Main Piano Keyboard Component
export class PianoKeyboard {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      // Default options
      initialView: { offset: 21, keys: 88 },
      layout: { mode: 'scroll', pxWhite: 16 },
      showControls: true,
      showLabels: true,
      theme: 'dark',
      midiEnabled: true,
      eventBus: null,
      onNotePress: null,
      onNoteRelease: null,
      onViewChange: null,
      onLayoutChange: null,
      ...options
    };

    this.state = {
      pressedNotes: new Set(),
      sustainedNotes: new Set(),
      highlightedNotes: new Set(),
      scaleMask: null,
      rootPc: null,
      view: { ...this.options.initialView },
      layout: { ...this.options.layout },
      pedals: { sustain: false },
      showLabels: this.options.showLabels
    };

    this.renderer = new PianoRenderer();
    this.controls = null;
    this.midiHandler = null;
    this.canvas = null;
    this.resizeObserver = null;

    this.init();
  }

  init() {
    this.createElements();
    this.setupCanvas();
    this.setupControls();
    this.setupMIDI();
    this.setupResize();
    this.render();
  }

  createElements() {
    // Add CSS class to container
    this.container.classList.add('piano-keyboard');
    if (this.options.layout.mode === 'fit') {
      this.container.classList.add('piano-keyboard--fit');
    } else {
      this.container.classList.add('piano-keyboard--scroll');
    }

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'piano-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 240px;
      display: block;
      border-radius: 4px;
    `;
    
    this.container.appendChild(this.canvas);
  }

  setupCanvas() {
    this.scheduleRender = rafThrottle(() => {
      this.updateCanvasSize();
      this.renderer.draw(this.canvas, this.state);
    });
  }

  setupControls() {
    if (this.options.showControls) {
      this.controls = new PianoControls(this.container, this.options, {
        onViewChange: (view) => {
          this.state.view = view;
          this.scheduleRender();
          this.options.onViewChange?.(view);
        },
        onLayoutChange: (layout) => {
          this.state.layout = layout;
          this.updateLayoutClass();
          this.scheduleRender();
          this.options.onLayoutChange?.(layout);
        }
      });
      
      // Move controls before canvas
      this.container.insertBefore(this.controls.element, this.canvas);
    }
  }

  setupMIDI() {
    if (this.options.midiEnabled && this.options.eventBus) {
      this.midiHandler = new MIDIHandler(this.options.eventBus, {
        onNoteOn: (note, velocity) => {
          this.pressNote(note, velocity);
        },
        onNoteOff: (note) => {
          this.releaseNote(note);
        },
        onPedal: (pedal, value) => {
          this.setPedal(pedal, value);
        }
      });
    }
  }

  setupResize() {
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleRender();
    });
    this.resizeObserver.observe(this.container);
  }

  updateCanvasSize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    
    if (this.state.layout.mode === 'fit') {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(300, rect.width);
      const h = 240;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = "";
    } else {
      // Scroll mode
      let start = 21, keys = 88;
      if (this.state.view) {
        start = 21 + this.state.view.offset;
        keys = this.state.view.keys;
      }
      const end = Math.min(108, start + keys - 1);
      let whiteCount = 0;
      for (let m = start; m <= end; m++) {
        if (isWhite(m)) whiteCount++;
      }

      const w = Math.max(whiteCount * this.state.layout.pxWhite, 300);
      const h = 240;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
    }

    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  updateLayoutClass() {
    this.container.classList.remove('piano-keyboard--fit', 'piano-keyboard--scroll');
    if (this.state.layout.mode === 'fit') {
      this.container.classList.add('piano-keyboard--fit');
    } else {
      this.container.classList.add('piano-keyboard--scroll');
    }
  }

  render() {
    this.scheduleRender();
  }

  // Public API methods
  setView(view) {
    this.state.view = { ...this.state.view, ...view };
    this.controls?.setView(this.state.view);
    this.scheduleRender();
  }

  setLayout(layout) {
    this.state.layout = { ...this.state.layout, ...layout };
    this.updateLayoutClass();
    this.scheduleRender();
  }

  setScale({ mask, rootPc }) {
    this.state.scaleMask = mask ?? null;
    this.state.rootPc = rootPc ?? null;
    this.scheduleRender();
  }

  highlightNotes(notes) {
    this.state.highlightedNotes = new Set(notes);
    this.scheduleRender();
  }

  clearHighlights() {
    this.state.highlightedNotes.clear();
    this.scheduleRender();
  }

  pressNote(note, velocity = 127) {
    this.state.pressedNotes.add(note);
    this.state.sustainedNotes.delete(note);
    this.scheduleRender();
    this.options.onNotePress?.(note, velocity);
  }

  releaseNote(note) {
    if (this.state.pedals.sustain) {
      this.state.sustainedNotes.add(note);
    } else {
      this.state.pressedNotes.delete(note);
      this.state.sustainedNotes.delete(note);
    }
    this.scheduleRender();
    this.options.onNoteRelease?.(note);
  }

  setPedal(pedal, value) {
    if (pedal === 'sustain') {
      const wasPressed = this.state.pedals.sustain;
      this.state.pedals.sustain = value;
      
      if (wasPressed && !value) {
        // Release sustained notes
        for (const note of this.state.sustainedNotes) {
          this.state.pressedNotes.delete(note);
        }
        this.state.sustainedNotes.clear();
        this.scheduleRender();
      }
    }
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.midiHandler?.destroy();
    this.controls?.destroy();
    this.container.classList.remove('piano-keyboard', 'piano-keyboard--fit', 'piano-keyboard--scroll');
    this.canvas?.remove();
  }
}

// Default export
export default PianoKeyboard;

