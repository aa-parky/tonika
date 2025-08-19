// piano.js — Tonika (full 88-key, correct geometry)
// Whites evenly spaced; blacks centered between true neighbor whites.
// Draw order: whites (full height) -> blacks (short) -> C labels (bottom).

(function () {
  const A0 = 21; // MIDI A0
  const LAST = 108; // MIDI C8
  const PITCHES = Array.from({ length: LAST - A0 + 1 }, (_, i) => A0 + i);

  // Colours
  const COL_WHITE = "#ffffff";
  const COL_BLACK = "#111111";
  const COL_OUT_W = "#444444";
  const COL_OUT_B = "#222222";
  const COL_SCALE = "#58d68d";
  const COL_PRESSED = "#6aa0ff";
  const COL_ROOT = "#f5b041";
  const COL_LABEL = "#b9c1c9";

  // Helpers
  const pc = (n) => ((n % 12) + 12) % 12;
  const isBlackPc = (p) => p === 1 || p === 3 || p === 6 || p === 8 || p === 10; // C# D# F# G# A#
  const isWhite = (m) => !isBlackPc(pc(m));
  const midiOct = (m) => Math.floor(m / 12) - 1;

  // Pre-split lists (order preserved)
  const WHITES = PITCHES.filter(isWhite);
  const BLACKS = PITCHES.filter((m) => !isWhite(m));

  // Map each black MIDI note to indices of its neighbor whites within WHITES
  // (left is the last white < m; right is the first white > m)
  const neighborWhiteIndex = (() => {
    const idxByMidi = new Map();
    WHITES.forEach((m, i) => idxByMidi.set(m, i));
    const map = new Map();
    for (const m of BLACKS) {
      // scan left/right once (small arrays: 52 whites)
      let leftIdx = -1,
        rightIdx = -1;
      // left white: greatest white < m
      for (let i = WHITES.length - 1; i >= 0; i--) {
        if (WHITES[i] < m) {
          leftIdx = i;
          break;
        }
      }
      // right white: smallest white > m
      for (let i = 0; i < WHITES.length; i++) {
        if (WHITES[i] > m) {
          rightIdx = i;
          break;
        }
      }
      map.set(m, { leftIdx, rightIdx });
    }
    return map;
  })();

  function drawCLabels(ctx, whiteX, whiteW, H) {
    const fontPx = Math.max(10, Math.floor(whiteW * 0.8));
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = COL_LABEL;
    ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 1;
    ctx.shadowOffsetY = 1;

    for (let i = 0; i < WHITES.length; i++) {
      const m = WHITES[i];
      if (pc(m) !== 0) continue; // label only C notes
      const cx = whiteX[i] + whiteW / 2;
      ctx.fillText(`C${midiOct(m)}`, cx, H - 3);
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  function draw(canvas, state) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // --- Layout (whites drive geometry) ---
    const whiteCount = WHITES.length; // 52
    const whiteW = W / whiteCount;
    const blackH = Math.floor(H * 0.62);

    // x position for each white (in order)
    const whiteX = new Array(whiteCount);
    let x = 0;
    for (let i = 0; i < whiteCount; i++) {
      whiteX[i] = x;
      x += whiteW;
    }

    ctx.clearRect(0, 0, W, H);

    // --- 1) Whites first (full height) ---
    for (let i = 0; i < whiteCount; i++) {
      const m = WHITES[i];
      const n = pc(m);
      const xw = whiteX[i];

      // base white
      ctx.globalAlpha = 1;
      ctx.fillStyle = COL_WHITE;
      ctx.fillRect(xw, 0, whiteW, H);

      // scale tint
      if (state.keyMask && state.keyMask & (1 << n)) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = COL_SCALE;
        ctx.fillRect(xw, 0, whiteW, H);
        ctx.globalAlpha = 1;
      }
      // root tint
      if (state.keyMask && n === state.keyPc) {
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = COL_ROOT;
        ctx.fillRect(xw, 0, whiteW, H);
        ctx.globalAlpha = 1;
      }
      // pressed overlay
      if (state.down && state.down.has(m)) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = COL_PRESSED;
        ctx.fillRect(xw, 0, whiteW, H);
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = COL_OUT_W;
      ctx.strokeRect(Math.floor(xw) + 0.5, 0.5, Math.ceil(whiteW) - 1, H - 1);
    }

    // --- 2) Blacks (short, centered between true neighbor whites) ---
    for (const m of BLACKS) {
      const n = pc(m);
      const nb = neighborWhiteIndex.get(m);
      if (!nb) continue;

      // If viewport ever crops extremes (A0/C8), guard ends:
      let iL = Math.max(0, nb.leftIdx);
      let iR = Math.min(whiteCount - 1, nb.rightIdx);
      if (iL < 0 || iR < 0 || iL === iR) continue;

      const xL = whiteX[iL];
      const xR = whiteX[iR];
      const gap = xR - xL;
      const bw = gap * 0.7; // ≈ 70% of the gap
      const bx = xL + (gap - bw) / 2;

      ctx.globalAlpha = 1;
      ctx.fillStyle = COL_BLACK;
      ctx.fillRect(bx, 0, bw, blackH);

      if (state.keyMask && state.keyMask & (1 << n)) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = COL_SCALE;
        ctx.fillRect(bx, 0, bw, blackH);
        ctx.globalAlpha = 1;
      }
      if (state.keyMask && n === state.keyPc) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = COL_ROOT;
        ctx.fillRect(bx, 0, bw, blackH);
        ctx.globalAlpha = 1;
      }
      if (state.down && state.down.has(m)) {
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = COL_PRESSED;
        ctx.fillRect(bx, 0, bw, blackH);
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = COL_OUT_B;
      ctx.strokeRect(Math.floor(bx) + 0.5, 0.5, Math.ceil(bw) - 1, blackH - 1);
    }

    // --- 3) C labels at bottom ---
    drawCLabels(ctx, whiteX, whiteW, H);
  }

  window.Piano = { draw };
})();
