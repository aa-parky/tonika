/*!
 * Tonika Bus — Event communication system and module architecture foundation
 * Location: js/core/tonika-bus.js (evolved from tonika-emitter.js)
 *
 * ARCHITECTURAL PHILOSOPHY:
 * =========================
 * This module embodies the Unix philosophy of "do one thing and do it well."
 * Its single responsibility is EVENT COMMUNICATION between Tonika modules.
 * It does NOT:
 *   ❌ Manage module business logic
 *   ❌ Handle UI rendering
 *   ❌ Process audio or MIDI data
 *   ❌ Make decisions about module behavior
 *
 * It DOES:
 *   ✅ Provide standardized event emission and listening
 *   ✅ Enable module discovery and registration
 *   ✅ Offer debugging and development tools
 *   ✅ Ensure consistent communication patterns
 *
 * NAMING RATIONALE:
 * =================
 * "Bus" better reflects this module's role as the central communication highway
 * for all Tonika modules. Like a computer bus or city bus system, it:
 *   - Connects different components (modules)
 *   - Provides a standardized interface for communication
 *   - Enables modules to discover and interact with each other
 *   - Remains neutral about what data flows through it
 *
 * EVOLUTION FROM tonika-emitter.js:
 * =================================
 * The original TonikaEmitter class remains unchanged - it's proven and stable.
 * New additions provide:
 *   - Module base class for consistent patterns
 *   - Registry system for module discovery
 *   - Enhanced debugging and development tools
 *   - Standardized initialization patterns
 *   - Event metadata and tracing capabilities
 *
 * USAGE PATTERNS:
 * ===============
 *
 * Basic Event Communication (unchanged):
 *   class MyModule extends Tonika.TonikaEmitter {
 *     init() {
 *       this.emit('status', { state: 'ready' });
 *     }
 *   }
 *
 * Enhanced Module Pattern (new):
 *   class MyModule extends Tonika.TonikaModule {
 *     constructor(opts = {}) {
 *       super({
 *         ...opts,
 *         moduleInfo: {
 *           name: 'MyModule',
 *           version: '1.0.0',
 *           description: 'Does something musical'
 *         }
 *       });
 *     }
 *   }
 *
 * Module Discovery (new):
 *   const modules = Tonika.TonikaModule.discoverModules();
 *   const chordonika = Tonika.TonikaModule.findModule('Chordonika');
 *
 * DEVELOPMENT GUIDELINES:
 * =======================
 * 1. Keep this module focused on communication only
 * 2. All functions should be pure or have minimal side effects
 * 3. Maintain backward compatibility with existing TonikaEmitter usage
 * 4. Add features that benefit ALL modules, not specific ones
 * 5. Document everything - this is infrastructure code
 * 6. Test thoroughly - modules depend on this working correctly
 *
 * MIGRATION PATH:
 * ===============
 * Phase 1: Rename file, keep all existing functionality
 * Phase 2: Add TonikaModule base class
 * Phase 3: Migrate modules one by one to use TonikaModule
 * Phase 4: Add advanced features (registry, debugging, etc.)
 * Phase 5: Deprecate old patterns gracefully
 */

/* eslint-env browser, node */

