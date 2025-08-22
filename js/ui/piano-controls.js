import { settings } from "../services/settings.js";

function noteName(n) {
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

export function mountPianoControls({ target, onViewChange, onLayoutChange }) {
  const wrap = document.createElement("div");
  wrap.id = "piano-controls";
  wrap.style.cssText = `display:flex;align-items:center;gap:8px;margin:0 0 8px 0;flex-wrap:wrap;`;
  wrap.innerHTML = `
    <button data-preset="88">88</button>
    <button data-preset="61">61</button>
    <button data-preset="49">49</button>
    <button data-preset="12">1 Oct</button>
    <span style="margin-left:8px"></span>
    <button data-shift="-12">Oct −</button>
    <button data-shift="12">Oct +</button>
    <span id="range-label" style="opacity:.8; margin-left:8px"></span>
    <span style="margin-left:12px"></span>
    <label>
      <input id="fit-toggle" type="checkbox" />
      Fit to panel
    </label>
    <label title="Pixels per white key (scroll mode)">
      Key width
      <input id="key-px" type="range" min="8" max="28" value="16" />
    </label>
  `;
  target.prepend(wrap);

  const A0 = 21,
    C8 = 108;
  const view = { offset: A0, keys: 88 }; // absolute MIDI offset
  let layout = { mode: "scroll", pxWhite: 16 }; // default: SCROLL

  function clampAndNotify(next) {
    next.keys = Math.max(1, Math.min(88, next.keys));
    const end = next.offset + next.keys - 1;
    if (end > C8) next.offset = C8 - (next.keys - 1);
    if (next.offset < A0) next.offset = A0;

    const start = next.offset;
    const stop = next.offset + next.keys - 1;
    wrap.querySelector("#range-label").textContent =
      `${noteName(start)} – ${noteName(stop)} (${next.keys})`;

    onViewChange?.({ offset: next.offset, keys: next.keys });
  }

  wrap.querySelectorAll("button[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const keys = parseInt(btn.dataset.preset, 10);
      const offsets = { 88: A0, 61: 36, 49: 36, 12: 60 };
      view.offset = offsets[keys] ?? A0;
      view.keys = keys;
      clampAndNotify(view);
    });
  });

  wrap.querySelectorAll("button[data-shift]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = parseInt(btn.dataset.shift, 10);
      view.offset += delta;
      clampAndNotify(view);
    });
  });

  // Layout: Fit toggle + key width
  const fitToggle = wrap.querySelector("#fit-toggle");
  const keyPx = wrap.querySelector("#key-px");

  function sendLayout() {
    onLayoutChange?.({
      mode: fitToggle.checked ? "fit" : "scroll",
      pxWhite: parseInt(keyPx.value, 10),
    });
  }

  fitToggle.addEventListener("change", sendLayout);
  keyPx.addEventListener("input", sendLayout);

  // initial
  clampAndNotify(view);
  sendLayout(); // scroll + pxWhite 16 by default

  return {
    set(v) {
      view.offset = v.offset ?? view.offset;
      view.keys = v.keys ?? view.keys;
      clampAndNotify(view);
    },
  };
}
