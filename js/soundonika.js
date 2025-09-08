/**
 * Soundonika - A modular audio engine for the Tonika ecosystem
 * Backward-compatible version that works with existing demos
 * Refactored to remove hard-coded sample mappings while maintaining compatibility
 */

class SoundonikaEngine {
    constructor(audioContext, options = {}) {
        this.audioContext = audioContext;

        // Audio graph nodes
        this.masterGain = null;
        this.compressor = null;

        // Sample management
        this.sampleIndex = {};
        this.sampleBasePath = options.sampleBasePath || '../samples';
        this.sampleBuffers = new Map(); // AudioBuffer cache
        this.soundTypeMap = new Map();  // Type → sample mapping

        // Configuration for sample mappings - now configurable!
        this.sampleMappings = options.sampleMappings || this.getDefaultSampleMappings();

        // State management
        this.volume = options.volume || 0.8;
        this.mode = options.mode || 'samples';
        this.isInitialized = false;
        this.loadingProgress = 0;
    }

    // ===== CONFIGURATION METHODS =====

    getDefaultSampleMappings() {
        // Default mappings that work with the standard Tonika directory structure
        // These can be overridden via constructor options
        return {
            'kick': 'percussion/DopeDrumsVol5/DD5_Kick_01.wav',
            'snare': 'percussion/DopeDrumsVol5/DD5_Snare_01.wav',
            'hihat_closed': 'percussion/DopeDrumsVol5/DD5_CH_01.wav',
            'hihat_open': 'percussion/DopeDrumsVol5/DD5_OH_01.wav',
            'perc': 'percussion/DopeDrumsVol5/DD5_Perc_01.wav',
            'shaker': 'percussion/DopeDrumsVol5/DD5_Shk_01.wav',
            // Aliases for convenience
            'accent': 'percussion/DopeDrumsVol5/DD5_Kick_01.wav',
            'normal': 'percussion/DopeDrumsVol5/DD5_CH_01.wav'
        };
    }

    async setSampleMappings(mappings) {
        this.sampleMappings = { ...mappings };
        this.setupSoundTypeMapping();

        // Load any new samples that aren't already cached
        await this.loadMissingSamples();

        console.log('Sample mappings updated and new samples loaded');
    }

    async loadMissingSamples() {
        const loadPromises = [];

        for (const [soundType, samplePath] of Object.entries(this.sampleMappings)) {
            const fullPath = `${this.sampleBasePath}/${samplePath}`;

            // Check if this sample is already loaded
            if (!this.sampleBuffers.has(fullPath)) {
                console.log(`Loading new sample: ${fullPath}`);
                const promise = this.loadSampleByPath(samplePath);
                loadPromises.push(promise);
            }
        }

        if (loadPromises.length > 0) {
            await Promise.all(loadPromises);
            console.log(`Loaded ${loadPromises.length} new samples`);
        }
    }

    async loadSampleByPath(samplePath) {
        const fullPath = `${this.sampleBasePath}/${samplePath}`;

        try {
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch sample: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.sampleBuffers.set(fullPath, audioBuffer);
            console.log(`Successfully loaded: ${samplePath}`);

        } catch (error) {
            console.error(`Failed to load sample ${samplePath}:`, error);
            // Don't throw - allow the engine to continue with other samples
        }
    }

    getSampleMappings() {
        return { ...this.sampleMappings };
    }

    // ===== INITIALIZATION METHODS =====

    async init() {
        if (this.isInitialized) {
            console.log('Engine already initialized');
            return;
        }

        try {
            this.setupAudioGraph();
            await this.loadSampleIndex();
            await this.preloadSamples();
            this.setupSoundTypeMapping();

            this.isInitialized = true;
            console.log('Soundonika engine initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Soundonika engine:', error);
            throw error;
        }
    }

