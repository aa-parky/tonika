// recorder.js
// Tonika – always‑on MIDI recorder with localStorage persistence
// Emits 'recorder:take' and 'recorder:takeschanged' CustomEvents.

(function (global) {
  const STORAGE_KEY = "tonika_takes_v1";
  const MAX_TAKES = 500; // safety cap

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

      // Load any prior session takes
      this._loadFromStorage();
      // Notify UI on boot so panels render immediately
      window.dispatchEvent(new CustomEvent("recorder:takeschanged"));

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

    /* ------------ session helpers ------------ */
    getTakes() {
      return this.takes.slice();
    },

    clear() {
      this.current = [];
      this.takes = [];
      this._saveToStorage();
      this._setUI(false);
      window.dispatchEvent(new CustomEvent("recorder:takeschanged"));
    },

    // Export ALL takes as a single JSON file
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

    // Export just one take
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

    deleteTake(index) {
      if (index < 0 || index >= this.takes.length) return;
      this.takes.splice(index, 1);
      this._saveToStorage();
      window.dispatchEvent(new CustomEvent("recorder:takeschanged"));
    },

    /* --------------- internals --------------- */
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
        if (this.takes.length > MAX_TAKES)
          this.takes.splice(0, this.takes.length - MAX_TAKES);
        this._saveToStorage();

        // Notify any UIs
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

    _saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.takes));
      } catch {
        /* ignore quota errors */
      }
    },

    _loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          // quick validation (very light)
          this.takes = arr.filter(
            (t) =>
              t && typeof t.startedAt === "number" && Array.isArray(t.events),
          );
        }
      } catch {
        /* ignore parse errors */
      }
    },
  };

  global.Recorder = Recorder;
})(window);
