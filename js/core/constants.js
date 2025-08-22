// js/core/constants.js
(function () {
  const NOTE_NAMES_SHARP = [
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
  const NOTE_NAMES_FLAT = [
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

  // Piano range used by the UI
  const TOTAL_KEYS = 88;
  const FIRST_MIDI = 21; // A0
  const LAST_MIDI = 108; // C8

  // Keys/scales where flats are typically preferred
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

  window.Core = window.Core || {};
  window.Core.Constants = {
    NOTE_NAMES_SHARP,
    NOTE_NAMES_FLAT,
    TOTAL_KEYS,
    FIRST_MIDI,
    LAST_MIDI,
    FLAT_KEYS,
  };
})();