    setupAudioGraph() {
        // Master gain for volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;

        // Optional compressor for limiting and professional sound
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        // Connect the audio graph: masterGain → compressor → destination
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.audioContext.destination);
    }

    async loadSampleIndex() {
        const response = await fetch(`${this.sampleBasePath}/sample-index.json`);
        if (!response.ok) {
            throw new Error(`Failed to load sample index: ${response.status}`);
        }
        this.sampleIndex = await response.json();
    }

    async preloadSamples() {
        const loadPromises = [];
        let totalSamples = 0;
        let loadedSamples = 0;

        // Count total samples for progress tracking
        for (const [, packs] of Object.entries(this.sampleIndex)) {
            if (packs && typeof packs === 'object' && !Array.isArray(packs)) {
                const packsRecord = /** @type {Record<string, string[]>} */ (packs);
                for (const [, samples] of Object.entries(packsRecord)) {
                    if (Array.isArray(samples)) {
                        totalSamples += samples.length;
                    }
                }
            }
        }

        // Load samples from each pack
        for (const [category, packs] of Object.entries(this.sampleIndex)) {
            if (packs && typeof packs === 'object' && !Array.isArray(packs)) {
                const packsRecord = /** @type {Record<string, string[]>} */ (packs);
                for (const [pack, samples] of Object.entries(packsRecord)) {
                    if (Array.isArray(samples)) {
                        for (const sample of samples) {
                            const promise = this.loadSample(category, pack, sample)
                                .then(() => {
                                    loadedSamples++;
                                    this.loadingProgress = loadedSamples / totalSamples;
                                });
                            loadPromises.push(promise);
                        }
                    }
                }
            }
        }

        await Promise.all(loadPromises);
        console.log(`Loaded ${loadedSamples} samples successfully`);
    }

    async loadSample(category, pack, filename) {
        const url = `${this.sampleBasePath}/${category}/${pack}/${filename}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch sample: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.sampleBuffers.set(url, audioBuffer);

        } catch (error) {
            console.error(`Failed to load sample ${filename}:`, error);
            // Don't throw - allow the engine to continue with other samples
        }
    }

    setupSoundTypeMapping() {
        // Clear existing mappings
        this.soundTypeMap.clear();

        // Set up mappings based on configuration
        for (const [soundType, samplePath] of Object.entries(this.sampleMappings)) {
            this.soundTypeMap.set(soundType, samplePath);
        }
    }

    // ===== CORE SCHEDULING METHODS =====

    scheduleSound(when, soundType, velocity = 1.0) {
        if (!this.isInitialized) {
            console.warn('Engine not initialized. Call init() first. Falling back to click sound.');
            this.scheduleClickSound(when, soundType, velocity);
            return;
        }

        // Validate and sanitize parameters
        if (when < this.audioContext.currentTime) {
            console.warn('Scheduled time is in the past, playing immediately');
            when = this.audioContext.currentTime;
        }

        velocity = Math.max(0, Math.min(1, velocity));

        // Route based on current mode
        if (this.mode === 'clicks') {
            this.scheduleClickSound(when, soundType, velocity);
        } else {
            this.scheduleSampleSound(when, soundType, velocity);
        }
    }

    scheduleSampleSound(when, soundType, velocity) {
        const samplePath = this.soundTypeMap.get(soundType);
        if (!samplePath) {
            console.warn(`No sample mapping found for sound type: ${soundType}. Falling back to click.`);
            this.scheduleClickSound(when, soundType, velocity);
            return;
        }

        const fullPath = `${this.sampleBasePath}/${samplePath}`;
        const audioBuffer = this.sampleBuffers.get(fullPath);

        if (!audioBuffer) {
            console.warn(`Sample not loaded: ${samplePath}. Falling back to click.`);
            this.scheduleClickSound(when, soundType, velocity);
            return;
        }

        // Create and configure audio nodes
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = audioBuffer;
        gainNode.gain.value = velocity;

        // Connect: source → gain → masterGain
        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Schedule playback
        source.start(when);
    }

    scheduleClickSound(when, soundType, velocity) {
        // Create a simple click sound using the oscillator
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        // Configure oscillator for a short click
        oscillator.frequency.value = soundType === 'accent' ? 1000 : 800;
        oscillator.type = 'sine';

        // Configure gain envelope with a sharp click
        gainNode.gain.setValueAtTime(0, when);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.3, when + 0.001);
        gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

        // Connect: oscillator → gain → masterGain
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Schedule playback
        oscillator.start(when);
        oscillator.stop(when + 0.05);
    }

    // ===== UTILITY METHODS =====

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    getVolume() {
        return this.volume;
    }

    setSoundMode(mode) {
        if (mode === 'samples' || mode === 'clicks') {
            this.mode = mode;
        } else {
            console.warn(`Invalid sound mode: ${mode}. Use 'samples' or 'clicks'.`);
        }
    }

    getSoundMode() {
        return this.mode;
    }

    isReady() {
        return this.isInitialized;
    }

    getLoadingProgress() {
        return this.loadingProgress;
    }

    getLoadedSampleCount() {
        return this.sampleBuffers.size;
    }
}

// ===== BACKWARD COMPATIBILITY =====
// For existing code that expects window.Soundonika
if (typeof window !== 'undefined') {
    window.SoundonikaEngine = SoundonikaEngine;
    // Legacy support
    window.Soundonika = {
        Engine: SoundonikaEngine
    };
}

// ===== MODULE EXPORTS =====
// For Node.js/CommonJS modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundonikaEngine };
}

// For ES6 modules - only when loaded as a module
// Note: ES6 export statements must be at the top level and cannot be conditional
// This file is designed to work with both script tags and ES6 imports

