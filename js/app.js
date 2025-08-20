/* =========================
   Tonika – app.js (viewported piano + auto‑scroll, UI prefix-aware + recorder wiring)
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
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
/* MIDI → note name (with octave) */
function midiToNoteName(midi, preferFlats = false, withOctave = true) {
  const name = noteName(pc(midi), preferFlats);
  const oct = Math.floor(midi / 12) - 1;
  return withOctave ? `${name}${oct}` : name;
}

/* ---------- Theory (loaded from JSON files) ---------- */
let THEORY = { scales: [], chords: [] };
async function loadTheory() {
  try {
    const [scalesRes, chordsRes] = await Promise.all([
      fetch("theory/scales.json", { cache: "no-store" }),
      fetch("theory/chords.json", { cache: "no-store" }),
    ]);

    const scalesData = await scalesRes.json();
    const chordsData = await chordsRes.json();

    THEORY.scales = scalesData.scales.filter(
      (x) => x && typeof x.name === "string" && "intervals" in x,
    );
    THEORY.chords = chordsData.chords.filter(
      (x) => x && typeof x.name === "string" && Array.isArray(x.intervals),
    );
  } catch (error) {
    console.error("Failed to load theory data:", error);
    // Provide minimal fallback
    THEORY.scales = [{ name: "None (no scale)", intervals: null }];
    THEORY.chords = [{ name: "maj", intervals: [0, 4, 7] }];
  }
}

/* ---------- Professional Jazz Chord Detection ---------- */

/**
 * Analyzes chord structure and returns jazz notation components
 * @param {Set} intervalSet - Set of intervals in the chord
 * @returns {object} - Chord structure analysis
 */
function analyzeChordStructure(intervalSet) {
  const has = (interval) => intervalSet.has(pc(interval));

  // Basic triad analysis
  const hasMinor3 = has(3);
  const hasMajor3 = has(4);
  const hasDim5 = has(6);
  const hasPerfect5 = has(7);
  const hasAug5 = has(8);

  // Seventh analysis
  const hasMinor7 = has(10);
  const hasMajor7 = has(11);
  const hasDim7 = has(9);

  // Extension analysis
  const hasFlat9 = has(1);
  const hasNatural9 = has(2);
  const hasSharp9 = has(3) && hasMajor3; // #9 only if major 3rd present
  const hasNatural11 = has(5);
  const hasSharp11 = has(6) && hasPerfect5; // #11 only if perfect 5th present
  const hasFlat13 = has(8) && hasPerfect5; // b13 only if perfect 5th present
  const hasNatural13 = has(9);

  let symbol = "";
  let quality = "";
  let extensions = [];
  let alterations = [];

  // Determine basic chord type
  if (hasMinor3 && hasDim5 && hasDim7) {
    // Diminished 7th
    symbol = "dim7";
    quality = "diminished";
  } else if (hasMinor3 && hasDim5 && hasMinor7) {
    // Half-diminished 7th
    symbol = "m7b5";
    quality = "half-diminished";
  } else if (hasMinor3 && hasDim5) {
    // Diminished triad
    symbol = "dim";
    quality = "diminished";
  } else if (hasMajor3 && hasAug5) {
    // Augmented
    symbol = "aug";
    quality = "augmented";
    if (hasMinor7) {
      symbol = "7#5";
      quality = "dominant";
    } else if (hasMajor7) {
      symbol = "maj7#5";
      quality = "major";
    }
  } else if (hasMinor3) {
    // Minor chord family
    quality = "minor";
    if (hasMajor7) {
      symbol = "mMaj7";
    } else if (hasMinor7) {
      symbol = "m7";
    } else {
      symbol = "m";
    }
  } else if (hasMajor3) {
    // Major chord family
    quality = "major";
    if (hasMajor7) {
      symbol = "maj7";
    } else if (hasMinor7) {
      symbol = "7";
      quality = "dominant";
    } else {
      symbol = "";
    }
  } else {
    // No third - power chord or sus chord
    if (has(2)) {
      symbol = "sus2";
      quality = "suspended";
    } else if (has(5)) {
      symbol = "sus4";
      quality = "suspended";
    } else {
      symbol = "5";
      quality = "power";
    }
  }

  // Determine highest extension for chord symbol
  let highestExt = "";
  if (hasNatural13 || hasFlat13) {
    highestExt = "13";
  } else if (hasNatural11 || hasSharp11) {
    highestExt = "11";
  } else if (hasNatural9 || hasFlat9 || hasSharp9) {
    highestExt = "9";
  }

  // Apply jazz naming conventions
  if (quality === "dominant" && highestExt) {
    // For dominant chords, replace '7' with highest extension
    symbol = highestExt;
  } else if (quality === "major" && highestExt) {
    // For major chords, add extension to maj7
    if (symbol === "maj7") {
      symbol = "maj" + highestExt;
    }
  } else if (quality === "minor" && highestExt) {
    // For minor chords, add extension to m7
    if (symbol === "m7") {
      symbol = "m" + highestExt;
    } else if (symbol === "mMaj7") {
      symbol = "mMaj" + highestExt;
    }
  }

  // Add alterations (only for chords with extensions)
  if (highestExt) {
    if (hasDim5 && quality === "dominant") alterations.push("b5");
    if (hasSharp11 && quality === "dominant") alterations.push("#11");
    if (hasFlat9) alterations.push("b9");
    if (hasSharp9) alterations.push("#9");
    if (hasFlat13) alterations.push("b13");
  }

  return {
    symbol,
    quality,
    extensions,
    alterations,
  };
}

