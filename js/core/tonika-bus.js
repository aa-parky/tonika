/*!
 * Tonika Bus — Event communication system and module architecture foundation
 * Location: js/core/tonika-bus.js
 * Version: 1.0.0 - Clean implementation without legacy compatibility
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
 * "Bus" reflects this module's role as the central communication highway
 * for all Tonika modules. Like a computer bus or city bus system, it:
 *   - Connects different components (modules)
 *   - Provides a standardized interface for communication
 *   - Enables modules to discover and interact with each other
 *   - Remains neutral about what data flows through it
 *
 * USAGE PATTERN:
 * ==============
 * All modules extend TonikaModule for consistent patterns:
 *
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
 * Module Discovery:
 *   const modules = Tonika.TonikaModule.discoverModules();
 *   const chordonika = Tonika.TonikaModule.findModule('Chordonika');
 *
 * DEVELOPMENT GUIDELINES:
 * =======================
 * 1. Keep this module focused on communication only
 * 2. All functions should be pure or have minimal side effects
 * 3. Add features that benefit ALL modules, not specific ones
 * 4. Document everything - this is infrastructure code
 * 5. Test thoroughly - modules depend on this working correctly
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

        // Version tracking
        window.Tonika.version = window.Tonika.version || "1.0.0";
    }

    // ==========================================================================
    // TONIKA MODULE BASE CLASS
    // ==========================================================================
    // This is the foundation class that all Tonika modules extend.
    // It provides standardized patterns for initialization, communication,
    // registration, and debugging.

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
     * - Provide sensible defaults while allowing customization
     * - Make module development easier, not more complex
     * - Enable runtime introspection and debugging
     * - Support both simple and advanced use cases
     *
     * @extends EventTarget
     */
    class TonikaModule extends EventTarget {
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
        // EVENT SYSTEM METHODS
        // =========================================================================
        // Enhanced event methods with debugging and metadata

        /**
         * Add an event listener and return a convenient unsubscribe function.
         *
         * @param {string} type - Event type to listen for
         * @param {(event: CustomEvent<any>) => void} handler - Event handler function
         * @param {AddEventListenerOptions | boolean} [options] - Event listener options
         * @returns {() => void} unsubscribe - Function to remove this listener
         */
        on(type, handler, options) {
            this.addEventListener(type, handler, options);
            return () => this.removeEventListener(type, handler, options);
        }

        /**
         * Remove an event listener.
         *
         * @param {string} type - Event type
         * @param {(event: CustomEvent<any>) => void} handler - Handler to remove
         * @param {EventListenerOptions | boolean} [options] - Options used when adding
         */
        off(type, handler, options) {
            this.removeEventListener(type, handler, options);
        }

        /**
         * Dispatch a CustomEvent with enhanced debugging and metadata.
         *
         * @param {string} type - Event type (use namespaced names like 'ui:chord:selected')
         * @param {any} [detail] - Event payload data
         */
        emit(type, detail) {
            // Enhance detail with metadata for debugging
            const enrichedDetail = {
                ...detail,
                _meta: {
                    timestamp: Date.now(),
                    source: this.moduleInfo?.name || 'Unknown',
                    version: this.moduleInfo?.version || '1.0.0'
                }
            };

            // Debug logging
            if (typeof window !== "undefined" && window.Tonika.debug) {
                console.log(`[${enrichedDetail._meta.source}] → ${type}`, detail);

                // Add to the event log (keep last 100 events)
                window.Tonika.EventLog.push({
                    type,
                    detail: enrichedDetail,
                    timestamp: enrichedDetail._meta.timestamp
                });

                // Trim log to prevent memory issues
                if (window.Tonika.EventLog.length > 100) {
                    window.Tonika.EventLog = window.Tonika.EventLog.slice(-100);
                }
            }

            // Dispatch the event
            this.dispatchEvent(new CustomEvent(type, { detail: enrichedDetail }));
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

                // Register with system (after successful initialization)
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
                    hasMount: !!this.mount,
                    initTime: this._initEndTime ? (this._initEndTime - this._initStartTime) : null
                },
                mount: {
                    element: this.mount,
                    selector: this.mount?.id ? `#${this.mount.id}` :
                        this.mount?.className ? `.${this.mount.className.split(' ')[0]}` :
                            'unknown'
                }
            };
        }

        /**
         * Get a list of public methods (override in subclasses).
         *
         * @protected
         * @returns {string[]} Array of public method names
         */
        _getPublicMethods() {
            return ['getStatus', 'destroy'];
        }

        /**
         * Get the list of events this module emits (override in subclasses).
         *
         * @protected
         * @returns {string[]} Array of event names this module emits
         */
        _getEmittedEvents() {
            return ['app:status', 'system:module:registered'];
        }

        /**
         * Get a list of events this module listens to (override in subclasses).
         *
         * @protected
         * @returns {string[]} Array of event names this module listens to
         */
        _getListenedEvents() {
            return [];
        }

        /**
         * Clean up module resources and remove from registry.
         */
        destroy() {
            this.isDestroyed = true;

            // Remove from global registry
            if (typeof window !== "undefined" && window.Tonika.ModuleRegistry[this.moduleInfo.name]) {
                delete window.Tonika.ModuleRegistry[this.moduleInfo.name];
            }

            // Emit destruction event
            this.emit('system:module:destroyed', { name: this.moduleInfo.name });
        }

        // =========================================================================
        // STATIC UTILITY METHODS
        // =========================================================================
        // Class-level methods for module discovery and management

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
         */
        static setDebugMode(enabled) {
            if (typeof window !== "undefined") {
                window.Tonika.debug = enabled;
                console.log(`Tonika debug mode: ${enabled ? 'enabled' : 'disabled'}`);
            }
        }

        /**
         * Get the recent event log for debugging.
         *
         * @static
         * @param {number} limit - Number of recent events to return
         * @returns {Object[]} Array of recent events
         */
        static getEventLog(limit = 50) {
            if (typeof window !== "undefined") {
                return window.Tonika.EventLog.slice(-limit);
            }
            return [];
        }
    }

    // ==========================================================================
    // EXPORTS AND NAMESPACE SETUP
    // ==========================================================================
    // Make classes available globally and for CommonJS environments

    if (typeof window !== "undefined") {
        window.Tonika.TonikaModule = TonikaModule;
    }

    // CommonJS export for testing environments
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { TonikaModule };
    }

})();

/*
 * =============================================================================
 * USAGE EXAMPLES AND DEVELOPMENT GUIDE
 * =============================================================================
 *
 * CREATING A NEW MODULE:
 *
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
 *   _initialize() {
 *     // Your initialization code here
 *     this._renderUI();
 *     this._attachEventListeners();
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
 * DEVELOPMENT AND DEBUGGING TOOLS:
 *
 * // Enable debug mode
 * Tonika.TonikaModule.setDebugMode(true);
 *
 * // Discover modules
 * const modules = Tonika.TonikaModule.discoverModules();
 * console.table(modules);
 *
 * // Find specific module
 * const chordonika = Tonika.TonikaModule.findModule('Chordonika');
 * console.log(chordonika.getStatus());
 *
 * // View event log
 * const events = Tonika.TonikaModule.getEventLog(20);
 * console.table(events);
 *
 * // Inspect module registry
 * console.log(Tonika.ModuleRegistry);
 *
 * EVENT NAMING CONVENTIONS:
 *
 * app:*        - Lifecycle (status, ready)
 * ui:*         - User interactions
 * midi:*       - MIDI hardware events
 * music:*      - Musical analysis
 * audio:*      - Audio engine events
 * system:*     - Internal bus operations
 */