(function () {
    "use strict";

    // ==========================================================================
    // NAMESPACE AND GLOBAL STATE MANAGEMENT
    // ==========================================================================
    // Initialize the Tonika namespace and global registries
    // This provides a clean, organized way for modules to find each other

    if (typeof window !== "undefined") {
        window.Tonika = window.Tonika || {};

        // Module registry for discovery and introspection
        // Key: module name, Value: module instance
        window.Tonika.ModuleRegistry = window.Tonika.ModuleRegistry || {};

        // Event log for debugging and development
        // Stores recent events for inspection and debugging
        window.Tonika.EventLog = window.Tonika.EventLog || [];

        // Debug mode flag - enables detailed logging and tracing
        window.Tonika.debug = window.Tonika.debug || false;

        // Version tracking for compatibility management
        window.Tonika.version = window.Tonika.version || "2.0.0";
    }

    // ==========================================================================
    // CORE EVENT EMITTER CLASS (UNCHANGED FROM ORIGINAL)
    // ==========================================================================
    // This is the proven, stable foundation that existing modules depend on.
    // We keep it exactly as it is to maintain backward compatibility.

    class TonikaEmitter extends EventTarget {
        // noinspection JSUnusedGlobalSymbols
        /**
         * Add an event listener and return a convenient unsubscribe function.
         *
         * This method provides a more ergonomic API than addEventListener by
         * returning an unsubscribe function, making cleanup easier and reducing
         * memory leaks in dynamic applications.
         *
         * @param {string} type - Event type to listen for
         * @param {(event: CustomEvent<any>) => void} handler - Event handler function
         * @param {AddEventListenerOptions | boolean} [options] - Event listener options
         * @returns {() => void} unsubscribe - Function to remove this listener
         *
         * @example
         * const unsubscribe = emitter.on('chord:selected', (event) => {
         *   console.log('Chord selected:', event.detail.chord);
         * });
         *
         * // Later, clean up
         * unsubscribe();
         */
        on(type, handler, options) {
            this.addEventListener(type, handler, options);
            return () => this.removeEventListener(type, handler, options);
        }

        // noinspection JSUnusedGlobalSymbols
        /**
         * Remove an event listener.
         *
         * Direct the wrapper around removeEventListener for API consistency.
         * Most code should prefer the unsubscribe function returned by on().
         *
         * @param {string} type - Event type
         * @param {(event: CustomEvent<any>) => void} handler - Handler to remove
         * @param {EventListenerOptions | boolean} [options] - Options used when adding
         */
        off(type, handler, options) {
            this.removeEventListener(type, handler, options);
        }

        // noinspection JSUnusedGlobalSymbols
        /**
         * Dispatch a CustomEvent with a `detail` payload.
         *
         * This is the heart of the Tonika communication system. All inter-module
         * communication flows through this method. In the enhanced version, we'll
         * add metadata and debugging capabilities while keeping the core API the same.
         *
         * @param {string} type - Event type (use namespaced names like 'ui:chord:selected')
         * @param {any} [detail] - Event payload data
         *
         * @example
         * this.emit('ui:chord:selected', {
         *   chord: 'image7',
         *   notes: ['C', 'E', 'G', 'B'],
         *   timestamp: Date.now()
         * });
         */
        emit(type, detail) {
            this.dispatchEvent(new CustomEvent(type, { detail }));
        }
    }

    // ==========================================================================
    // ENHANCED MODULE BASE CLASS (NEW FUNCTIONALITY)
    // ==========================================================================
    // This extends TonikaEmitter with standardized patterns for module development.
    // It provides consistent initialization, registration, and introspection
    // capabilities while maintaining the simplicity of the original emitter.

    /**
     * Base class for all Tonika modules providing standardized patterns.
     *
     * This class establishes consistent patterns for:
     * - Module initialization and lifecycle management
     * - Event-driven communication between modules
     * - Self-documentation and API introspection
     * - Development and debugging support
     *
     * DESIGN PRINCIPLES:
     * - Extend, don't replace, the proven TonikaEmitter
     * - Provide sensible defaults while allowing customization
     * - Make module development easier, not more complex
     * - Enable runtime introspection and debugging
     * - Support both simple and advanced use cases
     *
     * @extends TonikaEmitter
     */
    class TonikaModule extends TonikaEmitter {
        /**
         * Create a new Tonika module with standardized initialization.
         *
         * @param {Object} opts - Configuration options
         * @param {Object} opts.moduleInfo - Module metadata
         * @param {string} opts.moduleInfo.name - Module name (required)
         * @param {string} opts.moduleInfo.version - Module version (default: "1.0.0")
         * @param {string} opts.moduleInfo.description - Module description
         * @param {string|HTMLElement} opts.mount - DOM mount target
         * @param {boolean} opts.deferInit - Whether to defer initialization (default: false)
         *
         * @example
         * class MyModule extends Tonika.TonikaModule {
         *   constructor(opts = {}) {
         *     super({
         *       ...opts,
         *       moduleInfo: {
         *         name: 'MyModule',
         *         version: '1.0.0',
         *         description: 'My custom Tonika module'
         *       }
         *     });
         *   }
         * }
         */
        constructor(opts = {}) {
            super();

            // =======================================================================
            // MODULE METADATA AND CONFIGURATION
            // =======================================================================
            // Store essential information about this module for registry and debugging

            this.moduleInfo = {
                name: 'UnnamedModule',
                version: '1.0.0',
                description: 'A Tonika module',
                ...opts.moduleInfo
            };

            // Validate required fields
            if (!this.moduleInfo.name || this.moduleInfo.name === 'UnnamedModule') {
                console.warn('TonikaModule: Module should provide a name in moduleInfo');
            }

            // =======================================================================
            // DOM MOUNT TARGET RESOLUTION
            // =======================================================================
            // Handle both string selectors and direct DOM element references

            this.mount = this._resolveMount(opts.mount);

            // =======================================================================
            // MODULE STATE TRACKING
            // =======================================================================
            // Track module lifecycle for debugging and introspection

            this.isInitialized = false;
            this.isDestroyed = false;
            this._initStartTime = null;
            this._initEndTime = null;

            // =======================================================================
            // GLOBAL REGISTRATION
            // =======================================================================
            // Register this module in the global registry for discovery

            if (typeof window !== "undefined") {
                window.Tonika.ModuleRegistry[this.moduleInfo.name] = this;
            }

            // =======================================================================
            // INITIALIZATION SEQUENCE
            // =======================================================================
            // Initialize unless deferred (allows for custom initialization timing)

            if (!opts.deferInit) {
                // Use setTimeout to ensure the constructor completes first
                setTimeout(() => this._performInitialization(), 0);
            }
        }

        // =========================================================================
        // PRIVATE HELPER METHODS
        // =========================================================================
        // Internal methods that support the public API

        /**
         * Resolve mount target from string selector or DOM element.
         *
         * @private
         * @param {string|HTMLElement} mount - Mount target
         * @returns {HTMLElement|null} Resolved DOM element
         */
        _resolveMount(mount) {
            if (typeof mount === 'string') {
                const element = document.querySelector(mount);
                if (!element) {
                    console.warn(`[${this.moduleInfo.name}] Mount target not found: ${mount}`);
                }
                return element;
            }
            return mount || null;
        }

        /**
         * Internal initialization sequence with error handling and timing.
         *
         * @private
         */
        _performInitialization() {
            this._initStartTime = performance.now();

            try {
                // Emit initialization start event
                this.emit('app:status', {
                    state: 'initializing',
                    module: this.moduleInfo.name
                });

                // Call user-defined initialization if it exists
                if (typeof this._initialize === 'function') {
                    this._initialize();
                }

                // Mark as initialized
                this.isInitialized = true;
                this._initEndTime = performance.now();

                // Emit ready event
                this.emit('app:status', {
                    state: 'ready',
                    module: this.moduleInfo.name,
                    initTime: this._initEndTime - this._initStartTime
                });

                // Register with a system (after successful initialization)
                this.emit('system:module:registered', {
                    name: this.moduleInfo.name,
                    version: this.moduleInfo.version,
                    capabilities: this.getStatus()
                });

            } catch (error) {
                console.error(`[${this.moduleInfo.name}] Initialization failed:`, error);
                this.emit('app:status', {
                    state: 'error',
                    module: this.moduleInfo.name,
                    error: error.message
                });
            }
        }

        // =========================================================================
        // PUBLIC API METHODS
        // =========================================================================
        // Methods that modules and external code can use

        /**
         * Get comprehensive status information about this module.
         *
         * This method provides runtime introspection capabilities, allowing
         * other modules and development tools to understand what this module
         * can do and how to interact with it.
         *
         * Override this method in subclasses to provide module-specific information.
         * Always call super.getStatus() to include base functionality.
         *
         * @returns {Object} Status object with API, state, and metadata
         *
         * @example
         * getStatus() {
         *   return {
         *     ...super.getStatus(),
         *     api: {
         *       methods: ['selectChord', 'clearSelection'],
         *       events: {
         *         emits: ['ui:chord:selected', 'ui:chord:cleared'],
         *         listens: ['midi:note:on', 'midi:note:off']
         *       }
         *     },
         *     state: {
         *       currentChord: this.currentChord,
         *       isActive: this.isActive
         *     }
         *   };
         * }
         */
        getStatus() {
            return {
                module: {
                    name: this.moduleInfo.name,
                    version: this.moduleInfo.version,
                    description: this.moduleInfo.description
                },
                api: {
                    methods: this._getPublicMethods(),
                    events: {
                        emits: this._getEmittedEvents(),
                        listens: this._getListenedEvents()
                    }
                },
                state: {
                    isInitialized: this.isInitialized,
                    isDestroyed: this.isDestroyed,
                    hasMountTarget: !!this.mount,
                    initTime: this._initEndTime ? (this._initEndTime - this._initStartTime) : null
                },
                mount: this.mount ? (this.mount.id || this.mount.className || 'mounted') : 'not-mounted'
            };
        }

        /**
         * Clean up module resources and unregister from the system.
         *
         * Call this method when a module is no longer needed to prevent
         * memory leaks and clean up event listeners.
         */
        destroy() {
            if (this.isDestroyed) return;

            // Emit destruction event before cleanup
            this.emit('system:module:destroyed', {
                name: this.moduleInfo.name
            });

            // Remove from global registry
            if (typeof window !== "undefined") {
                delete window.Tonika.ModuleRegistry[this.moduleInfo.name];
            }

            // Update state
            this.isDestroyed = true;
            this.isInitialized = false;
        }

        // =========================================================================
        // INTROSPECTION HELPER METHODS (OVERRIDE IN SUBCLASSES)
        // =========================================================================
        // These methods provide default introspection. Subclasses should override
        // them to provide accurate information about their specific capabilities.

        /**
         * Get a list of public methods (override in subclasses for accuracy).
         *
         * @protected
         * @returns {string[]} Array of public method names
         */
        _getPublicMethods() {
            const methods = [];
            const proto = Object.getPrototypeOf(this);
            const propNames = Object.getOwnPropertyNames(proto);

            for (const name of propNames) {
                if (typeof this[name] === 'function' &&
                    !name.startsWith('_') &&
                    name !== 'constructor' &&
                    name !== 'getStatus') {
                    methods.push(name);
                }
            }

            return methods;
        }

        /**
         * Get the list of events this module emits (override in subclasses).
         *
         * @protected
         * @returns {string[]} Array of event type names
         */
        _getEmittedEvents() {
            return ['app:status', 'system:module:registered', 'system:module:destroyed'];
        }

        /**
         * Get a list of events this module listens to (override in subclasses).
         *
         * @protected
         * @returns {string[]} Array of event type names
         */
        _getListenedEvents() {
            return [];
        }

        // =========================================================================
        // STATIC UTILITY METHODS
        // =========================================================================
        // Class-level methods for module discovery and system management

        /**
         * Get the global module registry.
         *
         * @static
         * @returns {Object} Registry object mapping module names to instances
         */
        static getRegistry() {
            return (typeof window !== "undefined") ? window.Tonika.ModuleRegistry : {};
        }

        /**
         * Discover all registered modules and their capabilities.
         *
         * @static
         * @returns {Object[]} Array of module information objects
         *
         * @example
         * const modules = Tonika.TonikaModule.discoverModules();
         * console.log('Available modules:', modules.map(m => m.name));
         */
        static discoverModules() {
            const registry = this.getRegistry();
            return Object.values(registry).map(module => ({
                name: module.moduleInfo.name,
                status: module.getStatus()
            }));
        }

        /**
         * Find a specific module by name.
         *
         * @static
         * @param {string} name - Module name to find
         * @returns {TonikaModule|null} Module instance or null if not found
         *
         * @example
         * const chordonika = Tonika.TonikaModule.findModule('Chordonika');
         * if (chordonika) {
         *   chordonika.selectChord('C', 'major');
         * }
         */
        static findModule(name) {
            const registry = this.getRegistry();
            return registry[name] || null;
        }

        /**
         * Enable or disable debug mode for enhanced logging.
         *
         * @static
         * @param {boolean} enabled - Whether to enable debug mode
         *
         * @example
         * // Enable debug mode during development
         * Tonika.TonikaModule.setDebugMode(true);
         */
        static setDebugMode(enabled) {
            if (typeof window !== "undefined") {
                window.Tonika.debug = enabled;
                console.log(`Tonika debug mode: ${enabled ? 'enabled' : 'disabled'}`);
            }
        }

        /**
         * Get recent event log for debugging.
         *
         * @static
         * @param {number} limit - Number of recent events to return
         * @returns {Object[]} Array of recent events
         *
         * @example
         * // Check recent events for debugging
         * const events = Tonika.TonikaModule.getEventLog(10);
         * console.table(events);
         */
        static getEventLog(limit = 50) {
            if (typeof window !== "undefined") {
                return window.Tonika.EventLog.slice(-limit);
            }
            return [];
        }
    }

    // ==========================================================================
    // ENHANCED EMITTER WITH DEBUGGING (FUTURE ENHANCEMENT)
    // ==========================================================================
    // This section outlines how the basic TonikaEmitter could be enhanced
    // with debugging capabilities while maintaining backward compatibility.
    //
    // IMPLEMENTATION STRATEGY:
    // 1. Keep the original TonikaEmitter unchanged for compatibility
    // 2. Create TonikaEmitterEnhanced that extends TonikaEmitter
    // 3. TonikaModule uses TonikaEmitterEnhanced internally
    // 4. Gradually migrate modules to enhanced version
    //
    // ENHANCED FEATURES TO ADD:
    // - Event metadata (timestamp, source module, version)
    // - Event logging for debugging
    // - Event filtering and namespacing
    // - Performance monitoring
    // - Event replay capabilities
    //
    // EXAMPLE ENHANCED EMIT METHOD:
    // emit(type, detail) {
    //   const enrichedDetail = {
    //     ...detail,
    //     _meta: {
    //       timestamp: Date.now(),
    //       source: this.moduleInfo?.name || 'Unknown',
    //       version: this.moduleInfo?.version || '1.0.0'
    //     }
    //   };
    //
    //   // Debug logging
    //   if (window.Tonika.debug) {
    //     console.log(`[${enrichedDetail._meta.source}] → ${type}`, detail);
    //     window.Tonika.EventLog.push({ type, detail: enrichedDetail });
    //   }
    //
    //   super.emit(type, enrichedDetail);
    // }

    // ==========================================================================
    // EXPORTS AND NAMESPACE SETUP
    // ==========================================================================
    // Make classes available globally and for CommonJS environments

    if (typeof window !== "undefined") {
        window.Tonika.TonikaEmitter = TonikaEmitter;
        window.Tonika.TonikaModule = TonikaModule;
    }

    // Guarded CommonJS export for testing environments
    // noinspection JSUnresolvedVariable
    if (typeof module !== "undefined" && module.exports) {
        // noinspection JSUnresolvedVariable
        module.exports = { TonikaEmitter, TonikaModule };
    }

})();

