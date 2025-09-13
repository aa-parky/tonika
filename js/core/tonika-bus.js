/*!
 * Tonika Bus — Event communication system and module architecture foundation
 * Location: js/core/tonika-bus.js
 * Version: 1.1.0 - Adds central Bus singleton and global re-emit
 */

/* eslint-env browser, node */

(function () {
    "use strict";

    // ==========================================================================
    // NAMESPACE AND GLOBAL STATE MANAGEMENT
    // ==========================================================================
    if (typeof window !== "undefined") {
        window.Tonika = window.Tonika || {};

        // Module registry for discovery and introspection
        window.Tonika.ModuleRegistry = window.Tonika.ModuleRegistry || {};

        // Event log for debugging and development
        window.Tonika.EventLog = window.Tonika.EventLog || [];

        // Debug mode flag - enables detailed logging and tracing
        window.Tonika.debug = window.Tonika.debug || false;

        // Version tracking
        window.Tonika.version = window.Tonika.version || "1.1.0";

        // NEW: central Bus singleton
        window.Tonika.Bus = window.Tonika.Bus || new EventTarget();

        // Convenience helpers
        window.Tonika.Bus.on = (type, handler, options) => {
            window.Tonika.Bus.addEventListener(type, handler, options);
            return () => window.Tonika.Bus.removeEventListener(type, handler, options);
        };
        window.Tonika.Bus.off = (type, handler, options) => {
            window.Tonika.Bus.removeEventListener(type, handler, options);
        };
    }

    // ==========================================================================
    // TONIKA MODULE BASE CLASS
    // ==========================================================================
    class TonikaModule extends EventTarget {
        constructor(opts = {}) {
            super();

            this.moduleInfo = {
                name: 'UnnamedModule',
                version: '1.0.0',
                description: 'A Tonika module',
                ...opts.moduleInfo
            };

            if (!this.moduleInfo.name || this.moduleInfo.name === 'UnnamedModule') {
                console.warn('TonikaModule: Module should provide a name in moduleInfo');
            }

            this.mount = typeof opts.mount === "string"
                ? document.querySelector(opts.mount)
                : opts.mount || null;

            this.isInitialized = false;
            this.isDestroyed = false;
            this._initStartTime = null;
            this._initEndTime = null;

            if (typeof window !== "undefined") {
                window.Tonika.ModuleRegistry[this.moduleInfo.name] = this;
            }

            if (!opts.deferInit) {
                setTimeout(() => this._performInitialization(), 0);
            }
        }

        on(type, handler, options) {
            this.addEventListener(type, handler, options);
            return () => this.removeEventListener(type, handler, options);
        }

        off(type, handler, options) {
            this.removeEventListener(type, handler, options);
        }

        emit(type, detail) {
            const enrichedDetail = {
                ...detail,
                _meta: {
                    timestamp: Date.now(),
                    source: this.moduleInfo?.name || 'Unknown',
                    version: this.moduleInfo?.version || '1.0.0'
                }
            };

            if (typeof window !== "undefined" && window.Tonika.debug) {
                console.log(`[${enrichedDetail._meta.source}] → ${type}`, detail);
                window.Tonika.EventLog.push({
                    type,
                    detail: enrichedDetail,
                    timestamp: enrichedDetail._meta.timestamp
                });
                if (window.Tonika.EventLog.length > 100) {
                    window.Tonika.EventLog = window.Tonika.EventLog.slice(-100);
                }
            }

            // Local dispatch
            this.dispatchEvent(new CustomEvent(type, { detail: enrichedDetail }));

            // NEW: Global Bus dispatch
            if (typeof window !== "undefined" && window.Tonika.Bus) {
                window.Tonika.Bus.dispatchEvent(new CustomEvent(type, { detail: enrichedDetail }));
            }
        }

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

        _performInitialization() {
            this._initStartTime = performance.now();
            try {
                this.emit('app:status', {
                    state: 'initializing',
                    module: this.moduleInfo.name
                });

                if (typeof this._initialize === 'function') {
                    this._initialize();
                }

                this.isInitialized = true;
                this._initEndTime = performance.now();

                this.emit('app:status', {
                    state: 'ready',
                    module: this.moduleInfo.name,
                    initTime: this._initEndTime - this._initStartTime
                });

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

        _getPublicMethods() {
            return ['getStatus', 'destroy'];
        }
        _getEmittedEvents() {
            return ['app:status', 'system:module:registered'];
        }
        _getListenedEvents() {
            return [];
        }

        destroy() {
            this.isDestroyed = true;
            if (typeof window !== "undefined" && window.Tonika.ModuleRegistry[this.moduleInfo.name]) {
                delete window.Tonika.ModuleRegistry[this.moduleInfo.name];
            }
            this.emit('system:module:destroyed', { name: this.moduleInfo.name });
        }

        static getRegistry() {
            return (typeof window !== "undefined") ? window.Tonika.ModuleRegistry : {};
        }
        static discoverModules() {
            const registry = this.getRegistry();
            return Object.values(registry).map(module => ({
                name: module.moduleInfo.name,
                status: module.getStatus()
            }));
        }
        static findModule(name) {
            const registry = this.getRegistry();
            return registry[name] || null;
        }
        static setDebugMode(enabled) {
            if (typeof window !== "undefined") {
                window.Tonika.debug = enabled;
                console.log(`Tonika debug mode: ${enabled ? 'enabled' : 'disabled'}`);
            }
        }
        static getEventLog(limit = 50) {
            if (typeof window !== "undefined") {
                return window.Tonika.EventLog.slice(-limit);
            }
            return [];
        }
    }

    if (typeof window !== "undefined") {
        window.Tonika.TonikaModule = TonikaModule;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { TonikaModule };
    }
})();