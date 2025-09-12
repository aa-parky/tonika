/*!
 * Tonika Utils — Shared utility functions for Tonika modules
 * Location: js/core/tonika-utils.js
 *
 * Purpose:
 *   Provides pure utility functions used across multiple Tonika modules.
 *   Prevents code duplication and ensures consistent behavior.
 *
 * Inclusion Criteria:
 *   ✅ Function must be used by 2+ modules to justify inclusion
 *   ✅ Function must be pure (no side effects, same input = same output)
 *   ✅ Function must do ONE thing well (Unix philosophy)
 *   ✅ Function must be generic enough to be useful across different contexts
 *   ❌ No module-specific business logic
 *   ❌ No DOM manipulation that's specific to one module's UI
 *   ❌ No functions that maintain state or have side effects
 *
 * Guidelines for Contributors:
 *   - Before adding a function, check if it's already used in 2+ modules
 *   - Write comprehensive JSDoc comments with examples
 *   - Include input validation and error handling
 *   - Add unit tests for all functions
 *   - Keep functions small and focused
 *   - Use descriptive names that clearly indicate purpose
 */

/* eslint-env browser, node */

(function () {
    "use strict";

    // ==========================================================================
    // MUSIC THEORY UTILITIES
    // ==========================================================================
    // Functions for musical calculations, note conversions, and theory operations
    // Used by: Chordonika, Clavonika, Jackonika, and potentially others
    //
    // Examples of what belongs here:
    // - midiToNoteName(60) → "C4"
    // - noteNameToMidi("A4") → 69
    // - midiToFrequency(69) → 440
    // - calculateInterval(60, 64) → 4 (major third)
    // - transposeNote(60, 7) → 67 (transpose C4 up a fifth)
    // - getScaleNotes("C", "major") → ["C", "D", "E", "F", "G", "A", "B"]
    // - getChordTones("Cmaj7") → [0, 4, 7, 11] (intervals from root)
    //
    // Criteria: If multiple modules need to convert between MIDI numbers,
    // note names, frequencies, or perform music theory calculations

    // --- Constants ---
    // MUSIC_CONSTANTS = { SEMITONES_PER_OCTAVE: 12, NOTE_NAMES: [...], etc. }

    // --- Note Conversion Functions ---
    // Convert between different note representations

    // --- Interval and Scale Functions ---
    // Calculate musical intervals, scales, and relationships

    // --- Chord Analysis Functions ---
    // Analyze and manipulate chord structures

    // ==========================================================================
    // TIMING AND RHYTHM UTILITIES
    // ==========================================================================
    // Functions for BPM, timing, quantization, and rhythm calculations
    // Used by: Rhythonika, Catchonika, Soundonika, and timing-sensitive modules
    //
    // Examples of what belongs here:
    // - bpmToMs(120) → 500 (milliseconds per beat)
    // - msToBpm(500) → 120 (BPM from milliseconds)
    // - getSubdivisionTiming(120, 8) → 250 (eighth note timing at 120 BPM)
    // - quantizeToGrid(1234, 120, 4) → 1250 (quantize to nearest quarter note)
    // - calculateSwing(0.5, 0.67) → swing timing adjustment
    // - timeSignatureToBeats("4/4") → { beatsPerBar: 4, beatUnit: 4 }
    //
    // Criteria: If multiple modules need timing calculations, BPM conversions,
    // or rhythm-related math

    // --- BPM and Timing Conversion ---
    // Convert between different time representations

    // --- Quantization Functions ---
    // Snap timing to musical grids

    // --- Rhythm Pattern Utilities ---
    // Analyze and manipulate rhythm patterns

    // ==========================================================================
    // DOM AND UI UTILITIES
    // ==========================================================================
    // Generic DOM manipulation and UI helper functions
    // Used by: All UI modules (Clavonika, Chordonika, Rhythonika, etc.)
    //
    // Examples of what belongs here:
    // - createElement("div", {className: "tonika-button"}, "Click me")
    // - addBemModifier(element, "active") → adds "tonika-button--active"
    // - removeBemModifier(element, "disabled")
    // - debounce(function, 300) → debounced function
    // - throttle(function, 100) → throttled function
    // - getElementPosition(element) → {x, y, width, height}
    //
    // Criteria: If multiple modules need the same DOM operations or
    // UI interaction patterns
    //
    // Note: Module-specific UI logic should stay in the module.
    // Only generic, reusable DOM operations belong here.

    // --- Element Creation and Manipulation ---
    // Generic DOM element utilities

    // --- BEM CSS Helper Functions ---
    // Utilities for consistent BEM class management

    // --- Event Handling Utilities ---
    // Debounce, throttle, and other event helpers

    // --- Layout and Positioning ---
    // Generic layout calculation functions

    // ==========================================================================
    // AUDIO CONTEXT UTILITIES
    // ==========================================================================
    // Shared audio context management and audio-related utilities
    // Used by: Soundonika, Rhythonika, and any modules dealing with audio
    //
    // Examples of what belongs here:
    // - getAudioContext() → shared AudioContext instance
    // - resumeAudioContext() → handle user interaction requirement
    // - createGainNode(volume) → standardized gain node creation
    // - scheduleAudioEvent(time, callback) → precise audio scheduling
    // - getAudioContextTime() → current audio context time
    //
    // Criteria: If multiple modules need audio context operations or
    // audio timing functionality

    // --- Audio Context Management ---
    // Shared audio context creation and management

    // --- Audio Scheduling Utilities ---
    // Precise timing for audio events

    // --- Audio Node Helpers ---
    // Common audio node creation and configuration

    // ==========================================================================
    // VALIDATION AND TYPE CHECKING
    // ==========================================================================
    // Input validation and type checking functions
    // Used by: All modules that need to validate user input or data
    //
    // Examples of what belongs here:
    // - isValidMidiNote(60) → true
    // - isValidBpm(120) → true
    // - isValidNoteName("C#4") → true
    // - clamp(150, 60, 200) → 150 (clamp value between min/max)
    // - validateChordSymbol("Cmaj7") → {valid: true, parsed: {...}}
    // - sanitizeUserInput(input) → cleaned input
    //
    // Criteria: If multiple modules need the same validation logic

    // --- MIDI and Music Validation ---
    // Validate musical data types

    // --- Range and Boundary Checking ---
    // Clamp and validate numeric ranges

    // --- Input Sanitization ---
    // Clean and validate user input

    // ==========================================================================
    // ARRAY AND OBJECT UTILITIES
    // ==========================================================================
    // Generic data manipulation functions
    // Used by: Any modules that work with arrays, objects, or collections
    //
    // Examples of what belongs here:
    // - unique([1,2,2,3]) → [1,2,3] (remove duplicates)
    // - deepClone(object) → deep copy of object
    // - groupBy(array, key) → group array items by property
    // - sortBy(array, key) → sort array by property
    // - findClosest(array, target) → find closest value in array
    //
    // Criteria: If multiple modules need the same data manipulation operations

    // --- Array Manipulation ---
    // Generic array processing functions

    // --- Object Utilities ---
    // Generic object manipulation functions

    // --- Collection Helpers ---
    // Functions for working with collections of data

    // ==========================================================================
    // STORAGE AND PERSISTENCE
    // ==========================================================================
    // Local storage and data persistence utilities
    // Used by: Modules that need to save/load settings or state
    //
    // Examples of what belongs here:
    // - saveToStorage(key, data) → save with error handling
    // - loadFromStorage(key, defaultValue) → load with fallback
    // - clearStorage(prefix) → clear all keys with prefix
    // - migrateStorageVersion(oldVersion, newVersion) → handle data migration
    //
    // Criteria: If multiple modules need localStorage operations with
    // consistent error handling and data format

    // --- Local Storage Helpers ---
    // Safe localStorage operations with error handling

    // --- Data Migration Utilities ---
    // Handle storage format changes between versions

    // ==========================================================================
    // ERROR HANDLING AND LOGGING
    // ==========================================================================
    // Consistent error handling and logging across modules
    // Used by: All modules for consistent error reporting
    //
    // Examples of what belongs here:
    // - logError(moduleName, error, context) → standardized error logging
    // - createError(type, message, data) → create structured error objects
    // - handleAsyncError(promise) → safe promise error handling
    // - debugLog(level, message, data) → conditional debug logging
    //
    // Criteria: If multiple modules need consistent error handling patterns

    // --- Error Creation and Handling ---
    // Standardized error objects and handling

    // --- Logging Utilities ---
    // Consistent logging across modules

    // ==========================================================================
    // PERFORMANCE UTILITIES
    // ==========================================================================
    // Performance monitoring and optimization helpers
    // Used by: Modules that need performance tracking or optimization
    //
    // Examples of what belongs here:
    // - measurePerformance(name, function) → time function execution
    // - createAnimationFrame(callback) → requestAnimationFrame wrapper
    // - createIdleCallback(callback) → requestIdleCallback wrapper
    // - memoryUsage() → get current memory usage info
    //
    // Criteria: If multiple modules need performance monitoring or
    // frame-based operations

    // --- Performance Monitoring ---
    // Measure and track performance metrics

    // --- Animation and Frame Utilities ---
    // Helpers for smooth animations and frame-based operations

    // ==========================================================================
    // EXPORT STRUCTURE
    // ==========================================================================

    const TonikaUtils = {
        // Music Theory
        // MUSIC_CONSTANTS: MUSIC_CONSTANTS,
        // midiToNoteName: midiToNoteName,
        // noteNameToMidi: noteNameToMidi,
        // ... other music functions

        // Timing
        // bpmToMs: bpmToMs,
        // msToBpm: msToBpm,
        // ... other timing functions

        // DOM
        // createElement: createElement,
        // addBemModifier: addBemModifier,
        // ... other DOM functions

        // Audio
        // getAudioContext: getAudioContext,
        // resumeAudioContext: resumeAudioContext,
        // ... other audio functions

        // Validation
        // isValidMidiNote: isValidMidiNote,
        // isValidBpm: isValidBpm,
        // ... other validation functions

        // Arrays/Objects
        // unique: unique,
        // deepClone: deepClone,
        // ... other utility functions

        // Storage
        // saveToStorage: saveToStorage,
        // loadFromStorage: loadFromStorage,
        // ... other storage functions

        // Error Handling
        // logError: logError,
        // createError: createError,
        // ... other error functions

        // Performance
        // measurePerformance: measurePerformance,
        // createAnimationFrame: createAnimationFrame,
        // ... other performance functions
    };

    // --- Exports ---------------------------------------------------------------
    if (typeof window !== "undefined") {
        window.Tonika = window.Tonika || {};
        window.Tonika.Utils = TonikaUtils;
    }

    // CommonJS support for testing
    if (typeof module !== "undefined" && module.exports) {
        module.exports = TonikaUtils;
    }

})();

/*
 * USAGE EXAMPLES FOR README:
 *
 * // Import in your module
 * const { midiToNoteName, bpmToMs } = Tonika.Utils;
 *
 * // Use in your code
 * const noteName = midiToNoteName(60); // "C4"
 * const beatTime = bpmToMs(120);       // 500ms
 *
 * // Create elements with BEM classes
 * const button = createElement('button', {
 *   className: 'tonika-button',
 *   dataset: { action: 'play' }
 * }, 'Play');
 *
 * // Add BEM modifiers
 * addBemModifier(button, 'active'); // adds 'tonika-button--active'
 *
 * TESTING GUIDELINES:
 * - Every function should have unit tests
 * - Test edge cases and error conditions
 * - Mock external dependencies (DOM, localStorage, etc.)
 * - Use descriptive test names that explain the expected behavior
 *
 * DOCUMENTATION GUIDELINES:
 * - Use JSDoc format for all functions
 * - Include @param and @returns tags
 * - Provide usage examples in comments
 * - Document any side effects or limitations
 * - Include @throws documentation for functions that can throw errors
 */

