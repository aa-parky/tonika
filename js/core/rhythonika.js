/*!
 * ============================================================================
 * RHYTHONIKA — Smart Metronome & Pattern Driver (refactor)
 * ============================================================================
 *
 * Version: 0.1.1 (pre-release)
 * Architecture: Extends Tonika.TonikaModule and integrates Tonika.Bus
 * BEM Root: .rhythonika (inside .tonika-module)
 *
 * Key changes in this refactor:
 * - Inherits from Tonika.TonikaModule for uniform lifecycle + status reporting.
 * - Emits and listens via the central Tonika.Bus (transport, audio, rhythm events).
 * - Clean unsubscribe safety using Bus.on() return closures.
 * - Public API aligned to other modules: start(), stop(), setBpm(), setTimeSignature(), setPattern(), setSoundMode().
 * - Robust audio init with graceful fallback to click mode (Soundonika required).
 *
 * Events (emitted)
 * - app:status                { state: 'initializing'|'ready'|'playing'|'stopped'|'error', module, ... }
 * - transport:start           { bpm, timeSignature, patternKey, soundMode }
 * - transport:stop            { bpm, timeSignature, patternKey, soundMode }
 * - rhythm:tick               { step, of, patternKey, isAccent }
 * - rhythm:patternchange      { from, to }
 * - audio:modechange          { from, to }
 *
 * Events (listened)
 * - ui:keypress               (optional; space toggles transport)
 */
