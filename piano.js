// piano.js – keyboard geometry + rendering
// Exposes: window.Piano.draw(canvas, state)
// state needs: { keyMask:number, keyPc:number, down:Map<midi,vel> }

(function (global) {
  const Piano = {};

  // Draw an 88-key piano with real geometry (52 whites; blacks centered).
  Piano.draw = function drawPiano(canvas, state) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const WHITE_COUNT = 52;
    const wW = W / WHITE_COUNT,
      wH = H,
      bW = wW * 0.6,
      bH = H * 0.62;
    const OCT_WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B

    const whites = [];
    const blacks = [];
    let wi = 0;

    // Build key layout from MIDI A0..C8 (21..108)
    for (let midi = 21; midi <= 108; midi++) {
      const npc = ((midi % 12) + 12) % 12;
      if (OCT_WHITE_PCS.includes(npc)) {
        const x = wi * wW;
        whites.push({ midi, npc, x, w: wW, h: wH });

        // E and B have no sharps
        const noSharp = npc === 4 || npc === 11;
        if (!noSharp && midi + 1 <= 108) {
          const xCenter = x + wW;
          blacks.push({
            midi: midi + 1,
            npc: (((midi + 1) % 12) + 12) % 12,
            x: xCenter - bW / 2,
            w: bW,
            h: bH,
          });
        }
        wi++;
      }
    }

    function fillKey(npc, midi, x, y, w, h, baseColor) {
      // base key fill
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, w, h);

      // solid root/scale (only when a scale is active)
      if (state.keyMask) {
        const inScale = (state.keyMask & (1 << npc)) !== 0;
        const isRoot = npc === state.keyPc;
        if (isRoot) {
          ctx.fillStyle = "#f5b041";
          ctx.fillRect(x, y, w, h);
        } else if (inScale) {
          ctx.fillStyle = "#58d68d";
          ctx.fillRect(x, y, w, h);
        }
      }

      // pressed overlay
      if (state.down && state.down.has(midi)) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "#6aa0ff";
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      }

      // outline
      ctx.strokeStyle = baseColor === "#fff" ? "#444" : "#222";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    // whites first (full height) then blacks (shorter) on top
    for (const k of whites) fillKey(k.npc, k.midi, k.x, 0, k.w, k.h, "#fff");
    for (const k of blacks) fillKey(k.npc, k.midi, k.x, 0, k.w, k.h, "#111");
  };

  global.Piano = Piano;
})(window);