/**
 * Determines the standard jazz notation name for a chord based on intervals
 * @param {number} rootPc - Root note pitch class (0-11)
 * @param {number[]} intervals - Array of intervals from root
 * @param {number} bassPc - Bass note pitch class
 * @param {boolean} preferFlats - Whether to use flat notation
 * @returns {object} - {name: string, quality: string, extensions: string[]}
 */
function getStandardJazzName(rootPc, intervals, bassPc, preferFlats = false) {
  const rootName = noteName(rootPc, preferFlats);
  const bassName = noteName(bassPc, preferFlats);
  const intervalSet = new Set(intervals.map((i) => pc(i)));

  // Determine basic chord quality
  const chordInfo = analyzeChordStructure(intervalSet);

  // Build standard jazz name
  let chordName = rootName + chordInfo.symbol;

  // Add alterations
  if (chordInfo.alterations.length > 0) {
    chordName += "(" + chordInfo.alterations.join(",") + ")";
  }

  // Add slash bass if needed
  if (bassPc !== rootPc) {
    chordName += "/" + bassName;
  }

  return {
    name: chordName,
    quality: chordInfo.quality,
    extensions: chordInfo.extensions,
    alterations: chordInfo.alterations,
  };
}

/**
 * Enhanced chord detection with professional jazz notation
 * Replaces the existing detectChordDetail function
 */
function detectChordDetail(activeMidiSet, keyPc, keyMask) {
  const midiNotes = [...activeMidiSet].sort((a, b) => a - b);
  if (!midiNotes.length) return null;

  const pcs = pcsFromNotes(activeMidiSet);
  const bassMidi = midiNotes[0];
  const bassPc = pc(bassMidi);

  // Try each note as potential root
  let bestMatch = null;
  let bestScore = -1;

  for (const rootCandidate of pcs) {
    const intervals = pcs
      .map((p) => pc(p - rootCandidate))
      .sort((a, b) => a - b);

    // Score this root candidate
    let score = 0;

    // Prefer root position (bass note = root)
    if (bassPc === rootCandidate) score += 10;

    // Prefer notes in the current key
    if (keyMask && setHas(keyMask, rootCandidate)) score += 5;

    // Prefer common chord structures
    const intervalSet = new Set(intervals);
    if (intervalSet.has(0) && intervalSet.has(4) && intervalSet.has(7))
      score += 8; // Major triad
    if (intervalSet.has(0) && intervalSet.has(3) && intervalSet.has(7))
      score += 8; // Minor triad
    if (intervalSet.has(10) || intervalSet.has(11)) score += 3; // Has 7th
    if (intervalSet.has(2)) score += 2; // Has 9th

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        rootPc: rootCandidate,
        intervals: intervals,
        bassPc: bassPc,
        pcs: pcs,
      };
    }
  }

  if (!bestMatch) return null;

  // Generate jazz notation name
  const preferFlats = keyMask ? preferFlatsForKey(keyPc) : false;
  const jazzName = getStandardJazzName(
    bestMatch.rootPc,
    bestMatch.intervals,
    bestMatch.bassPc,
    preferFlats,
  );

  // Determine inversion
  const relBass = pc(bestMatch.bassPc - bestMatch.rootPc);
  let inversion = null;
  if (relBass !== 0) {
    const intervalSet = new Set(bestMatch.intervals);
    if (relBass === 3 || relBass === 4) inversion = "1st inv";
    else if (relBass === 7 || relBass === 6 || relBass === 8)
      inversion = "2nd inv";
    else if (relBass === 10 || relBass === 11) inversion = "3rd inv";
    else inversion = "slash bass";
  }

  // Generate Roman numeral if in key (future enhancement)
  // const numeral = romanForChord(bestMatch.rootPc, jazzName.quality, keyPc, keyMask);

  return {
    label: jazzName.name,
    rootPc: bestMatch.rootPc,
    bassPc: bestMatch.bassPc,
    inversion: inversion,
    quality: jazzName.quality,
    pcs: bestMatch.pcs,
    extensions: jazzName.extensions,
    alterations: jazzName.alterations,
    // roman: numeral
  };
}

