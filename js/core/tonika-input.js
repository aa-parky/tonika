/*!
 * Tonika Input — Global Keyboard Event Module
 * Minimal version: emits ui:keypress events on Tonika.Bus
 */

(function () {
    "use strict";

    if (typeof window === "undefined" || !window.Tonika || !window.Tonika.TonikaModule) {
        console.error("TonikaInput: Tonika base not found. Ensure tonika-bus.js is loaded first.");
        return;
    }

    class TonikaInput extends window.Tonika.TonikaModule {
        constructor(opts = {}) {
            super({
                ...opts,
                moduleInfo: {
                    name: "TonikaInput",
                    version: "0.1.0",
                    description: "Global keyboard input → emits ui:keypress events"
                }
            });

            this._boundKeyHandler = this._handleKey.bind(this);
        }

        // -----------------------------------------------------------------------
        // Lifecycle
        // -----------------------------------------------------------------------
        _initialize() {
            window.addEventListener("keydown", this._boundKeyHandler);
            this.emit("app:status", { state: "ready", module: "TonikaInput" });
        }

        destroy() {
            window.removeEventListener("keydown", this._boundKeyHandler);
            super.destroy();
        }

        // -----------------------------------------------------------------------
        // Key handling
        // -----------------------------------------------------------------------
        _handleKey(e) {
            // Ignore typing in form elements
            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

            const detail = {
                code: e.code,
                key: e.key,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                metaKey: e.metaKey
            };

            // Dispatch to Bus
            this.emit("ui:keypress", detail);

            // Standardized debug log
            if (window.Tonika?.Utils?.debugLog) {
                Tonika.Utils.debugLog(this.moduleInfo.name, "ui:keypress", detail);
            }
        }

        // -----------------------------------------------------------------------
        // Status
        // -----------------------------------------------------------------------
        getStatus() {
            return {
                ...super.getStatus(),
                api: {
                    methods: ["getStatus", "destroy"],
                    events: {
                        emits: ["app:status", "ui:keypress"],
                        listens: []
                    }
                }
            };
        }
    }

    window.Tonika.TonikaInput = TonikaInput;
})();