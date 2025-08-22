/**
 * Legacy Piano Renderer for Tonika
 * Provides window.Piano.draw function expected by piano-bridge.js
 */

(function () {
  "use strict";

  // Utility functions
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

      // Colors for dark theme
      this.colors = {
        white: "#ffffff",
        black: "#111111",
        whiteOutline: "#444444",
        blackOutline: "#222222",
        scale: "#58d68d",
        pressed: "#1e3a8a",
        root: "#f43f5e",
        label: "#b9c1c9",
        highlight: "#6aa0ff",
      };
    }

    // Calculate the white key index for any MIDI note (relative to A0)
    getWhiteKeyIndex(midi) {
      // Count white keys from A0 (MIDI 21) to this note
      let whiteCount = 0;
      for (let m = this.A0; m < midi; m++) {
        if (isWhite(m)) {
          whiteCount++;
        }
      }
      return whiteCount;
    }

    getBlackKeyPosition(midi) {
      const noteInOctave = pc(midi);

      switch (noteInOctave) {
        case 1:
          return { leftWhiteNote: 0, rightWhiteNote: 2 }; // C#
        case 3:
          return { leftWhiteNote: 2, rightWhiteNote: 4 }; // D#
        case 6:
          return { leftWhiteNote: 5, rightWhiteNote: 7 }; // F#
        case 8:
          return { leftWhiteNote: 7, rightWhiteNote: 9 }; // G#
        case 10:
          return { leftWhiteNote: 9, rightWhiteNote: 11 }; // A#
        default:
          return null;
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

    draw(canvas, state, view) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width;
      const H = canvas.height;

      // Determine viewport range
      let startMidi = this.A0;
      let endMidi = this.C8;
      if (view) {
        // view.offset is already relative to A0 (converted by piano-bridge.js)
        startMidi = this.A0 + view.offset;
        endMidi = startMidi + view.keys - 1;
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
      // Key insight: position based on the white key's index within the visible range
      const whiteKeys = whiteMidi.map((midi, i) => ({
        midi,
        x: i * whiteW,
        width: whiteW,
      }));

      // Create a lookup map for quick access to white key positions by MIDI note
      const whiteKeyMap = new Map();
      whiteKeys.forEach((key) => {
        whiteKeyMap.set(key.midi, key);
      });

      ctx.clearRect(0, 0, W, H);

      // Draw white keys first
      whiteKeys.forEach((key) => {
        const n = pc(key.midi);

        // Base white key
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.colors.white;
        ctx.fillRect(key.x, 0, key.width, H);

        // Scale tint (using keyMask from state)
        if (state.keyMask && state.keyMask & (1 << n)) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = this.colors.scale;
          ctx.fillRect(key.x, 0, key.width, H);
          ctx.globalAlpha = 1;
        }

        // Root tint (using keyPc from state)
        if (state.keyMask && n === state.keyPc) {
          ctx.globalAlpha = 0.32;
          ctx.fillStyle = this.colors.root;
          ctx.fillRect(key.x, 0, key.width, H);
          ctx.globalAlpha = 1;
        }

        // Pressed overlay (using down set from state)
        if (state.down && state.down.has(key.midi)) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = this.colors.pressed;
          ctx.fillRect(key.x, 0, key.width, H);
          ctx.globalAlpha = 1;

          // Root note ring
          if (state.keyMask && n === state.keyPc) {
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
        const octave = Math.floor(midi / 12);
        const leftWhiteMidi = octave * 12 + blackPos.leftWhiteNote;
        const rightWhiteMidi = octave * 12 + blackPos.rightWhiteNote;

        // Find these white keys in our visible white keys using the map
        const leftWhiteKey = whiteKeyMap.get(leftWhiteMidi);
        const rightWhiteKey = whiteKeyMap.get(rightWhiteMidi);

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
        if (state.keyMask && state.keyMask & (1 << n)) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = this.colors.scale;
          ctx.fillRect(blackX, 0, blackW, blackH);
          ctx.globalAlpha = 1;
        }

        // Root tint
        if (state.keyMask && n === state.keyPc) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = this.colors.root;
          ctx.fillRect(blackX, 0, blackW, blackH);
          ctx.globalAlpha = 1;
        }

        // Pressed overlay
        if (state.down && state.down.has(midi)) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = this.colors.pressed;
          ctx.fillRect(blackX, 0, blackW, blackH);
          ctx.globalAlpha = 1;

          // Root note ring
          if (state.keyMask && n === state.keyPc) {
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

      // Draw C labels (always show them for now)
      this.drawCLabels(ctx, whiteKeys, whiteW, H);
    }
  }

  // Create global Piano object
  const renderer = new PianoRenderer();

  window.Piano = {
    draw: function (canvas, state, view) {
      renderer.draw(canvas, state, view);
    },
  };
})();
