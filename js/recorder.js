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
    activeNotes: new Set(), // Track currently held notes
    activePedals: new Set(), // Track currently pressed pedals

    // Common pedal CC numbers
    PEDAL_CCS: new Set([64, 66, 67]), // Sustain, Sostenuto, Soft pedal

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
      // type: "on" | "off" | "cc" | "raw"
      if (type !== "on" && type !== "off" && type !== "cc" && type !== "raw")
        return;

      if (!this.active) this._start(ts);
      const t = +(ts - this.startTime).toFixed(1);
      this.current.push({ type, midi, vel, t });

      // Track active notes for intelligent silence detection
      if (type === "on" && vel > 0) {
        this.activeNotes.add(midi);
        // Cancel silence timer if we have active notes
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (type === "off" || (type === "on" && vel === 0)) {
        this.activeNotes.delete(midi);
      } else if (type === "cc" && this.PEDAL_CCS.has(midi)) {
        // Track pedal states (CC 64, 66, 67)
        if (vel >= 64) {
          // Pedal pressed (MIDI convention: >= 64 is "on")
          this.activePedals.add(midi);
          // Cancel silence timer if pedal is pressed
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else {
          // Pedal released
          this.activePedals.delete(midi);
        }
      }

      // Only start silence timer when no notes or pedals are active
      this._armSilenceIfNeeded();
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
      this.activeNotes.clear(); // Clear any lingering active notes from previous session
      this.activePedals.clear(); // Clear any lingering active pedals from previous session
      this._setUI(true);
    },

    _stop() {
      if (!this.active) return;
      this.active = false;
      this.activeNotes.clear(); // Clear active notes when stopping
      this.activePedals.clear(); // Clear active pedals when stopping
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

    _armSilenceIfNeeded() {
      // Only start silence timer if no notes or pedals are currently active
      if (this.activeNotes.size === 0 && this.activePedals.size === 0) {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => this._stop(), this.SILENCE_MS);
      }
      // If notes or pedals are active, the silence timer should already be cleared
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
