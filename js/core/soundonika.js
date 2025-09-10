/* ===================================================================
   Soundonika.js
   Core audio engine for Tonika — EventTarget/Emitter-enabled
   ================================================================== */

/* eslint-env browser, node */
/* global module */

function encodePathSegments(relPath) {
    return relPath.split("/").map(encodeURIComponent).join("/");
}

const _EmitterBase =
    typeof window !== "undefined" && window.Tonika && window.Tonika.TonikaEmitter
        ? window.Tonika.TonikaEmitter
        : EventTarget;

class SoundonikaEngine extends _EmitterBase {
    constructor(audioContext, options = {}) {
        super();

        this.audioContext = audioContext;
        this.sampleBasePath = options.sampleBasePath || "samples";
        this.volume = options.volume ?? 0.8;
        this.soundMode = options.mode || "samples";
        this.sampleMappings = options.sampleMappings || {};
        this.sampleBuffers = new Map();
        this.loadingProgress = { loaded: 0, total: 0 };
        this.soundTypeMap = new Map();
        this.sampleIndex = undefined;

        if (typeof options.onStatus === "function") {
            this.addEventListener("audio:status", (e) => {
                const { level, msg, progress } = e.detail || {};
                options.onStatus(level, msg ?? progress);
            });
        }

        this._initDefaultMappings();
    }

    _initDefaultMappings() {
        this.sampleMappings = {
            kick: "percussion/DopeDrumsVol5/DD5_Kick_01.wav",
            snare: "percussion/DopeDrumsVol5/DD5_Snare_01.wav",
            hihat: "percussion/DopeDrumsVol5/DD5_CH_01.wav",
            perc: "percussion/DopeDrumsVol5/DD5_Bones.wav",
            clap: "percussion/DopeDrumsVol5/DD5_Snare_02.wav",
        };
        this.soundTypeMap = new Map(Object.entries(this.sampleMappings));
    }

    // ===== INTERNAL EMIT HELPERS =====
    _emitAudio(level, msg, progress) {
        this.dispatchEvent(
            new CustomEvent("audio:status", { detail: { level, msg, progress } })
        );
    }
    _emitLoading(msg, progress) {
        this._emitAudio("loading", msg, progress);
    }
    _emitReady(msg) {
        this._emitAudio("ready", msg);
    }
    _emitError(msg) {
        this._emitAudio("error", msg);
    }
    _emitInfo(msg) {
        this._emitAudio("info", msg);
    }

    // ===== INIT =====
    async init() {
        try {
            this._emitLoading("Fetching sample index…", 0);
            await this.loadSampleIndex();
            this._emitLoading("Preloading samples…", 0);
            await this.preloadSamples();
            this._emitReady("All samples loaded");
        } catch (err) {
            this._emitError(err?.message || String(err));
            throw err;
        }
    }

    async loadSampleIndex() {
        const response = await fetch(`${this.sampleBasePath}/sample-index.json`);
        if (!response.ok) throw new Error(`Failed to fetch sample index: ${response.status}`);
        this.sampleIndex = await response.json();
    }

    async preloadSamples() {
        if (!this.sampleIndex) {
            console.warn("No sample index loaded.");
            return;
        }

        const allFiles = [];
        for (const [category, packs] of Object.entries(this.sampleIndex)) {
            for (const [pack, files] of Object.entries(packs)) {
                for (const file of files) {
                    allFiles.push(`${category}/${pack}/${file}`);
                }
            }
        }

        this.loadingProgress.total = allFiles.length;
        this.loadingProgress.loaded = 0;

        for (const samplePath of allFiles) {
            await this.loadSampleByPath(samplePath);
            this.loadingProgress.loaded++;
            const prog =
                this.loadingProgress.total > 0
                    ? this.loadingProgress.loaded / this.loadingProgress.total
                    : 1;
            this._emitLoading(
                `Loaded ${this.loadingProgress.loaded}/${this.loadingProgress.total}`,
                prog
            );
        }
    }

    async loadSample(category, pack, filename) {
        const samplePath = `${category}/${pack}/${filename}`;
        return this.loadSampleByPath(samplePath);
    }

    async loadSampleByPath(samplePath) {
        const fetchUrl = `${this.sampleBasePath}/${encodePathSegments(samplePath)}`;
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                this._emitError(`Fetch failed for ${samplePath} (${response.status})`);
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sampleBuffers.set(samplePath, audioBuffer);
            console.log(`Loaded: ${samplePath}`);
        } catch (error) {
            console.error(`Failed to load sample ${samplePath}:`, error);
            this._emitError(`Decode/load failed: ${samplePath}`);
        }
    }

    // ===== PLAYBACK =====
    scheduleSound(when, soundType, velocity = 1.0) {
        if (this.soundMode === "samples") {
            this.scheduleSampleSound(when, soundType, velocity);
        } else {
            this.scheduleClickSound(when, soundType, velocity);
        }
    }

    scheduleSampleSound(when, soundType, velocity) {
        const samplePath = this.soundTypeMap.get(soundType);
        if (!samplePath) {
            this._emitInfo(`Missing mapping: ${soundType}`);
            this.scheduleClickSound(when, soundType, velocity);
            return;
        }
        const audioBuffer = this.sampleBuffers.get(samplePath);
        if (!audioBuffer) {
            this._emitInfo(`Sample not loaded: ${samplePath}`);
            this.scheduleClickSound(when, soundType, velocity);
            return;
        }
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.volume * velocity;
        source.connect(gainNode).connect(this.audioContext.destination);
        source.start(when);
    }

    scheduleClickSound(when, soundType, velocity) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.frequency.value = soundType === "kick" || soundType === "accent" ? 880.0 : 440.0;
        gain.gain.setValueAtTime(this.volume * velocity, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
        osc.connect(gain).connect(this.audioContext.destination);
        osc.start(when);
        osc.stop(when + 0.05);
    }

    // ===== HELPERS =====
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(vol, 1));
        this._emitInfo(`volume:${this.volume}`);
    }

    getVolume() { return this.volume; }

    setSoundMode(mode) {
        if (mode === "samples" || mode === "clicks") {
            this.soundMode = mode;
            this._emitInfo(`mode:${this.soundMode}`);
        }
    }

    getSoundMode() { return this.soundMode; }

    setSampleMappings(mappings) {
        this.sampleMappings = { ...mappings };
        this.soundTypeMap = new Map(Object.entries(this.sampleMappings));
        this.dispatchEvent(
            new CustomEvent("app:mappings_updated", { detail: { mappings: this.sampleMappings } })
        );
    }

    getSampleMappings() { return { ...this.sampleMappings }; }
    getLoadingProgress() { return { ...this.loadingProgress }; }
    getLoadedSampleCount() { return this.sampleBuffers.size; }
    getTotalSampleCount() { return this.loadingProgress.total ?? 0; }
    getLoadedSamplePaths() { return Array.from(this.sampleBuffers.keys()); }
    hasSample(samplePath) { return this.sampleBuffers.has(samplePath); }
    getSampleBasePath() { return this.sampleBasePath; }
    isReady() { return this.loadingProgress.loaded === this.loadingProgress.total && this.loadingProgress.total > 0; }
}

if (typeof window !== "undefined") {
    window.Tonika = window.Tonika || {};
    window.Tonika.SoundonikaEngine = SoundonikaEngine;
    window.SoundonikaEngine = SoundonikaEngine;
}

if (typeof module === "object" && module && typeof module.exports === "object") {
    module.exports = { SoundonikaEngine };
}