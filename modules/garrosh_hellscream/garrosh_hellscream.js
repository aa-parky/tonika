/*!
 * Garrosh Hellscream VU Meter — Standalone Script
 * Moves inline logic from garrosh_hellscream.html into this file.
 * Self-contained: tries to locate Tonika core (tonika-bus, jackonika)
 * and animates a simple VU needle on incoming MIDI note-on events.
 */

(function () {
  "use strict";

  // --- tiny script loader -------------------------------------------------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error("Failed: " + src));
      document.head.appendChild(s);
    });
  }

  async function ensureTonikaCore() {
    // if already present, nothing to do
    if (window.Tonika && Tonika.Bus && Tonika.Jackonika) return;

    // candidates relative to common layouts
    const coreCandidates = [
      // typical when opened from modules/<slug> inside repo root
      "../../js/core/tonika-bus.js",
      "../../js/core/jackonika.js",

      // fallback if someone moved the folder
      "../js/core/tonika-bus.js",
      "../js/core/jackonika.js",

      // absolute root (served from repo root)
      "/js/core/tonika-bus.js",
      "/js/core/jackonika.js"
    ];

    // load in order: bus first, then jackonika
    const orderedGroups = [
      coreCandidates.filter(p => p.includes("tonika-bus")),
      coreCandidates.filter(p => p.includes("jackonika"))
    ];

    for (const group of orderedGroups) {
      let loaded = false;
      for (const src of group) {
        try { await loadScript(src); loaded = true; break; } catch {}
      }
      if (!loaded) {
        throw new Error("Could not locate " + (group[0].includes("bus") ? "tonika-bus.js" : "jackonika.js"));
      }
    }
  }

  // --- main ---------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    const midiStateEl = document.getElementById("midi-state");
    const velEl = document.getElementById("vel");
    const needle = document.querySelector(".garrosh-hellscream-needle");

    const secure = location.protocol === "https:" || location.hostname === "localhost";
    if (!secure && midiStateEl) {
      midiStateEl.textContent = "serve over https or localhost for WebMIDI";
    }

    try {
      await ensureTonikaCore();
    } catch (e) {
      console.error(e);
      if (midiStateEl) midiStateEl.textContent = "Tonika core not found (see console)";
      return;
    }

    // init Jackonika (global MIDI)
    try {
      new Tonika.Jackonika({ mode: "all" });
      if (midiStateEl) midiStateEl.textContent = "waiting for input… (allow MIDI access)";
    } catch (e) {
      console.error("Jackonika failed:", e);
      if (midiStateEl) midiStateEl.textContent = "Jackonika failed to init (see console)";
    }

    // animation with attack/decay
    let currentValue = 0, targetValue = 0;
    const minAngle = -45, maxAngle = 45;
    const attack = 0.40, decay = 0.02;

    const toAngle = v => minAngle + (v / 127) * (maxAngle - minAngle);

    function animate() {
      if (currentValue < targetValue) {
        currentValue += (targetValue - currentValue) * attack;
      } else {
        currentValue += (targetValue - currentValue) * decay;
      }
      targetValue *= 0.97;
      if (needle) needle.style.transform = `rotate(${toAngle(currentValue)}deg)`;
      requestAnimationFrame(animate);
    }
    animate();

    // MIDI listener
    Tonika.Bus.addEventListener("midi:noteon", (ev) => {
      const { velocity = 0 } = ev.detail || {};
      targetValue = Math.max(targetValue, velocity);
      if (velEl) velEl.textContent = velocity.toFixed(0);
      if (midiStateEl) midiStateEl.textContent = "receiving MIDI…";
    });

    // keyboard test
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "v") {
        Tonika.Bus.dispatchEvent(new CustomEvent("midi:noteon", {
          detail: { midi: 60, velocity: 110, channel: 1 }
        }));
      }
    });
  });
})();
