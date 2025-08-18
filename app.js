/* =========================
   ChordWatch – app.js (slim)
   Loads theory from JSON (with fallbacks), WebMIDI input,
   view switching, big chord banner, and uses Piano/Guitar modules to draw
   ========================= */

/* ---------- Utilities ---------- */
const NOTE_NAMES = [
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
const KEYS = NOTE_NAMES.map((n, i) => ({ name: n, pc: i }));
const pc = (n) => ((n % 12) + 12) % 12;
const pcsFromNotes = (set) =>
  [...new Set([...set].map(pc))].sort((a, b) => a - b);
const transposeSet = (arr, by) =>
  arr.map((x) => pc(x - by)).sort((a, b) => a - b);
const toMask = (arr) => arr.reduce((m, p) => m | (1 << pc(p)), 0);
const setHas = (mask, v) => (mask & (1 << v)) !== 0;

/* flat/sharp preference for note labels */
const FLAT_KEYS = new Set([
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "Cb",
  "D#",
  "G#",
  "C#",
  "F#",
]);
function preferFlatsForKey(keyPc) {
  return FLAT_KEYS.has(NOTE_NAMES[keyPc]);
}
function noteName(pcVal, preferFlats = false) {
  const SHARP = [
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
  const FLAT = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];
  return (preferFlats ? FLAT : SHARP)[pcVal];
}

/* ---------- Built-in defaults (fallbacks if JSON missing) ---------- */
const DEFAULT_SCALES = [
  { name: "None (no scale)", intervals: null },
  { name: "Major (Ionian)", intervals: [0, 2, 4, 5, 7, 9, 11] },
  { name: "Natural Minor (Aeolian)", intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
  { name: "Lydian", intervals: [0, 2, 4, 6, 7, 9, 11] },
  { name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] },
  { name: "Locrian", intervals: [0, 1, 3, 5, 6, 8, 10] },
  { name: "Pentatonic Major", intervals: [0, 2, 4, 7, 9] },
  { name: "Pentatonic Minor", intervals: [0, 3, 5, 7, 10] },
  { name: "Chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];
const DEFAULT_CHORDS = [
  { name: "maj", intervals: [0, 4, 7] },
  { name: "min", intervals: [0, 3, 7] },
  { name: "dim", intervals: [0, 3, 6] },
  { name: "aug", intervals: [0, 4, 8] },
  { name: "sus2", intervals: [0, 2, 7] },
  { name: "sus4", intervals: [0, 5, 7] },
  { name: "7", intervals: [0, 4, 7, 10] },
  { name: "maj7", intervals: [0, 4, 7, 11] },
  { name: "m7", intervals: [0, 3, 7, 10] },
  { name: "mMaj7", intervals: [0, 3, 7, 11] },
  { name: "6", intervals: [0, 4, 7, 9] },
  { name: "m6", intervals: [0, 3, 7, 9] },
  { name: "add9", intervals: [0, 4, 7, 14] },
  { name: "madd9", intervals: [0, 3, 7, 14] },
  { name: "6/9", intervals: [0, 4, 7, 9, 14] },
];

/* ---------- Theory (loaded) ---------- */
let THEORY = { scales: DEFAULT_SCALES, chords: DEFAULT_CHORDS };

async function loadTheory() {
  async function safeFetch(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (_e) {
      return null;
    }
  }
  const s = await safeFetch("scales.json");
  const c = await safeFetch("chords.json");
  if (s && Array.isArray(s.scales))
    THEORY.scales = s.scales.filter(
      (x) => x && typeof x.name === "string" && "intervals" in x,
    );
  if (c && Array.isArray(c.chords))
    THEORY.chords = c.chords.filter(
      (x) => x && typeof x.name === "string" && Array.isArray(x.intervals),
    );
}

/* ---------- Rich chord detection (quality + inversion + slash) ---------- */
function detectChordDetail(activeMidiSet, keyPc, keyMask) {
  const midiNotes = [...activeMidiSet].sort((a, b) => a - b);
  if (!midiNotes.length) return null;
  const pcs = pcsFromNotes(activeMidiSet);
  const bassMidi = midiNotes[0],
    bassPc = pc(bassMidi);

  let best = null;
  for (const rootCandidate of pcs) {
    const relSet = transposeSet(pcs, rootCandidate);
    for (const ch of THEORY.chords) {
      const target = new Set(ch.intervals.map(pc));
      const have = new Set(relSet);
      const coverage = [...target].filter((t) => have.has(t)).length;
      const minNeeded = Math.min(3, target.size);
      if (coverage < minNeeded) continue;

      const extras = [...have].filter((t) => !target.has(t));
      const missing = [...target].filter((t) => !have.has(t));

      let score = coverage * 10 - extras.length * 1.5 - missing.length * 2;
      const relBass = pc(bassPc - rootCandidate);
      const bassRank =
        relBass === 0
          ? 3
          : relBass === 4 || relBass === 3
            ? 2
            : relBass === 7 || relBass === 6 || relBass === 8
              ? 1
              : 0;
      score += bassRank;
      if (keyMask && setHas(keyMask, rootCandidate)) score += 0.5;

      if (!best || score > best.score) {
        best = {
          score,
          rootPc: rootCandidate,
          baseName: ch.name,
          relSet,
          extras,
          missing,
          bassPc,
        };
      }
    }
  }
  if (!best) return null;

  const relBass = pc(best.bassPc - best.rootPc);
  const has3 = best.relSet.includes(3) || best.relSet.includes(4);
  const has5 =
    best.relSet.includes(7) ||
    best.relSet.includes(6) ||
    best.relSet.includes(8);
  const has7 = best.relSet.includes(10) || best.relSet.includes(11);

  let inversion = "slash";
  if (relBass === 0) inversion = "root";
  else if (has3 && (relBass === 3 || relBass === 4)) inversion = "1st";
  else if (has5 && (relBass === 7 || relBass === 6 || relBass === 8))
    inversion = "2nd";
  else if (has7 && (relBass === 10 || relBass === 11)) inversion = "3rd";

  const EXT_MAP = [
    { name: "b9", pc: 1 },
    { name: "9", pc: 2 },
    { name: "#9", pc: 3 },
    { name: "11", pc: 5 },
    { name: "#11", pc: 6 },
    { name: "b13", pc: 8 },
    { name: "13", pc: 9 },
  ];
  const extNames = EXT_MAP.filter((e) => best.relSet.includes(e.pc)).map(
    (e) => e.name,
  );

  const flats = preferFlatsForKey(keyPc);
  const rootName = noteName(best.rootPc, flats);
  const bassName = noteName(best.bassPc, flats);

  let quality = best.baseName;
  if (extNames.length) quality += " " + extNames.join(",");

  const label =
    inversion === "root"
      ? `${rootName} ${quality}`
      : `${rootName} ${quality}/${bassName}`;
  const invPretty =
    inversion === "root"
      ? null
      : inversion === "1st"
        ? "1st inv"
        : inversion === "2nd"
          ? "2nd inv"
          : inversion === "3rd"
            ? "3rd inv"
            : "slash bass";

  return {
    label: label.trim(),
    rootPc: best.rootPc,
    bassPc: best.bassPc,
    inversion: invPretty,
    quality,
    pcs,
  };
}

/* Roman numerals when a scale is active */
function romanForChord(rootPc, quality, keyPc, keyMask) {
  if (!keyMask) return null;
  const degrees = [];
  for (let i = 0; i < 12; i++) {
    const d = pc(keyPc + i);
    if (setHas(keyMask, d)) degrees.push(d);
    if (degrees.length >= 7) break;
  }
  const idx = degrees.indexOf(rootPc);
  if (idx === -1) return null;
  const base = ["I", "II", "III", "IV", "V", "VI", "VII"][idx];
  const decorate = (roman, q) => {
    if (/dim/.test(q)) return roman.toLowerCase() + "°";
    if (/min|m(?!aj)/.test(q)) return roman.toLowerCase();
    if (/aug|\+/.test(q)) return roman + "+";
    return roman;
  };
  return decorate(base, quality);
}

/* ---------- State ---------- */
const state = {
  down: new Map(),
  lastNoteMs: 0,
  keyPc: 0,
  scaleName: "None (no scale)",
  tuning: [40, 45, 50, 55, 59, 64],
  keyMask: 0,
};

/* ---------- DOM ---------- */
const midiInSel = document.getElementById("midiIn");
const keySel = document.getElementById("keySel");
const scaleSel = document.getElementById("scaleSel");
const tuningSel = document.getElementById("tuningSel");
const chordName = document.getElementById("chordName"); // small line
const bigChordName = document.getElementById("bigChordName"); // big banner
const activeNotes = document.getElementById("activeNotes");
const latencyText = document.getElementById("latencyText");
const viewSel = document.getElementById("viewSel");
const mainGrid = document.getElementById("mainGrid");
const pianoCard = document.getElementById("pianoCard");
const fretCard = document.getElementById("fretCard");

/* ---------- Populate selectors ---------- */
function populateSelectors() {
  keySel.innerHTML = "";
  KEYS.forEach((k) => {
    const o = document.createElement("option");
    o.value = k.pc;
    o.textContent = k.name;
    keySel.appendChild(o);
  });
  keySel.value = state.keyPc;

  scaleSel.innerHTML = "";
  THEORY.scales.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.name;
    o.textContent = s.name;
    scaleSel.appendChild(o);
  });
  const idx = THEORY.scales.findIndex((s) => s.name === state.scaleName);
  scaleSel.selectedIndex = idx >= 0 ? idx : 0;

  keySel.onchange = updateScaleMask;
  scaleSel.onchange = updateScaleMask;
}

function updateScaleMask() {
  state.keyPc = parseInt(keySel.value, 10);
  state.scaleName = scaleSel.value;
  const sel = THEORY.scales.find((s) => s.name === state.scaleName);
  if (!sel || !Array.isArray(sel.intervals)) {
    state.keyMask = 0;
    keySel.disabled = true;
  } else {
    keySel.disabled = false;
    state.keyMask = toMask(sel.intervals.map((x) => pc(x + state.keyPc)));
  }
  Piano.draw(document.getElementById("piano"), state);
  Guitar.draw(document.getElementById("fretboard"), state);
}

/* ---------- View switching ---------- */
viewSel.onchange = (e) => setView(e.target.value);
function setView(mode) {
  if (mode === "piano") {
    pianoCard.classList.remove("hidden");
    fretCard.classList.add("hidden");
    mainGrid.classList.add("onecol");
  } else if (mode === "fret") {
    pianoCard.classList.add("hidden");
    fretCard.classList.remove("hidden");
    mainGrid.classList.add("onecol");
  } else {
    pianoCard.classList.remove("hidden");
    fretCard.classList.remove("hidden");
    mainGrid.classList.remove("onecol");
  }
  requestAnimationFrame(() => {
    Piano.draw(document.getElementById("piano"), state);
    Guitar.draw(document.getElementById("fretboard"), state);
  });
}
setView("both");

/* ---------- MIDI ---------- */
let midiAccess = null,
  chosenInput = null,
  lastTs = 0;
function setupMIDI() {
  if (!navigator.requestMIDIAccess) {
    alert("Web MIDI not supported in this browser.");
    return;
  }
  navigator.requestMIDIAccess().then((m) => {
    midiAccess = m;
    refreshInputs();
    midiAccess.onstatechange = refreshInputs;
  });
}
function refreshInputs() {
  midiInSel.innerHTML = "";
  midiAccess.inputs.forEach((port) => {
    const o = document.createElement("option");
    o.value = port.id;
    o.textContent = port.name;
    midiInSel.appendChild(o);
    if (/IAC|Virtual|LoopMIDI/i.test(port.name)) midiInSel.value = port.id;
  });
  chooseInput(midiInSel.value);
}
midiInSel.onchange = (e) => chooseInput(e.target.value);
function chooseInput(id) {
  if (chosenInput) chosenInput.onmidimessage = null;
  chosenInput = midiAccess.inputs.get(id);
  if (chosenInput) chosenInput.onmidimessage = onMIDI;
}
function onMIDI(e) {
  const [st, d1, d2] = e.data,
    cmd = st & 0xf0,
    ts = e.timeStamp;
  latencyText.textContent = `msg Δ=${(ts - lastTs).toFixed(1)}ms`;
  lastTs = ts;
  if (cmd === 0x90 && d2 > 0) {
    state.down.set(d1, d2);
    state.lastNoteMs = performance.now();
  } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
    state.down.delete(d1);
  }
  updateReadouts();
  Piano.draw(document.getElementById("piano"), state);
  Guitar.draw(document.getElementById("fretboard"), state);
}
function updateReadouts() {
  const notes = [...state.down.keys()].sort((a, b) => a - b);
  activeNotes.textContent = JSON.stringify(notes);

  const detail = detectChordDetail(new Set(notes), state.keyPc, state.keyMask);
  if (!detail) {
    chordName.textContent = "—";
    if (bigChordName) bigChordName.textContent = "—";
    return;
  }
  const numeral = romanForChord(
    detail.rootPc,
    detail.quality,
    state.keyPc,
    state.keyMask,
  );
  const inv = detail.inversion ? ` (${detail.inversion})` : "";
  const rn = numeral ? ` — ${numeral}` : "";
  chordName.textContent = detail.label;
  if (bigChordName) bigChordName.textContent = `${detail.label}${inv}${rn}`;
}

/* ---------- Init ---------- */
(async function init() {
  await loadTheory();
  populateSelectors();
  setupMIDI();
  updateScaleMask(); // draws initial views
})();