(function () {
    "use strict";

    if (
        typeof window === "undefined" ||
        !window.Tonika ||
        !window.Tonika.TonikaModule
    ) {
        console.error(
            "Rhythonika: Tonika base not found. Ensure js/core/tonika-bus.js is loaded first.",
        );
        return;
    }

    class Rhythonika extends window.Tonika.TonikaModule {
        constructor(opts = {}) {
            super({
                ...opts,
                moduleInfo: {
                    name: "Rhythonika",
                    version: "1.2.0",
                    description:
                        "Smart metronome with accents, polyrhythms, and sample/click output",
                },
            });

            // ---------- Settings
            this.settings = {
                mode: opts.mode ?? "card",
                samplePath: opts.samplePath ?? "../samples",
                lookahead: opts.lookahead ?? 25.0, // ms (UI timer)
                scheduleAheadTime: opts.scheduleAheadTime ?? 0.1, // seconds (audio scheduling window)
            };

            // ---------- State
            this.isPlaying = false;
            this.bpm = Number(localStorage.getItem("rhyth_bpm")) || 120;
            this.timeSignature = JSON.parse(
                localStorage.getItem("rhyth_timesig") ||
                `{"numerator":4,"denominator":4}`,
            );
            this.selectedPatternKey =
                localStorage.getItem("rhyth_pattern") || "basic";

            // transport
            this.currentStep = 0;
            this.intervalId = null;
            this._rafId = null;

            // audio
            this.audioContext = null;
            this.audioEngine = null;
            this.nextNoteTime = 0.0;

            // sound map
            this.soundTypes = {
                accent: "kick",
                normal: "hihat_closed",
                polyA: "kick",
                polyB: "snare",
            };

            // pattern library
            this.patterns = {
                basic: {
                    name: "Basic 4/4",
                    slotsPerBar: 4,
                    accents: [1, 0, 0, 0],
                    kind: "grid",
                },
                "accent-332": {
                    name: "Accent 3+3+2",
                    slotsPerBar: 8,
                    accents: [1, 0, 0, 1, 0, 0, 1, 0],
                    kind: "grid",
                },
                "accent-323": {
                    name: "Accent 3+2+3",
                    slotsPerBar: 8,
                    accents: [1, 0, 0, 1, 0, 1, 0, 0],
                    kind: "grid",
                },
                "accent-223": {
                    name: "Accent 2+2+3",
                    slotsPerBar: 8,
                    accents: [1, 0, 1, 0, 1, 0, 0, 0],
                    kind: "grid",
                },
                "triplet-mix": {
                    name: "Mixed Subdivisions",
                    slotsPerBar: 12,
                    accents: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
                    kind: "grid",
                },
                "polyrhythm-32": {
                    name: "Polyrhythm 3:2",
                    kind: "poly",
                    gridA: { count: 2, gain: 0.28 },
                    gridB: { count: 3, gain: 0.2 },
                },
            };

            // Bus bindings
            this._boundOnKeyPress = this._onKeyPress.bind(this);
            this._unsubKey = null;

            // Local key handler (also emits ui:keypress to the bus for other modules)
            this._localKeyHandler = (e) => {
                if (!e || !e.code) return;
                // Re-emit on the bus
                try {
                    window.Tonika?.Bus?.dispatchEvent(
                        new CustomEvent("ui:keypress", { detail: { code: e.code } }),
                    );
                } catch (_) {}
                if (
                    e.code === "Space" &&
                    e.target &&
                    e.target.tagName !== "INPUT" &&
                    e.target.tagName !== "SELECT" &&
                    e.target.tagName !== "TEXTAREA"
                ) {
                    e.preventDefault();
                    this.isPlaying ? this.stop() : this.start();
                }
            };
        }

        // -----------------------------------------------------------------------
        // Lifecycle
        // -----------------------------------------------------------------------
        _initialize() {
            this._render();
            this._bindUI();
            this._renderPills();
            // subscribe to Bus
            this._unsubKey = window.Tonika?.Bus?.on(
                "ui:keypress",
                this._boundOnKeyPress,
            );
            // local key listener to bootstrap ui:keypress and quick transport
            window.addEventListener("keydown", this._localKeyHandler);
            // initial status
            this.emit("app:status", { state: "ready", module: "Rhythonika" });
        }

        destroy() {
            try {
                this.stop();
            } catch {}

            // remove listeners
            window.removeEventListener("keydown", this._localKeyHandler);
            try {
                this._unsubKey?.();
            } catch {}

            // audio cleanup
            if (this.audioContext) {
                try {
                    this.audioContext.close();
                } catch {}
                this.audioContext = null;
            }
            this.audioEngine = null;

            super.destroy();
        }

        // -----------------------------------------------------------------------
        // Rendering
        // -----------------------------------------------------------------------
        _render() {
            if (!this.mount) {
                this.mount = document.createElement("div");
                document.body.appendChild(this.mount);
            }
            this.mount.innerHTML = "";

            this.root = document.createElement("div");
            this.root.className = `tonika-module rhythonika rhythonika--${this.settings.mode}`;
            this.root.innerHTML = `
        <div class="rhythonika__header">
          <div class="rhythonika__title">Rhythonika</div>
        </div>

        <div class="rhythonika__controls">
          <div class="rhythonika__field">
            <label class="rhythonika__label">BPM</label>
            <input class="tonika-input rhythonika__bpm" type="number" min="20" max="400" step="1" value="${this.bpm}" />
          </div>

          <div class="rhythonika__field">
            <label class="rhythonika__label">Time Sig</label>
            <select class="tonika-select rhythonika__timesig">
              ${this._timesigOption({ n: 4, d: 4 })}
              ${this._timesigOption({ n: 3, d: 4 })}
              ${this._timesigOption({ n: 6, d: 8 })}
              ${this._timesigOption({ n: 5, d: 4 })}
            </select>
          </div>

          <div class="rhythonika__field rhythonika__field--grow">
            <label class="rhythonika__label">Pattern</label>
            <select class="tonika-select rhythonika__pattern">
              <option value="basic">Basic 4/4</option>
              <option value="accent-332">Accent Pattern 3+3+2</option>
              <option value="accent-323">Accent Pattern 3+2+3</option>
              <option value="accent-223">Accent Pattern 2+2+3</option>
              <option value="triplet-mix">Mixed Subdivisions</option>
              <option value="polyrhythm-32">Polyrhythm 3 over 2</option>
            </select>
          </div>

          <div class="rhythonika__transport">
            <button class="tonika-btn tonika-btn--primary rhythonika__startstop">Start</button>
          </div>
        </div>

        <div class="rhythonika__audio-controls">
          <div class="rhythonika__field">
            <label class="rhythonika__label">Sound</label>
            <select class="tonika-select rhythonika__sound-mode">
              <option value="clicks">Click Sounds</option>
              <option value="samples">Drum Samples</option>
            </select>
          </div>

          <div class="rhythonika__field">
            <label class="rhythonika__label">Volume</label>
            <input class="tonika-input rhythonika__volume" type="range" min="0" max="1" step="0.1" value="0.7" />
          </div>

          <div class="rhythonika__status">
            <span class="rhythonika__status-text">Ready</span>
          </div>
        </div>

        <div class="rhythonika__meter">
          <div class="rhythonika__pills" aria-label="Rhythm pattern pills"></div>
          <div class="rhythonika__legend tonika-text-muted"></div>
        </div>
      `;

            this.mount.appendChild(this.root);

            // set current UI selections
            const tsSel = this.root.querySelector(".rhythonika__timesig");
            tsSel.value = `${this.timeSignature.numerator}/${this.timeSignature.denominator}`;
            const patSel = this.root.querySelector(".rhythonika__pattern");
            patSel.value = this.selectedPatternKey;
        }

        _timesigOption({ n, d }) {
            const v = `${n}/${d}`;
            const sel =
                this.timeSignature.numerator === n &&
                this.timeSignature.denominator === d
                    ? "selected"
                    : "";
            return `<option value="${v}" ${sel}>${v}</option>`;
        }

        _bindUI() {
            this.btnStartStop = this.root.querySelector(".rhythonika__startstop");
            this.inputBpm = this.root.querySelector(".rhythonika__bpm");
            this.selectSig = this.root.querySelector(".rhythonika__timesig");
            this.selectPattern = this.root.querySelector(".rhythonika__pattern");
            this.pillsWrap = this.root.querySelector(".rhythonika__pills");
            this.legend = this.root.querySelector(".rhythonika__legend");
            this.selectSoundMode = this.root.querySelector(".rhythonika__sound-mode");
            this.inputVolume = this.root.querySelector(".rhythonika__volume");
            this.statusText = this.root.querySelector(".rhythonika__status-text");

            this.btnStartStop.addEventListener("click", () =>
                this.isPlaying ? this.stop() : this.start(),
            );

            this.inputBpm.addEventListener("change", () => {
                this.setBpm(Number(this.inputBpm.value) || 120);
            });

            this.selectSig.addEventListener("change", () => {
                const [n, d] = this.selectSig.value.split("/").map(Number);
                this.setTimeSignature({ numerator: n, denominator: d });
            });

            this.selectPattern.addEventListener("change", () => {
                this.setPattern(this.selectPattern.value);
            });

            this.selectSoundMode.addEventListener("change", () => {
                this.setSoundMode(this.selectSoundMode.value);
            });

            this.inputVolume.addEventListener("input", () => {
                if (this.audioEngine)
                    this.audioEngine.setVolume(parseFloat(this.inputVolume.value));
            });
        }

        _updateStatus(text) {
            if (this.statusText) this.statusText.textContent = text;
        }

        _renderPills() {
            const pat = this.patterns[this.selectedPatternKey];
            if (!pat) return;
            this.pillsWrap.innerHTML = "";
            if (pat.kind === "grid") {
                for (let i = 0; i < pat.slotsPerBar; i++) {
                    const pill = document.createElement("button");
                    pill.type = "button";
                    pill.className = "rhythonika__pill";
                    pill.disabled = true;
                    if (pat.accents[i]) pill.classList.add("rhythonika__pill--accent");
                    this.pillsWrap.appendChild(pill);
                }
                this.legend.textContent = `${pat.name} • ${pat.slotsPerBar} slots`;
            } else {
                const rowA = document.createElement("div");
                rowA.className = "rhythonika__polyrow";
                const rowB = document.createElement("div");
                rowB.className = "rhythonika__polyrow";
                for (let i = 0; i < pat.gridA.count; i++) {
                    rowA.appendChild(
                        Object.assign(document.createElement("span"), {
                            className: "rhythonika__polydot rhythonika__polydot--a",
                        }),
                    );
                }
                for (let j = 0; j < pat.gridB.count; j++) {
                    rowB.appendChild(
                        Object.assign(document.createElement("span"), {
                            className: "rhythonika__polydot rhythonika__polydot--b",
                        }),
                    );
                }
                this.pillsWrap.appendChild(rowA);
                this.pillsWrap.appendChild(rowB);
                this.legend.textContent = `${pat.name} • A:${pat.gridA.count} vs B:${pat.gridB.count}`;
            }
        }

        _highlightPill(stepIdx) {
            const pills = this.pillsWrap.querySelectorAll(".rhythonika__pill");
            if (!pills.length) return;
            pills.forEach((el, i) =>
                el.classList.toggle(
                    "rhythonika__pill--active",
                    i === stepIdx % pills.length,
                ),
            );
        }

        // -----------------------------------------------------------------------
        // Audio / Transport
        // -----------------------------------------------------------------------
        async _ensureAudio() {
            if (this.audioContext && this.audioEngine) return;
            if (!window.Soundonika || !window.Soundonika.Engine) {
                throw new Error(
                    "Soundonika.Engine is not available. Did soundonika.js fail to load?",
                );
            }
            this.audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
            this.audioEngine = new window.Soundonika.Engine(this.audioContext, {
                sampleBasePath: this.settings.samplePath,
            });

            // choose mode
            let mode = this.selectSoundMode?.value || "samples";
            // quick probe for local samples
            let hasSamples = false;
            try {
                const res = await fetch(
                    `${this.settings.samplePath}/sample-index.json`,
                    { cache: "no-store" },
                );
                hasSamples = res.ok;
            } catch (_) {}

            if (!hasSamples) mode = "clicks";

            // init engine
            try {
                this.audioEngine.setSoundMode(mode);
                await this.audioEngine.init();
            } catch (err) {
                console.warn("Sample init failed, falling back to clicks:", err);
                this.audioEngine.setSoundMode("clicks");
                await this.audioEngine.init();
            }

            // sync UI
            if (this.selectSoundMode)
                this.selectSoundMode.value = this.audioEngine.getSoundMode();
            if (this.inputVolume)
                this.inputVolume.value = this.audioEngine.getVolume();
            this._updateStatus(
                this.audioEngine.getSoundMode() === "samples"
                    ? "Ready with samples"
                    : "Ready with clicks",
            );
        }

        async start() {
            try {
                await this._ensureAudio();
            } catch (err) {
                console.error("Rhythonika: cannot start", err);
                this.emit("app:status", {
                    state: "error",
                    module: "Rhythonika",
                    error: String(err?.message || err),
                });
                this._updateStatus("Failed to start - see console");
                return;
            }

            this.isPlaying = true;
            this.root?.classList.add("rhythonika--playing");
            this.btnStartStop.textContent = "Stop";
            this.currentStep = 0;
            this.nextNoteTime = this.audioContext.currentTime + 0.05;

            // schedule loop
            if (this.intervalId) clearInterval(this.intervalId);
            this.intervalId = setInterval(
                () => this._scheduler(),
                this.settings.lookahead,
            );

            // visual loop
            const loop = () => {
                if (!this.isPlaying) return;
                const pat = this.patterns[this.selectedPatternKey];
                if (pat && pat.kind === "grid") this._highlightPill(this.currentStep);
                this._rafId = requestAnimationFrame(loop);
            };
            this._rafId = requestAnimationFrame(loop);

            this.emit("app:status", { state: "playing", module: "Rhythonika" });
            this.emit("transport:start", {
                bpm: this.bpm,
                timeSignature: this.timeSignature,
                patternKey: this.selectedPatternKey,
                soundMode: this.audioEngine?.getSoundMode?.(),
            });
            this._updateStatus("Playing");
        }

        stop() {
            this.isPlaying = false;
            this.root?.classList.remove("rhythonika--playing");
            if (this.intervalId) clearInterval(this.intervalId);
            if (this._rafId) cancelAnimationFrame(this._rafId);
            this.btnStartStop && (this.btnStartStop.textContent = "Start");

            this.emit("app:status", { state: "stopped", module: "Rhythonika" });
            this.emit("transport:stop", {
                bpm: this.bpm,
                timeSignature: this.timeSignature,
                patternKey: this.selectedPatternKey,
                soundMode: this.audioEngine?.getSoundMode?.(),
            });

            if (this.audioEngine) {
                this._updateStatus(
                    this.audioEngine.getSoundMode() === "samples"
                        ? "Ready with samples"
                        : "Ready with clicks",
                );
            } else {
                this._updateStatus("Ready");
            }
        }

        _scheduler() {
            const now = this.audioContext.currentTime;
            while (this.nextNoteTime < now + this.settings.scheduleAheadTime) {
                this._scheduleNext();
            }
        }

        _scheduleNext() {
            const pat = this.patterns[this.selectedPatternKey];
            const secondsPerBeat = 60.0 / this.bpm;

            if (pat.kind === "grid") {
                const beatsPerBar = this.timeSignature.numerator;
                const slotDur = (beatsPerBar / pat.slotsPerBar) * secondsPerBeat;
                const isAccent = !!pat.accents[this.currentStep % pat.slotsPerBar];
                const soundType = this.soundTypes[isAccent ? "accent" : "normal"];
                const velocity = isAccent ? 1.0 : 0.7;

                try {
                    this.audioEngine.scheduleSound(
                        this.nextNoteTime,
                        soundType,
                        velocity,
                    );
                } catch (e) {
                    console.error(e);
                }

                this.emit("rhythm:tick", {
                    step: this.currentStep % pat.slotsPerBar,
                    of: pat.slotsPerBar,
                    patternKey: this.selectedPatternKey,
                    isAccent,
                });

                this.nextNoteTime += slotDur;
                this.currentStep = (this.currentStep + 1) % pat.slotsPerBar;
            } else {
                // 3:2 over a common bar
                const beatsPerBar = this.timeSignature.numerator;
                const barDur = beatsPerBar * secondsPerBeat;
                const lcmTicks = this._lcm(pat.gridA.count, pat.gridB.count);
                const tickDur = barDur / lcmTicks;
                const tick = this.currentStep % lcmTicks;

                try {
                    if (tick % (lcmTicks / pat.gridA.count) === 0) {
                        this.audioEngine.scheduleSound(
                            this.nextNoteTime,
                            this.soundTypes.polyA,
                            pat.gridA.gain / 0.28,
                        );
                    }
                    if (tick % (lcmTicks / pat.gridB.count) === 0) {
                        this.audioEngine.scheduleSound(
                            this.nextNoteTime,
                            this.soundTypes.polyB,
                            pat.gridB.gain / 0.28,
                        );
                    }
                } catch (e) {
                    console.error(e);
                }

                this.emit("rhythm:tick", {
                    step: tick,
                    of: lcmTicks,
                    patternKey: this.selectedPatternKey,
                    isAccent:
                        tick % (lcmTicks / pat.gridA.count) === 0 ||
                        tick % (lcmTicks / pat.gridB.count) === 0,
                });

                this.nextNoteTime += tickDur;
                this.currentStep = (this.currentStep + 1) % lcmTicks;
            }
        }

        _lcm(a, b) {
            const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
            return Math.abs(a * b) / gcd(a, b);
        }

        // -----------------------------------------------------------------------
        // Bus listeners
        // -----------------------------------------------------------------------
        _onKeyPress(e) {
            const code = e?.detail?.code || e?.code;
            if (code === "Space") {
                this.isPlaying ? this.stop() : this.start();
            }
        }

        // -----------------------------------------------------------------------
        // Public API
        // -----------------------------------------------------------------------
        setBpm(bpm) {
            const clamped = Math.max(20, Math.min(400, Number(bpm) || 120));
            this.bpm = clamped;
            localStorage.setItem("rhyth_bpm", String(this.bpm));
            if (this.isPlaying) this._reprimeClock();
            return this.bpm;
        }

        setTimeSignature(ts) {
            this.timeSignature = {
                numerator: ts.numerator,
                denominator: ts.denominator,
            };
            localStorage.setItem("rhyth_timesig", JSON.stringify(this.timeSignature));
            this.currentStep = 0;
            this._renderPills();
            if (this.isPlaying) this._reprimeClock();
            return this.timeSignature;
        }

        setPattern(key) {
            if (!this.patterns[key]) return this.selectedPatternKey;
            const prev = this.selectedPatternKey;
            this.selectedPatternKey = key;
            localStorage.setItem("rhyth_pattern", this.selectedPatternKey);
            this.currentStep = 0;
            this._renderPills();
            if (this.isPlaying) this._reprimeClock();
            if (prev !== key)
                this.emit("rhythm:patternchange", { from: prev, to: key });
            return this.selectedPatternKey;
        }

        setSoundMode(mode) {
            if (!this.audioEngine) return mode;
            const prev = this.audioEngine.getSoundMode();
            try {
                this.audioEngine.setSoundMode(mode);
                this._updateStatus(
                    this.audioEngine.getSoundMode() === "samples"
                        ? "Using drum samples"
                        : "Using click sounds",
                );
                if (prev !== mode)
                    this.emit("audio:modechange", { from: prev, to: mode });
            } catch (err) {
                console.error("Rhythonika: failed to change sound mode", err);
                this._updateStatus("Error changing sound mode");
            }
            return this.audioEngine.getSoundMode();
        }

        _reprimeClock() {
            if (!this.audioContext) return;
            if (this.intervalId) clearInterval(this.intervalId);
            this.nextNoteTime = this.audioContext.currentTime + 0.05;
            this.intervalId = setInterval(
                () => this._scheduler(),
                this.settings.lookahead,
            );
        }

        // Status
        getStatus() {
            return {
                ...super.getStatus(),
                api: {
                    methods: [
                        "start",
                        "stop",
                        "setBpm",
                        "setTimeSignature",
                        "setPattern",
                        "setSoundMode",
                        "getStatus",
                        "destroy",
                    ],
                    events: {
                        emits: [
                            "app:status",
                            "transport:start",
                            "transport:stop",
                            "rhythm:tick",
                            "rhythm:patternchange",
                            "audio:modechange",
                            "system:module:registered",
                        ],
                        listens: ["ui:keypress"],
                    },
                },
                state: {
                    ...super.getStatus().state,
                    isPlaying: this.isPlaying,
                    bpm: this.bpm,
                    timeSignature: this.timeSignature,
                    patternKey: this.selectedPatternKey,
                    soundMode: this.audioEngine?.getSoundMode?.() || "unknown",
                },
                capabilities: {
                    patterns: Object.keys(this.patterns),
                    supportsPolyrhythm: true,
                    soundModes: ["clicks", "samples"],
                },
            };
        }
    }

    // global export for classic scripts
    window.Rhythonika = Rhythonika;
})();