/* ----- Fallback labelling when no chord matches ----- */
function intervalName(semi) {
  const N = [
    "P1",
    "m2",
    "M2",
    "m3",
    "M3",
    "P4",
    "TT",
    "P5",
    "m6",
    "M6",
    "m7",
    "M7",
  ];
  return N[pc(semi)];
}
function pcsToNames(pcs, preferFlats) {
  return pcs.map((p) => noteName(p, preferFlats)).join("–");
}
function fallbackLabelForSet(pcs, bassPc, keyPc, keyMask) {
  const preferFlats = keyMask ? preferFlatsForKey(keyPc) : false;
  if (pcs.length === 1) return `Note: ${noteName(pcs[0], preferFlats)}`;
  if (pcs.length === 2) {
    const root = bassPc,
      other = pcs.find((p) => p !== root) ?? root;
    const iv = intervalName(pc(other - root));
    return `Interval: ${noteName(root, preferFlats)}–${noteName(other, preferFlats)} (${iv})`;
  }
  const ordered = [...pcs].sort((a, b) => a - b);
  return `Cluster: ${pcsToNames(ordered, preferFlats)}`;
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

/* ---------- Theory Analysis Functions ---------- */

/**
 * Update the theory analysis display
 */
function updateTheoryAnalysis(chordResult, keyPc, keyMask) {
  const theoryContainer = document.getElementById("theory-analysis");

  if (!chordResult || keyPc === undefined) {
    // Hide theory analysis when no chord is detected
    if (theoryContainer) {
      theoryContainer.classList.add("hidden");
    }
    return;
  }

  try {
    // Call the theory analysis engine (if available)
    if (window.TheoryAnalysis) {
      const theoryData = window.TheoryAnalysis.analyze(
        chordResult,
        keyPc,
        keyMask,
      );

      // Update Roman numeral
      const romanElement = document.getElementById("roman-numeral");
      updateTheoryElement(romanElement, theoryData.roman || "-");

      // Update chord function
      const functionElement = document.getElementById("chord-function");
      updateTheoryElement(functionElement, theoryData.function || "-");

      // Update available tensions
      const tensionsElement = document.getElementById("available-tensions");
      const tensionsText =
        theoryData.tensions.length > 0 ? theoryData.tensions.join(",") : "-";
      updateTheoryElement(tensionsElement, tensionsText);

      // Update progression (Phase 2 feature - placeholder for now)
      const progressionElement = document.getElementById("progression-pattern");
      updateTheoryElement(progressionElement, theoryData.progression || "-");

      // Show the theory analysis container
      if (theoryContainer) {
        theoryContainer.classList.remove("hidden");
      }
    }
  } catch (error) {
    console.error("Theory analysis error:", error);
    if (theoryContainer) {
      theoryContainer.classList.add("hidden");
    }
  }
}

/**
 * Helper function to update theory elements with animation
 */
function updateTheoryElement(element, newValue) {
  if (!element) return;

  const currentValue = element.textContent;
  if (currentValue !== newValue) {
    element.textContent = newValue;

    // Add update animation
    element.classList.add("updated");
    setTimeout(() => {
      element.classList.remove("updated");
    }, 500);
  }
}

/* ---------- State ---------- */
const state = {
  down: new Map(),
  lastNoteMs: 0,
  keyPc: 0,
  scaleName: "None (no scale)",
  tuning: [40, 45, 50, 55, 59, 64],
  keyMask: 0,
  bassNote: null, // MIDI number of the current bass note for inversion visualization

  /* Piano viewport (zoom): show ~2 octaves by default, centred near middle C (60) */
  pianoView: { offset: 0, keys: 28 }, // filled properly in init()
};

/* ---------- DOM ---------- */
const midiInSel = document.getElementById("midiIn");
const keySel = document.getElementById("keySel");
const scaleSel = document.getElementById("scaleSel");
const tuningSel = document.getElementById("tuningSel");
const chordName = document.getElementById("chordName");
const bigChordName = document.getElementById("bigChordName");
const activeNotes = document.getElementById("activeNotes");
const latencyText = document.getElementById("latencyText");
const viewSel = document.getElementById("viewSel");
const mainGrid = document.getElementById("mainGrid");
const pianoCard = document.getElementById("pianoCard");
const fretCard = document.getElementById("fretCard");
const recStatusEl = document.getElementById("recStatus");
const saveTakesBtn = document.getElementById("saveTakes");
/* NEW: prefix spans for small/big lines */
const smallPrefix = document.getElementById("smallPrefix");
const bigPrefix = document.getElementById("bigPrefix");
/* Canvas refs (used for wheel scrolling) */
const pianoCanvas = document.getElementById("piano");
const fretboardCanvas = document.getElementById("fretboard");

/* --- Settings dialog elements (HTML adds a ⚙︎ button + <dialog>) --- */
const settingsBtn = document.getElementById("settingsBtn");
const settingsDialog = document.getElementById("settingsDialog");
const bigChordScale = document.getElementById("bigChordScale");
const bigChordScaleVal = document.getElementById("bigChordScaleVal");

/* helper to set/hide a prefix */
function setPrefix(el, kind) {
  if (!el) return;
  if (!kind) {
    el.style.visibility = "hidden";
    el.textContent = "";
    return;
  }
  el.style.visibility = "visible";
  el.textContent = `${kind}:`;
}

/* lazy-created single-note badge after "Active notes: []" */
function getSingleNoteSpan() {
  let el = document.getElementById("singleNote");
  if (!el) {
    el = document.createElement("span");
    el.id = "singleNote";
    el.className = "small";
    el.style.marginLeft = "12px";
    activeNotes.parentElement.appendChild(el);
  }
  return el;
}

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
  Piano.draw(pianoCanvas, state, state.pianoView);
  Guitar.draw(fretboardCanvas, state);

  // Update theory analysis when key/scale changes
  const notes = [...state.down.keys()];
  if (notes.length > 0) {
    const chordResult = detectChordDetail(
      new Set(notes),
      state.keyPc,
      state.keyMask,
    );
    updateTheoryAnalysis(chordResult, state.keyPc, state.keyMask);
  }
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
    Piano.draw(pianoCanvas, state, state.pianoView);
    Guitar.draw(fretboardCanvas, state);
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

/* --- viewport helpers --- */
const A0_MIDI = 21;
const TOTAL_KEYS = 88;
function centerViewportAround(midi) {
  const targetOffset = midi - A0_MIDI - Math.floor(state.pianoView.keys * 0.5);
  state.pianoView.offset = clamp(
    targetOffset,
    0,
    TOTAL_KEYS - state.pianoView.keys,
  );
}
function ensurePianoVisible(midi) {
  const start = A0_MIDI + state.pianoView.offset;
  const end = start + state.pianoView.keys - 1;
  if (midi < start + 2 || midi > end - 2) centerViewportAround(midi);
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
    ensurePianoVisible(d1);
    if (window.Recorder) Recorder.onMidi("on", d1, d2, ts);
  } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
    state.down.delete(d1);
    if (window.Recorder) Recorder.onMidi("off", d1, 0, ts);
  }
  updateReadouts();
  Piano.draw(pianoCanvas, state, state.pianoView);
  Guitar.draw(fretboardCanvas, state);
}

