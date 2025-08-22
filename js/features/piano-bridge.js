import { bus } from "../core/event-bus.js";

function rafThrottle(fn) {
  let raf = 0,
    lastArgs = null;
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
  const names = [
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
  return `${names[n % 12]}${Math.floor(n / 12) - 1}`;
}
const isWhite = (m) => ![1, 3, 6, 8, 10].includes(m % 12);

export function mountPianoBridge({ canvas, pianoView = null } = {}) {
  if (!canvas) throw new Error("[PianoBridge] canvas is required");

  const A0 = 21,
    C8 = 108;
  const state = {
    down: new Set(),
    keyMask: null,
    keyPc: null,
    pedal: { sustain: false },
    pianoView,
    _renderView: null,
    _layout: { mode: "scroll", pxWhite: 16 }, // SCROLL by default
  };

  const sustained = new Set();

  function sizeFit() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(300, rect.width);
    const h = Math.max(120, 240);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = ""; // reset explicit width
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function sizeScroll() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let start = A0,
      keys = 88;
    if (state._renderView) {
      start = A0 + state._renderView.offset;
      keys = state._renderView.keys;
    }
    const end = Math.min(C8, start + keys - 1);
    let whiteCount = 0;
    for (let m = start; m <= end; m++) if (isWhite(m)) whiteCount++;

    const w = Math.max(whiteCount * state._layout.pxWhite, 300);
    const h = 240;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`; // enable horizontal scroll
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function overlayRange() {
    if (!state._renderView) return;
    const startAbs = A0 + state._renderView.offset;
    const endAbs = startAbs + state._renderView.keys - 1;

    const ctx = canvas.getContext("2d");
    const pad = 8;
    ctx.save();
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
    const label = `${midiNoteName(startAbs)} – ${midiNoteName(endAbs)} (${state._renderView.keys})`;
    const w = ctx.measureText(label).width + 10,
      h = 18;

    ctx.fillStyle = "rgba(20,24,31,0.75)";
    ctx.strokeStyle = "rgba(50,56,68,0.9)";
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pad, pad, w, h, 6);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(185,193,201,0.95)";
    ctx.fillText(label, pad + 6, pad + 13);
    ctx.restore();
  }

  const scheduleRender = rafThrottle(() => {
    if (!(window.Piano && typeof window.Piano.draw === "function")) return;
    if (state._layout.mode === "fit") sizeFit();
    else sizeScroll();
    window.Piano.draw(canvas, state, state._renderView);
    overlayRange();
  });

  const offs = [];
  offs.push(
    bus.on("midi:noteon", (ev) => {
      state.down.add(ev.note);
      sustained.delete(ev.note);
      scheduleRender();
    }),
  );
  offs.push(
    bus.on("midi:noteoff", (ev) => {
      if (state.pedal.sustain) sustained.add(ev.note);
      else {
        state.down.delete(ev.note);
        sustained.delete(ev.note);
      }
      scheduleRender();
    }),
  );
  offs.push(
    bus.on("midi:cc", (ev) => {
      if (ev.cc === 64) {
        const now = ev.value >= 64;
        if (state.pedal.sustain !== now) {
          state.pedal.sustain = now;
          if (!now) {
            for (const n of sustained) state.down.delete(n);
            sustained.clear();
          }
          scheduleRender();
        }
      }
    }),
  );

  const ro = new ResizeObserver(() => scheduleRender());
  ro.observe(canvas.parentElement || canvas);

  // initial render
  scheduleRender();

  return {
    unmount() {
      ro.disconnect();
      offs.forEach((off) => off && off());
    },
    setView(view) {
      const rel = Math.max(0, (view?.offset ?? A0) - A0);
      state.pianoView = view || null;
      state._renderView = view ? { offset: rel, keys: view.keys } : null;
      scheduleRender();
    },
    setScale({ mask, rootPc }) {
      state.keyMask = mask ?? null;
      state.keyPc = rootPc ?? null;
      scheduleRender();
    },
    setLayout({ mode, pxWhite }) {
      if (mode) state._layout.mode = mode;
      if (pxWhite) state._layout.pxWhite = Math.max(6, Math.min(40, pxWhite));
      scheduleRender();
    },
  };
}
