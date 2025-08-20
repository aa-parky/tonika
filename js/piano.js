// piano.js — Tonika (completely rewritten with proper piano layout)
// Black keys positioned correctly between white keys as on a real piano

(function () {
  const A0 = 21; // MIDI A0
  const LAST = 108; // MIDI C8

  // Colors
  const COL_WHITE = "#ffffff";
  const COL_BLACK = "#111111";
  const COL_OUT_W = "#444444";
  const COL_OUT_B = "#222222";
  const COL_SCALE = "#58d68d";
  const COL_PRESSED = "#1e3a8a";
  const COL_ROOT = "#f43f5e";
  const COL_LABEL = "#b9c1c9";

  // Helper functions
  const pc = (n) => ((n % 12) + 12) % 12;
  const isBlack = (midi) => {
    const p = pc(midi);
    return p === 1 || p === 3 || p === 6 || p === 8 || p === 10; // C# D# F# G# A#
  };
  const isWhite = (midi) => !isBlack(midi);
  const midiOct = (m) => Math.floor(m / 12) - 1;

  // Piano layout: defines the pattern of white and black keys
  // In each octave: C C# D D# E F F# G G# A A# B
  // White keys: C D E F G A B (7 per octave)
  // Black keys: C# D# F# G# A# (5 per octave)
  // Black key positions relative to white keys:
  // C# between C(0) and D(1)
  // D# between D(1) and E(2)
  // F# between F(3) and G(4)
  // G# between G(4) and A(5)
  // A# between A(5) and B(6)

  function getWhiteKeyIndex(midi) {
    // Convert MIDI note to white key index (0-based)
    const octave = Math.floor((midi - 12) / 12); // C4 = octave 4
    const noteInOctave = pc(midi);

    let whiteIndexInOctave;
    switch (noteInOctave) {
      case 0:
        whiteIndexInOctave = 0;
        break; // C
      case 2:
        whiteIndexInOctave = 1;
        break; // D
      case 4:
        whiteIndexInOctave = 2;
        break; // E
      case 5:
        whiteIndexInOctave = 3;
        break; // F
      case 7:
        whiteIndexInOctave = 4;
        break; // G
      case 9:
        whiteIndexInOctave = 5;
        break; // A
      case 11:
        whiteIndexInOctave = 6;
        break; // B
      default:
        return -1; // Not a white key
    }

    return octave * 7 + whiteIndexInOctave;
  }

  function getBlackKeyPosition(midi) {
    // Returns the position info for a black key
    const noteInOctave = pc(midi);

    switch (noteInOctave) {
      case 1: // C#
        return { leftWhiteNote: 0, rightWhiteNote: 2, offset: 0.75 }; // Between C and D, closer to D
      case 3: // D#
        return { leftWhiteNote: 2, rightWhiteNote: 4, offset: 0.25 }; // Between D and E, closer to D
      case 6: // F#
        return { leftWhiteNote: 5, rightWhiteNote: 7, offset: 0.75 }; // Between F and G, closer to G
      case 8: // G#
        return { leftWhiteNote: 7, rightWhiteNote: 9, offset: 0.5 }; // Between G and A, centered
      case 10: // A#
        return { leftWhiteNote: 9, rightWhiteNote: 11, offset: 0.25 }; // Between A and B, closer to A
      default:
        return null; // Not a black key
    }
  }

  function drawCLabels(ctx, whiteKeys, whiteW, H) {
    const fontPx = Math.max(10, Math.floor(whiteW * 0.8));
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = COL_LABEL;
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 1;
    ctx.shadowOffsetY = 1;

    whiteKeys.forEach((key, i) => {
      if (pc(key.midi) === 0) {
        // Only label C notes
        const cx = key.x + whiteW / 2;
        ctx.fillText(`C${midiOct(key.midi)}`, cx, H - 3);
      }
    });

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  function draw(canvas, state, pianoView) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // Determine viewport range
    let startMidi = A0;
    let endMidi = LAST;
    if (
      pianoView &&
      typeof pianoView.offset === "number" &&
      typeof pianoView.keys === "number"
    ) {
      startMidi = A0 + pianoView.offset;
      endMidi = startMidi + pianoView.keys - 1;
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
    const blackW = whiteW * 0.6; // Black keys are 60% of white key width

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
      ctx.fillStyle = COL_WHITE;
      ctx.fillRect(key.x, 0, key.width, H);

      // Scale tint
      if (state.keyMask && state.keyMask & (1 << n)) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = COL_SCALE;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;
      }

      // Root tint
      if (state.keyMask && n === state.keyPc) {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = COL_ROOT;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;
      }

      // Pressed overlay
      if (state.down && state.down.has(key.midi)) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = COL_PRESSED;
        ctx.fillRect(key.x, 0, key.width, H);
        ctx.globalAlpha = 1;

        // Bass note border (orange border for bass notes in chords)
        if (state.bassNote && key.midi === state.bassNote) {
          ctx.strokeStyle = "#f5b041"; // Orange border
          ctx.lineWidth = 4;
          ctx.strokeRect(
            Math.floor(key.x) + 2,
            2,
            Math.ceil(key.width) - 4,
            H - 4,
          );
        }
      }

      // Border
      ctx.strokeStyle = COL_OUT_W;
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
      const blackPos = getBlackKeyPosition(midi);
      if (!blackPos) return;

      // Find the white keys this black key should be positioned between
      const octave = Math.floor((midi - 12) / 12);
      const leftWhiteMidi = octave * 12 + 12 + blackPos.leftWhiteNote;
      const rightWhiteMidi = octave * 12 + 12 + blackPos.rightWhiteNote;

      // Find these white keys in our visible white keys
      const leftWhiteKey = whiteKeys.find((k) => k.midi === leftWhiteMidi);
      const rightWhiteKey = whiteKeys.find((k) => k.midi === rightWhiteMidi);

      if (!leftWhiteKey || !rightWhiteKey) return; // Not both visible

      // Calculate black key position
      const leftEdge = leftWhiteKey.x + leftWhiteKey.width;
      const rightEdge = rightWhiteKey.x;
      const gap = rightEdge - leftEdge;
      const blackX = leftEdge + (gap - blackW) / 2;

      // Draw black key
      ctx.globalAlpha = 1;
      ctx.fillStyle = COL_BLACK;
      ctx.fillRect(blackX, 0, blackW, blackH);

      // Scale tint
      if (state.keyMask && state.keyMask & (1 << n)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = COL_SCALE;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;
      }

      // Root tint
      if (state.keyMask && n === state.keyPc) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = COL_ROOT;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;
      }

      // Pressed overlay
      if (state.down && state.down.has(midi)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = COL_PRESSED;
        ctx.fillRect(blackX, 0, blackW, blackH);
        ctx.globalAlpha = 1;

        // Bass note border (orange border for bass notes in chords)
        if (state.bassNote && midi === state.bassNote) {
          ctx.strokeStyle = "#f5b041"; // Orange border
          ctx.lineWidth = 3;
          ctx.strokeRect(
            Math.floor(blackX) + 1,
            1,
            Math.ceil(blackW) - 2,
            blackH - 2,
          );
        }
      }

      // Border
      ctx.strokeStyle = COL_OUT_B;
      ctx.strokeRect(
        Math.floor(blackX) + 0.5,
        0.5,
        Math.ceil(blackW) - 1,
        blackH - 1,
      );
    });

    // Draw C labels
    drawCLabels(ctx, whiteKeys, whiteW, H);
  }

  window.Piano = { draw };
})();