/* Optional: trackpad/mouse wheel pan on the piano */
if (pianoCanvas) {
  pianoCanvas.addEventListener(
    "wheel",
    (e) => {
      const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const step = horizontal ? e.deltaX : e.deltaY;
      if (Math.abs(step) < 1) return;
      const deltaKeys = step > 0 ? 3 : -3;
      state.pianoView.offset = clamp(
        state.pianoView.offset + deltaKeys,
        0,
        TOTAL_KEYS - state.pianoView.keys,
      );
      Piano.draw(pianoCanvas, state, state.pianoView);
      e.preventDefault();
    },
    { passive: false },
  );
}

/* ---------- Readouts (prefix-aware) ---------- */
function updateReadouts() {
  const notes = [...state.down.keys()].sort((a, b) => a - b);
  activeNotes.textContent = JSON.stringify(notes);

  let kind = null; // "Chord" | "Note" | "Interval" | "Cluster" | null
  let small = "",
    big = "";

  if (notes.length) {
    const detail = detectChordDetail(
      new Set(notes),
      state.keyPc,
      state.keyMask,
    );
    if (detail) {
      kind = "Chord";
      // Set the bass note for inversion visualization
      state.bassNote =
        detail.bassPc !== undefined
          ? notes.find((n) => pc(n) === detail.bassPc)
          : notes[0];

      const numeral = romanForChord(
        detail.rootPc,
        detail.quality,
        state.keyPc,
        state.keyMask,
      );
      const inv = detail.inversion ? ` (${detail.inversion})` : "";
      const rn = numeral ? ` — ${numeral}` : "";
      small = detail.label;
      big = `${detail.label}${inv}${rn}`;

      // Update theory analysis
      updateTheoryAnalysis(detail, state.keyPc, state.keyMask);
    } else {
      // Clear bass note when no chord is detected
      state.bassNote = null;
      const pcs = pcsFromNotes(new Set(notes));
      const bassPc = pc(notes[0]);
      const fb = fallbackLabelForSet(pcs, bassPc, state.keyPc, state.keyMask);
      const m = fb.match(/^(\w+):\s*(.*)$/);
      if (m) {
        const k = m[1];
        if (k === "Note" || k === "Interval" || k === "Cluster") kind = k;
        small = m[2];
        big = m[2];
      } else {
        kind = "Cluster";
        small = fb;
        big = fb;
      }

      // Hide theory analysis for non-chord content
      updateTheoryAnalysis(null, state.keyPc, state.keyMask);
    }
  } else {
    // Clear bass note when no notes are being played
    state.bassNote = null;

    // Hide theory analysis when no notes are playing
    updateTheoryAnalysis(null, state.keyPc, state.keyMask);
  }
  setPrefix(smallPrefix, kind);
  setPrefix(bigPrefix, kind);
  chordName.textContent = small || "—";
  if (bigChordName) bigChordName.textContent = big || "—";

  // Single-note helper beside "Active notes"
  const singleEl = getSingleNoteSpan();
  if (notes.length === 1) {
    const preferFlats = state.keyMask ? preferFlatsForKey(state.keyPc) : false;
    singleEl.textContent = `• Note: ${midiToNoteName(notes[0], preferFlats, true)}`;
  } else {
    singleEl.textContent = "";
  }
}

