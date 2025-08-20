// guitar.js – fretboard rendering
// Exposes: window.Guitar.draw(canvas, state, opts)
// state needs: { tuning:number[], keyMask:number, keyPc:number, down:Map<midi,vel> }

(function (global) {
  const Guitar = {};
  const FRETS = 24;

  Guitar.draw = function drawFretboard(canvas, state, opts = {}) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const margin = 30,
      top = 20,
      bottom = H - 20;
    const usableW = W - margin * 2,
      usableH = bottom - top;
    const sx = (f) => margin + (f / FRETS) * usableW;
    const sy = (s) => top + (s / (state.tuning.length - 1)) * usableH;

    // frets
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    for (let f = 0; f <= FRETS; f++) {
      const x = sx(f);
      ctx.beginPath();
      ctx.moveTo(x, top - 8);
      ctx.lineTo(x, bottom + 8);
      ctx.stroke();
    }

    // strings
    for (let s = 0; s < state.tuning.length; s++) {
      const y = sy(s);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2 - s * 0.15;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(W - margin, y);
      ctx.stroke();
    }

    // inlays
    const inlays = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
    inlays.forEach((f) => {
      const x = sx(f - 0.5),
        r = f === 12 || f === 24 ? 5 : 4;
      const ys =
        f === 12 || f === 24
          ? [(top + bottom) / 2 - 10, (top + bottom) / 2 + 10]
          : [(top + bottom) / 2];
      ctx.fillStyle = "#333";
      ys.forEach((y) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // dots for playable notes (scale = green, pressed pitch-classes = blue; root ring = amber)
    const pressedPcs = new Set(
      [...(state.down?.keys() || [])].map((n) => ((n % 12) + 12) % 12),
    );
    for (let s = 0; s < state.tuning.length; s++) {
      const open = state.tuning[s];
      for (let f = 0; f <= FRETS; f++) {
        const m = open + f,
          npc = ((m % 12) + 12) % 12;
        const inScale = state.keyMask && (state.keyMask & (1 << npc)) !== 0;
        const isRoot = state.keyMask && npc === state.keyPc;
        const isPressedPc = pressedPcs.has(npc);
        const isBassNote = state.bassNote && m === state.bassNote;

        if (inScale || isPressedPc) {
          const x = sx(f),
            y = sy(s);
          ctx.beginPath();
          ctx.arc(x, y, isPressedPc ? 7 : 5, 0, Math.PI * 2);
          ctx.fillStyle = isPressedPc ? "#6aa0ff" : "#58d68d";
          ctx.fill();

          // Bass note border (orange border for bass notes in chords)
          if (isBassNote && isPressedPc) {
            ctx.strokeStyle = "#f5b041"; // Orange border
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Root note ring (existing logic, but only if not already showing bass border)
          if (isRoot && !(isBassNote && isPressedPc)) {
            ctx.strokeStyle = "#f5b041";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }
  };

  global.Guitar = Guitar;
})(window);
