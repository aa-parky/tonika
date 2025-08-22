// js/core/state.js
(function () {
  const { FIRST_MIDI, TOTAL_KEYS } = window.Core.Constants;

  function createInitialState() {
    return {
      // notes currently held (midi -> velocity)
      down: new Map(),

      // key/scale overlays
      keyPc: undefined,
      keyMask: 0,
      scaleMask: 0,

      // UI prefs
      preferFlats: false,
      showTheoryExplanations: false,

      // piano viewport
      pianoView: {
        offset: 0, // 0..(TOTAL_KEYS - keys)
        keys: TOTAL_KEYS, // visible key count (white+black as used by your UI)
        anchorMidi: FIRST_MIDI,
      },

      // perf + misc
      lastNoteMs: 0,
    };
  }

  window.Core = window.Core || {};
  window.Core.State = {
    create: createInitialState,
  };
})();