/*
 * =============================================================================
 * MIGRATION GUIDE FOR EXISTING MODULES
 * =============================================================================
 *
 * PHASE 1: RENAME FILE (NO CODE CHANGES)
 * - Rename tonika-emitter.js to tonika-bus.js
 * - Update HTML script tags and import statements
 * - No functional changes - everything works as before
 *
 * PHASE 2: MIGRATE TO TonikaModule (OPTIONAL BUT RECOMMENDED)
 *
 * BEFORE (current pattern):
 * class MyModule extends Tonika.TonikaEmitter {
 *   constructor(opts = {}) {
 *     super();
 *     this.mount = document.querySelector(opts.mount);
 *     this._initialize();
 *   }
 * }
 *
 * AFTER (enhanced pattern):
 * class MyModule extends Tonika.TonikaModule {
 *   constructor(opts = {}) {
 *     super({
 *       ...opts,
 *       moduleInfo: {
 *         name: 'MyModule',
 *         version: '1.0.0',
 *         description: 'What this module does'
 *       }
 *     });
 *   }
 *
 *   getStatus() {
 *     return {
 *       ...super.getStatus(),
 *       api: {
 *         methods: ['myMethod1', 'myMethod2'],
 *         events: {
 *           emits: ['my:event1', 'my:event2'],
 *           listens: ['other:event1']
 *         }
 *       }
 *     };
 *   }
 * }
 *
 * BENEFITS OF MIGRATION:
 * - Automatic module registration and discovery
 * - Standardized initialization patterns
 * - Built-in getStatus() for API documentation
 * - Enhanced debugging and development tools
 * - Consistent error handling and lifecycle management
 *
 * =============================================================================
 * DEVELOPMENT AND DEBUGGING TOOLS
 * =============================================================================
 *
 * ENABLE DEBUG MODE:
 * Tonika.TonikaModule.setDebugMode(true);
 *
 * DISCOVER MODULES:
 * const modules = Tonika.TonikaModule.discoverModules();
 * console.table(modules);
 *
 * FIND SPECIFIC MODULE:
 * const chordonika = Tonika.TonikaModule.findModule('Chordonika');
 * console.log(chordonika.getStatus());
 *
 * VIEW EVENT LOG:
 * const events = Tonika.TonikaModule.getEventLog(20);
 * console.table(events);
 *
 * INSPECT MODULE REGISTRY:
 * console.log(Tonika.ModuleRegistry);
 *
 * =============================================================================
 * EVENT NAMING CONVENTIONS
 * =============================================================================
 *
 * Use namespaced event names for clarity and organization:
 *
 * LIFECYCLE EVENTS:
 * - app:status (module lifecycle: initializing, ready, error)
 * - system:module:registered (module registration)
 * - system:module:destroyed (module cleanup)
 *
 * UI EVENTS:
 * - ui:chord:selected (user selected a chord)
 * - ui:note:pressed (user pressed a key)
 * - ui:button:clicked (user clicked a button)
 *
 * MIDI EVENTS:
 * - midi:note:on (MIDI note on received)
 * - midi:note:off (MIDI note off received)
 * - midi:device:connected (MIDI device connected)
 *
 * AUDIO EVENTS:
 * - audio:sample:loaded (audio sample finished loading)
 * - audio:context:ready (audio context is ready)
 * - audio:playback:started (audio playback started)
 *
 * MUSIC EVENTS:
 * - music:chord:detected (chord detected from input)
 * - music:key:changed (musical key changed)
 * - music:tempo:changed (tempo/BPM changed)
 *
 * =============================================================================
 * TESTING GUIDELINES
 * =============================================================================
 *
 * UNIT TESTING:
 * - Test TonikaEmitter methods (on, off, emit)
 * - Test TonikaModule initialization and lifecycle
 * - Test module registration and discovery
 * - Mock DOM elements and browser APIs
 *
 * INTEGRATION TESTING:
 * - Test module-to-module communication
 * - Test event flow between multiple modules
 * - Test error handling and recovery
 *
 * EXAMPLE TEST STRUCTURE:
 * describe('TonikaModule', () => {
 *   it('should register itself on creation', () => {
 *     const module = new TestModule({ moduleInfo: { name: 'Test' } });
 *     expect(Tonika.ModuleRegistry.Test).toBe(module);
 *   });
 *
 *   it('should emit registration event', (done) => {
 *     const module = new TestModule({ moduleInfo: { name: 'Test' } });
 *     module.on('system:module:registered', (event) => {
 *       expect(event.detail.name).toBe('Test');
 *       done();
 *     });
 *   });
 * });
 */

