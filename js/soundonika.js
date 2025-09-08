/* ===================================================================
   Soundonika.js
   Core audio engine for Tonika
   ================================================================== */

/* global module */

/**
 * Encode each path segment so characters like '#' don't break fetch URLs.
 * @param {string} relPath
 * @returns {string}
 */
function encodePathSegments(relPath) {
    return relPath.split('/').map(encodeURIComponent).join('/');
}

class SoundonikaEngine {
    /**
     * @param {AudioContext} audioContext
     * @param {{
     *   sampleBasePath?: string,
     *   volume?: number,
     *   mode?: 'samples'|'clicks',
     *   sampleMappings?: Record<string,string>
     * }} [options]
     */
    constructor(audioContext, options = {}) {
        this.audioContext = audioContext;
        this.sampleBasePath = options.sampleBasePath || 'samples';
        this.volume = options.volume ?? 0.8;
        this.soundMode = options.mode || 'samples'; // 'samples' | 'clicks'
        this.sampleMappings = options.sampleMappings || {};
        /** @type {Map<string, AudioBuffer>} */
        this.sampleBuffers = new Map(); // key: relative samplePath → AudioBuffer
        this.loadingProgress = { loaded: 0, total: 0 };
        /** @type {Map<string,string>} */
        this.soundTypeMap = new Map();
        /** @type {Record<string, any>} */
        this.sampleIndex = undefined;

        this._initDefaultMappings();
    }

    // ===== DEFAULT MAPPINGS =====
    _initDefaultMappings() {
        // Safe defaults (can be replaced via setSampleMappings)
        this.sampleMappings = {
            kick:  'percussion/DopeDrumsVol5/DD5_Kick_01.wav',
            snare: 'percussion/DopeDrumsVol5/DD5_Snare_01.wav',
            hihat: 'percussion/DopeDrumsVol5/DD5_CH_01.wav',
            perc:  'percussion/DopeDrumsVol5/DD5_Bones.wav',
            // Aliases
            clap:  'percussion/DopeDrumsVol5/DD5_Snare_02.wav'
        };
        this.soundTypeMap = new Map(Object.entries(this.sampleMappings));
    }

    // ===== INIT =====
    async init() {
        await this.loadSampleIndex();
        await this.preloadSamples();
    }

    async loadSampleIndex() {
        try {
            const response = await fetch(`${this.sampleBasePath}/sample-index.json`);
            if (!response.ok) {
                // Keep this throw: failing the index should abort initialization
                throw new Error(`Failed to fetch sample index: ${response.status}`);
            }
            this.sampleIndex = await response.json();
        } catch (err) {
            console.error('Error loading sample index:', err);
            throw err;
        }
    }

    async preloadSamples() {
        if (!this.sampleIndex) {
            console.warn('No sample index loaded.');
            return;
        }

        /** @type {string[]} */
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

        // Simple sequential load (robust, low memory). Can add concurrency later.
        for (const samplePath of allFiles) {
            // eslint-disable-next-line no-await-in-loop
            await this.loadSampleByPath(samplePath);
            this.loadingProgress.loaded++;
        }
    }

    /**
     * Convenience wrapper to match old call sites.
     */
    async loadSample(category, pack, filename) {
        const samplePath = `${category}/${pack}/${filename}`;
        return this.loadSampleByPath(samplePath);
    }

    /**
     * @param {string} samplePath relative path under samples/ (unencoded)
     */
    async loadSampleByPath(samplePath) {
        const fetchUrl = `${this.sampleBasePath}/${encodePathSegments(samplePath)}`;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                console.error(`Failed to fetch sample: ${response.status} @ ${fetchUrl}`);
                return;
            }

