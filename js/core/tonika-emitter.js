/*!
 * Tonika Emitter — tiny EventTarget-based emitter
 * Location: js/core/tonika-emitter.js
 *
 * Purpose:
 *   A minimal, standards-native event emitter used by Tonika core modules.
 *   - Extends EventTarget (native, fast, interoperable)
 *   - Ergonomic helpers: on(), off(), emit()
 *   - Exposed under window.Tonika.TonikaEmitter and CommonJS for tests
 *
 * Usage:
 *   class MyThing extends Tonika.TonikaEmitter {
 *     init() {
 *       this.emit('status', { state: 'ready' });
 *     }
 *   }
 *   const t = new MyThing();
 *   const off = t.on('status', e => console.log(e.detail));
 *   off(); // unsubscribe
 */

/* eslint-env browser, node */

(function () {
    // --- Namespace bootstrap ---------------------------------------------------
    if (typeof window !== 'undefined') {
        window.Tonika = window.Tonika || {};
    }

    // --- Class -----------------------------------------------------------------
    class TonikaEmitter extends EventTarget {
        // noinspection JSUnusedGlobalSymbols
        /**
         * Add an event listener and return a convenient unsubscribe function.
         * @param {string} type
         * @param {(event: CustomEvent<any>) => void} handler
         * @param {AddEventListenerOptions | boolean} [options]
         * @returns {() => void} unsubscribe
         */
        on(type, handler, options) {
            this.addEventListener(type, handler, options);
            return () => this.removeEventListener(type, handler, options);
        }

        // noinspection JSUnusedGlobalSymbols
        /**
         * Remove an event listener.
         * @param {string} type
         * @param {(event: CustomEvent<any>) => void} handler
         * @param {EventListenerOptions | boolean} [options]
         */
        off(type, handler, options) {
            this.removeEventListener(type, handler, options);
        }

        // noinspection JSUnusedGlobalSymbols
        /**
         * Dispatch a CustomEvent with a `detail` payload.
         * @param {string} type
         * @param {any} [detail]
         */
        emit(type, detail) {
            this.dispatchEvent(new CustomEvent(type, { detail }));
        }
    }

    // --- Exports ---------------------------------------------------------------
    if (typeof window !== 'undefined') {
        window.Tonika.TonikaEmitter = TonikaEmitter;
    }

    // Guarded CommonJS export (quiet JetBrains “unresolved module”)
    // noinspection JSUnresolvedVariable
    if (typeof module !== 'undefined' && module.exports) {
        // noinspection JSUnresolvedVariable
        module.exports = { TonikaEmitter };
    }
})();