/* ---------- Settings handling (big chord scale) ---------- */
function applyBigChordScale(v) {
  const num = Math.max(0.6, Math.min(1.6, parseFloat(v) || 1));
  document.documentElement.style.setProperty("--bigChordScale", num);
  if (bigChordScale) bigChordScale.value = String(num);
  if (bigChordScaleVal)
    bigChordScaleVal.textContent = `${Math.round(num * 100)}%`;
  try {
    localStorage.setItem("tonika.bigChordScale", String(num));
  } catch {}
}
function wireSettings() {
  if (settingsBtn && settingsDialog) {
    settingsBtn.addEventListener("click", () => {
      const saved = localStorage.getItem("tonika.bigChordScale");
      applyBigChordScale(saved || bigChordScale?.value || 1);
      settingsDialog.showModal();
    });
  }
  if (bigChordScale) {
    bigChordScale.addEventListener("input", (e) =>
      applyBigChordScale(e.target.value),
    );
  }
}

/* ---------- Debugging Helper ---------- */
function debugTheoryAnalysis() {
  console.log("=== Theory Analysis Debug ===");
  console.log("Current key PC:", state.keyPc);
  console.log("Current key mask:", state.keyMask);
  console.log("Active MIDI notes:", [...state.down.keys()]);

  const notes = [...state.down.keys()];
  if (notes.length > 0) {
    const chordResult = detectChordDetail(
      new Set(notes),
      state.keyPc,
      state.keyMask,
    );
    console.log("Chord result:", chordResult);

    if (chordResult && window.TheoryAnalysis) {
      const theoryData = window.TheoryAnalysis.analyze(
        chordResult,
        state.keyPc,
        state.keyMask,
      );
      console.log("Theory analysis:", theoryData);
    }
  }
}

/* ---------- Init ---------- */
(async function init() {
  await loadTheory();
  populateSelectors();

  // center ~4.5 octaves around middle C (60)
  state.pianoView.keys = 56;
  state.pianoView.offset = clamp(
    60 - 21 - Math.floor(state.pianoView.keys / 2),
    0,
    88 - state.pianoView.keys,
  );

  // Settings: apply saved scale and wire dialog
  const savedScale = localStorage.getItem("tonika.bigChordScale");
  applyBigChordScale(savedScale || 1);
  wireSettings();

  setupMIDI();
  updateScaleMask();

  // Initialize the recorder (if script is present in HTML)
  if (window.Recorder) {
    const statusEl = recStatusEl,
      saveBtn = saveTakesBtn;
    window.Recorder.init({ statusEl, saveBtn, silenceMs: 2500 });
  }

  // Initialize theory analysis display as hidden
  const theoryContainer = document.getElementById("theory-analysis");
  if (theoryContainer) {
    theoryContainer.classList.add("hidden");
  }
})();