            /** @type {ArrayBuffer} */
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.sampleBuffers.set(samplePath, audioBuffer);
            // You can quiet this log if you like once you’re confident.
            console.log(`Successfully loaded: ${samplePath}`);
        } catch (error) {
            console.error(`Failed to load sample ${samplePath}:`, error);
        }
    }

    // ===== PLAYBACK =====
    /**
     * @param {number} when
     * @param {string} soundType
     * @param {number} [velocity=1]
     */
    scheduleSound(when, soundType, velocity = 1.0) {
        if (this.soundMode === 'samples') {
            this.scheduleSampleSound(when, soundType, velocity);
        } else {
            this.scheduleClickSound(when, soundType, velocity);
        }
    }

    /**
     * @param {number} when
     * @param {string} soundType
     * @param {number} velocity
     */
    scheduleSampleSound(when, soundType, velocity) {
        const samplePath = this.soundTypeMap.get(soundType);
        if (!samplePath) {
            console.warn(`No sample mapping for: ${soundType}. Falling back to click.`);
            this.scheduleClickSound(when, soundType, velocity);
            return;
        }

        const audioBuffer = this.sampleBuffers.get(samplePath);
        if (!audioBuffer) {
            console.warn(`Sample not loaded: ${samplePath}. Falling back to click.`);
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

    /**
     * @param {number} when
     * @param {string} soundType
     * @param {number} velocity
     */
    scheduleClickSound(when, soundType, velocity) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        const isAccent = soundType === 'kick' || soundType === 'accent';
        osc.frequency.value = isAccent ? 880.0 : 440.0;

        gain.gain.setValueAtTime(this.volume * velocity, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

        osc.connect(gain).connect(this.audioContext.destination);
        osc.start(when);
        osc.stop(when + 0.05);
    }

    // ===== HELPERS / GETTERS / SETTERS =====
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(vol, 1));
    }

    getVolume() {
        return this.volume;
    }

    setSoundMode(mode) {
        if (mode === 'samples' || mode === 'clicks') {
            this.soundMode = mode;
        }
    }

    getSoundMode() {
        return this.soundMode;
    }

    /**
     * Replace the current sound type → samplePath mapping at runtime.
     * @param {{kick: string, snare: string, hihat_closed: string, hihat_open: string, perc: string, shaker: string, accent: string, normal: string}|{kick: string, snare: string, hihat_closed: string, hihat_open: string, perc: string, shaker: string, accent: string, normal: string}} mappings
     */
    setSampleMappings(mappings) {
        this.sampleMappings = { ...mappings };
        this.soundTypeMap = new Map(Object.entries(this.sampleMappings));
    }

    /**
     * Return a shallow copy of the current mappings (for UIs).
     * @returns {Record<string,string>}
     */
    getSampleMappings() {
        return { ...this.sampleMappings };
    }

    /**
     * Return current preload progress (for status displays).
     * @returns {{loaded:number,total:number}}
     */
    getLoadingProgress() {
        return { ...this.loadingProgress };
    }

    /** Number of decoded+cached samples */
    getLoadedSampleCount() {
        return this.sampleBuffers.size;
    }

    /** Total samples expected to load (from sample-index.json) */
    getTotalSampleCount() {
        return this.loadingProgress.total ?? 0;
    }

    /** Optional: list of loaded sample relative paths */
    getLoadedSamplePaths() {
        return Array.from(this.sampleBuffers.keys());
    }

    /** Optional: quick check if a given relative path is loaded */
    hasSample(samplePath) {
        return this.sampleBuffers.has(samplePath);
    }

    getSampleBasePath() {
        return this.sampleBasePath;
    }

    /**
     * @returns {boolean}
     */
    isReady() {
        return this.loadingProgress.loaded === this.loadingProgress.total && this.loadingProgress.total > 0;
    }
}

// ===== GLOBAL EXPOSURE =====
if (typeof window !== 'undefined') {
    window.SoundonikaEngine = SoundonikaEngine;
}

// ===== MODULE EXPORTS (Node/CommonJS) =====
if (typeof module === 'object' && module && typeof module.exports === 'object') {
    module.exports = { SoundonikaEngine };
}