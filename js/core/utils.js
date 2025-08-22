// js/core/utils.js
(function () {
  const { NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, FLAT_KEYS } =
    window.Core.Constants;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pc = (m) => ((m % 12) + 12) % 12;
  const toMask = (arr) => arr.reduce((m, p) => m | (1 << pc(p)), 0);
  const setHas = (mask, v) => (mask & (1 << v)) !== 0;

  function preferFlatsForKey(keyName) {
    return FLAT_KEYS.has(keyName);
  }

  function noteNameFromPc(p, preferFlats = false) {
    return (preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP)[pc(p)];
  }

  function midiToNoteName(m, preferFlats = false, withOctave = false) {
    const name = noteNameFromPc(m, preferFlats);
    if (!withOctave) return name;
    const octave = Math.floor(m / 12) - 1;
    return `${name}${octave}`;
  }

  window.Core = window.Core || {};
  window.Core.Utils = {
    clamp,
    pc,
    toMask,
    setHas,
    preferFlatsForKey,
    noteNameFromPc,
    midiToNoteName,
  };
})();
