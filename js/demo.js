// Demo Module — MIDI Device Listing
// A simple example module demonstrating Tonika design system integration
// v1.0.0 — BEM naming, proper CSS separation, and MIDI device enumeration

(() => {
    class Demo {
        /**
         * @param {Object} opts
         * @param {HTMLElement|string} [opts.mount] - Element to mount the module in
         * @param {"card"|"floating"} [opts.mode="card"] - Display mode
         * @param {boolean} [opts.autoRefresh=true] - Auto-refresh device list on changes
         */
        constructor(opts = {}) {
            this.settings = {
                mode: opts.mode ?? "card",
                autoRefresh: opts.autoRefresh ?? true,
            };

            this._mount =
                typeof opts.mount === "string"
                    ? document.querySelector(opts.mount)
                    : opts.mount;

            this._midi = null;
            this._devices = {
                inputs: new Map(),
                outputs: new Map(),
            };

            this._renderUI();
            this._attachUIHandlers();
            void this._initMIDI();
        }

        destroy() {
            if (this._midi) {
                this._midi.onstatechange = null;
                this._midi = null;
            }
            this._teardownUI();
        }

        // === MIDI Device Management =============================================

        async _initMIDI() {
            if (!navigator.requestMIDIAccess) {
                this._updateStatus("Web MIDI not supported in this browser.", "error");
                return;
            }

            try {
                this._midi = await navigator.requestMIDIAccess({ sysex: false });

                if (this.settings.autoRefresh) {
                    this._midi.onstatechange = () => this._refreshDevices();
                }

                this._refreshDevices();
                this._updateStatus("MIDI access granted. Devices listed below.", "success");
            } catch (err) {
                this._updateStatus(`MIDI access failed: ${err?.message ?? err}`, "error");
            }
        }

        _refreshDevices() {
            if (!this._midi) return;

            // Clear existing devices
            this._devices.inputs.clear();
            this._devices.outputs.clear();

            // Populate inputs
            for (const input of this._midi.inputs.values()) {
                this._devices.inputs.set(input.id, {
                    id: input.id,
                    name: input.name || "Unknown Input",
                    manufacturer: input.manufacturer || "Unknown",
                    state: input.state,
                    connection: input.connection,
                });
            }

            // Populate outputs
            for (const output of this._midi.outputs.values()) {
                this._devices.outputs.set(output.id, {
                    id: output.id,
                    name: output.name || "Unknown Output",
                    manufacturer: output.manufacturer || "Unknown",
                    state: output.state,
                    connection: output.connection,
                });
            }

            this._renderDeviceList();
            this._updateCounts();
        }

        // === UI Rendering ========================================================

        _renderUI() {
            if (!this._mount) {
                const el = document.createElement("div");
                el.className = `tonika-module demo ${this.settings.mode === "card" ? "demo--card" : "demo--floating"}`;
                el.innerHTML = this._uiHTML();
                document.body.appendChild(el);
                this._mount = el;
            } else {
                this._mount.classList.add("tonika-module", "demo");
                this._mount.classList.add(
                    this.settings.mode === "card" ? "demo--card" : "demo--floating"
                );
                this._mount.innerHTML = this._uiHTML();
            }

            // Cache DOM elements
            this._statusEl = this._mount.querySelector(".demo__status");
            this._inputCountEl = this._mount.querySelector(".demo__input-count");
            this._outputCountEl = this._mount.querySelector(".demo__output-count");
            this._inputListEl = this._mount.querySelector(".demo__input-list");
            this._outputListEl = this._mount.querySelector(".demo__output-list");
        }

        _teardownUI() {
            if (!this._mount) return;
            this._mount.innerHTML = "";
            if (this._mount.classList.contains("demo--floating")) {
                this._mount.remove();
            } else {
                this._mount.classList.remove(
                    "tonika-module",
                    "demo",
                    "demo--card",
                    "demo--floating"
                );
            }
            this._mount = null;
        }

        _uiHTML() {
            return `
                <div class="demo__header">
                    <div class="demo__title-section">
                        <h3 class="demo__title">MIDI Device Demo</h3>
                        <div class="demo__subtitle tonika-text-muted">
                            Demonstrates Tonika module development best practices
                        </div>
                    </div>
                    <div class="demo__actions">
                        <button class="tonika-btn demo__refresh-btn" data-action="refresh" title="Refresh device list">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="demo__status-bar">
                    <div class="demo__status" aria-live="polite">Initializing MIDI...</div>
                </div>

                <div class="demo__content">
                    <div class="demo__section">
                        <div class="demo__section-header">
                            <h4 class="demo__section-title">MIDI Inputs</h4>
                            <div class="demo__badge">
                                <span class="demo__input-count">0</span> devices
                            </div>
                        </div>
                        <div class="demo__device-list demo__input-list">
                            <div class="demo__empty-state tonika-text-muted">
                                No MIDI input devices found
                            </div>
                        </div>
                    </div>

                    <div class="demo__section">
                        <div class="demo__section-header">
                            <h4 class="demo__section-title">MIDI Outputs</h4>
                            <div class="demo__badge">
                                <span class="demo__output-count">0</span> devices
                            </div>
                        </div>
                        <div class="demo__device-list demo__output-list">
                            <div class="demo__empty-state tonika-text-muted">
                                No MIDI output devices found
                            </div>
                        </div>
                    </div>
                </div>

                <div class="demo__footer">
                    <div class="demo__info tonika-text-muted">
                        This module demonstrates BEM naming, CSS variable usage, and proper separation of concerns.
                    </div>
                </div>
            `;
        }

        _renderDeviceList() {
            this._renderInputList();
            this._renderOutputList();
        }

        _renderInputList() {
            if (!this._inputListEl) return;

            if (this._devices.inputs.size === 0) {
                this._inputListEl.innerHTML = `
                    <div class="demo__empty-state tonika-text-muted">
                        No MIDI input devices found
                    </div>
                `;
                return;
            }

            const devices = Array.from(this._devices.inputs.values());
            const deviceHTML = devices.map(device => this._renderDeviceItem(device, "input")).join("");
            this._inputListEl.innerHTML = deviceHTML;
        }

        _renderOutputList() {
            if (!this._outputListEl) return;

            if (this._devices.outputs.size === 0) {
                this._outputListEl.innerHTML = `
                    <div class="demo__empty-state tonika-text-muted">
                        No MIDI output devices found
                    </div>
                `;
                return;
            }

            const devices = Array.from(this._devices.outputs.values());
            const deviceHTML = devices.map(device => this._renderDeviceItem(device, "output")).join("");
            this._outputListEl.innerHTML = deviceHTML;
        }

        _renderDeviceItem(device, type) {
            const statusClass = device.state === "connected" ? "demo__status-indicator--connected" : "demo__status-indicator--disconnected";
            const connectionText = device.connection === "open" ? "Open" : "Closed";

            return `
                <div class="demo__device-item">
                    <div class="demo__device-info">
                        <div class="demo__device-name">${this._escapeHTML(device.name)}</div>
                        <div class="demo__device-meta tonika-text-muted">
                            ${this._escapeHTML(device.manufacturer)}
                        </div>
                    </div>
                    <div class="demo__device-status">
                        <div class="demo__status-indicator ${statusClass}" title="${device.state}"></div>
                        <div class="demo__connection-status tonika-text-muted">
                            ${connectionText}
                        </div>
                    </div>
                </div>
            `;
        }

        // === Event Handlers ======================================================

        _attachUIHandlers() {
            if (!this._mount) return;

            this._mount.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-action]");
                if (!btn) return;

                if (btn.dataset.action === "refresh") {
                    this._refreshDevices();
                    this._updateStatus("Device list refreshed.", "info");
                }
            });
        }

        // === Helper Methods ======================================================

        _updateStatus(message, type = "info") {
            if (!this._statusEl) return;

            this._statusEl.textContent = message;
            this._statusEl.className = `demo__status demo__status--${type}`;
        }

        _updateCounts() {
            if (this._inputCountEl) {
                this._inputCountEl.textContent = this._devices.inputs.size;
            }
            if (this._outputCountEl) {
                this._outputCountEl.textContent = this._devices.outputs.size;
            }
        }

        _escapeHTML(str) {
            const div = document.createElement("div");
            div.textContent = str;
            return div.innerHTML;
        }

        // === Public API ==========================================================

        /**
         * Get current device lists
         * @returns {Object} Object containing inputs and outputs Maps
         */
        getDevices() {
            return {
                inputs: new Map(this._devices.inputs),
                outputs: new Map(this._devices.outputs),
            };
        }

        /**
         * Manually refresh the device list
         */
        refresh() {
            this._refreshDevices();
        }
    }

    // Export to global scope
    window.Demo = Demo;
})();

