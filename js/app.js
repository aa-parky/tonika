import { bus } from "./core/event-bus.js";
import { createStore } from "./core/store.js";
import { settings } from "./services/settings.js";
import { midi } from "./services/midi.js";
import { bootSupport } from "./features/support.js";
import { getQueryBool } from "./core/url.js";
import { mountPianoBridge } from "./features/piano-bridge.js";
import { mountPianoControls } from "./ui/piano-controls.js";

window.Tonika2 = {
  version: "0.3.4-solo-piano",
  bus,
  store: createStore({ ready: false, settings: settings.all }),
  settings,
  midi,
  bridges: {},
  ui: {},
};

(function boot() {
  document.documentElement.dataset.tonika = "modular";
  const { store } = window.Tonika2;
  settings.subscribe((next) => store.set({ settings: next }));

  midi.init();

  const q = getQueryBool("support", null);
  if (q !== null) settings.update({ support: { showDevtools: !!q } });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startUI);
  } else startUI();

  function startUI() {
    bootSupport();

    const canvas = document.getElementById("piano-canvas");
    if (canvas) {
      const bridge = mountPianoBridge({ canvas });
      window.Tonika2.bridges.piano = bridge;

      const host = document.getElementById("piano-wrap");
      window.Tonika2.ui.pianoControls = mountPianoControls({
        target: host,
        onViewChange: (view) => bridge.setView(view),
        onLayoutChange: (layout) => bridge.setLayout(layout),
      });
    }

    bus.emit("core:ready");
    store.set({ ready: true });
    console.log(
      "%cTonika2 ready (Stage 3.4: solo piano)",
      "padding:2px 6px;background:#111;color:#9cf;border-radius:4px;",
      window.Tonika2,
    );
  }
})();
