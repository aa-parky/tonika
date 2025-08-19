// recorder.js
// Tonika – lightweight always-on MIDI recorder (auto-start, auto-stop-on-silence)
// Exposes a global `Recorder` with init/onMidi/getTakes/exportJSON/clear,
// and dispatches 'recorder:take' / 'recorder:takeschanged' CustomEvents.

(function (global) {
  const Recorder = {
    SILENCE_MS: 2500,
    active: false,
    startTime: 0,
    current: [],
    takes: [],
    silenceTimer: null,
    statusEl: null,
    saveBtn: null,

    init({ statusEl, saveBtn, silenceMs } = {}) {
      this.statusEl = statusEl || null;
      this.saveBtn = saveBtn || null;
      if (typeof silenceMs === "number") this.SILENCE_MS = silenceMs;
      this._setUI(false);

      if (this.saveBtn) {
        this.saveBtn.onclick = () => this.exportJSON();
      }
    },

    onMidi(type, midi, vel, ts) {
      // type: "on" | "off" | "raw"
      if (type !== "on" && type !== "off" && type !== "raw") return;

      if (!this.active) this._start(ts);
      const t = +(ts - this.startTime).toFixed(1);
      this.current.push({ type, midi, vel, t });
      this._armSilence();
    },

    // ----- session helpers -----
    getTakes() {
      return this.takes.slice();
    },

    clear() {
      this.current = [];
      this.takes = [];
      this._setUI(false);
      window.dispatchEvent(new CustomEvent("recorder:takeschanged"));
    },

    // Export ALL takes as one JSON file
    exportJSON() {
      const data = JSON.stringify(this.takes, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `tonika_takes_${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Export a single take
    exportTake(index) {
      const take = this.takes[index];
      if (!take) return;
      const data = JSON.stringify(take, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date(take.startedAt)
        .toISOString()
        .replace(/[:.]/g, "-");
      a.href = url;
      a.download = `tonika_take_${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    // Delete a single take
    deleteTake(index) {
      if (index < 0 || index >= this.takes.length) return;
      this.takes.splice(index, 1);
      window.dispatchEvent(new CustomEvent("recorder:takeschanged"));
    },

    // ----- internals -----
    _start(ts) {
      this.active = true;
      this.startTime = ts;
      this.current = [];
      this._setUI(true);
      this._armSilence();
    },

    _stop() {
      if (!this.active) return;
      this.active = false;
      if (this.current.length) {
        const dur = this.current.at(-1).t || 0;
        const take = {
          startedAt: Date.now(),
          durationMs: dur,
          events: this.current,
        };
        this.takes.push(take);
        // notify UIs
        window.dispatchEvent(
          new CustomEvent("recorder:take", {
            detail: { index: this.takes.length - 1, take },
          }),
        );
        window.dispatchEvent(new CustomEvent("recorder:takeschanged"));
      }
      this.current = [];
      this._setUI(false);
    },

    _armSilence() {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.silenceTimer = setTimeout(() => this._stop(), this.SILENCE_MS);
    },

    _setUI(isRec) {
      if (!this.statusEl) return;
      this.statusEl.textContent = isRec ? "● rec" : "● idle";
      this.statusEl.classList.toggle("rec", isRec);
      this.statusEl.classList.toggle("idle", !isRec);
    },
  };

  global.Recorder = Recorder;
})(window);
