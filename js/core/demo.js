// Demo Module — MIDI Device Listing with Connect/Disconnect and Message Tracking
// A simple example module demonstrating Tonika design system integration
// v1.2.0 — Aligned to Tonika core CSS (tonika-components).
//          Replaced a demo status strip with .tonika-alert variants.
//          Replaced custom status dot with .tonika-dot modifiers.
//          Kept demo.css only for layout/grid/message bubble styling.

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

      // Track MIDI message listeners and last messages
      this._listeners = new Map(); // deviceId -> listener function
      this._lastMessages = new Map(); // deviceId -> last message string

      this._renderUI();
      this._attachUIHandlers();
      void this._initMIDI();
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
        this._updateStatus(
          "MIDI access granted. Devices listed below.",
          "success",
        );
      } catch (err) {
        this._updateStatus(
          `MIDI access failed: ${err?.message ?? err}`,
          "error",
        );
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
          device: input, // Store reference to actual device
          isListening: this._listeners.has(input.id),
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
          device: output, // Store reference to actual device
          isListening: false, // Outputs don't receive messages
        });
      }

      this._renderDeviceList();
      this._updateCounts();
    }

    // === MIDI Message Handling ==============================================

    _connectToDevice(deviceId, type) {
      if (type !== "input") {
        this._updateStatus(
          "Only input devices can be connected for message monitoring.",
          "info",
        );
        return;
      }

      const deviceInfo = this._devices.inputs.get(deviceId);
      if (!deviceInfo || !deviceInfo.device) {
        this._updateStatus("Device not found.", "error");
        return;
      }

      const device = deviceInfo.device;

      // Create message listener
      const listener = (message) => {
        const messageStr = this._formatMIDIMessage(message);
        this._lastMessages.set(deviceId, messageStr);
        this._updateDeviceMessage(deviceId, messageStr);
      };

      // Attach listener
      device.onmidimessage = listener;
      this._listeners.set(deviceId, listener);

      // Update device state
      deviceInfo.isListening = true;

      this._renderDeviceList();
      this._updateStatus(
        `Connected to ${deviceInfo.name}. Monitoring MIDI messages...`,
        "success",
      );
    }

    _disconnectFromDevice(deviceId, type) {
      const deviceInfo =
        this._devices[type === "input" ? "inputs" : "outputs"].get(deviceId);
      if (!deviceInfo || !deviceInfo.device) return;

      if (type === "input") {
        // Remove listener
        deviceInfo.device.onmidimessage = null;
        this._listeners.delete(deviceId);
        this._lastMessages.delete(deviceId);

        // Update device state
        deviceInfo.isListening = false;
      }

      this._renderDeviceList();
      this._updateStatus(`Disconnected from ${deviceInfo.name}.`, "info");
    }

    _formatMIDIMessage(message) {
      const data = message.data;
      if (!data || data.length === 0) return "Empty message";

      const status = data[0];
      const type = status & 0xf0;
      const channel = (status & 0x0f) + 1;

      switch (type) {
        case 0x90: {
          // Note On
          const noteOnVel = data[2] || 0;
          if (noteOnVel > 0) {
            return `Note On: ${this._midiNoteToName(data[1])} vel=${noteOnVel} ch=${channel}`;
          } else {
            return `Note Off: ${this._midiNoteToName(data[1])} ch=${channel}`;
          }
        }
        case 0x80: // Note Off
          return `Note Off: ${this._midiNoteToName(data[1])} ch=${channel}`;
        case 0xb0: // Control Change
          return `CC: ${data[1]}=${data[2]} ch=${channel}`;
        case 0xe0: {
          // Pitch Bend
          const lsb = data[1] || 0;
          const msb = data[2] || 0;
          const value = ((msb << 7) | lsb) - 8192;
          return `Pitch Bend: ${value} ch=${channel}`;
        }
        case 0xc0: // Program Change
          return `Program: ${data[1]} ch=${channel}`;
        case 0xd0: // Channel Pressure
          return `Pressure: ${data[1]} ch=${channel}`;
        case 0xa0: // Polyphonic Pressure
          return `Poly Pressure: ${this._midiNoteToName(data[1])}=${data[2]} ch=${channel}`;
        default:
          return `Raw: [${Array.from(data).join(", ")}]`;
      }
    }

    _midiNoteToName(noteNumber) {
      const notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
      ];
      const octave = Math.floor(noteNumber / 12) - 1;
      const note = notes[noteNumber % 12];
      return `${note}${octave}`;
    }

    _updateDeviceMessage(deviceId, message) {
      const messageEl = this._mount?.querySelector(
        `[data-device-id="${deviceId}"] .demo__last-message`,
      );
      if (messageEl) {
        messageEl.textContent = message;
        messageEl.title = message; // Full message on hover
        messageEl.classList.add("updated");
        window.setTimeout(() => messageEl.classList.remove("updated"), 180);
      }
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
          this.settings.mode === "card" ? "demo--card" : "demo--floating",
        );
        this._mount.innerHTML = this._uiHTML();
      }

      // Cache DOM elements
      this._statusEl = this._mount.querySelector(".tonika-alert");
      this._inputCountEl = this._mount.querySelector(".demo__input-count");
      this._outputCountEl = this._mount.querySelector(".demo__output-count");
      this._inputListEl = this._mount.querySelector(".demo__input-list");
      this._outputListEl = this._mount.querySelector(".demo__output-list");
    }

    _uiHTML() {
      return `
                <div class="demo__header">
                    <div class="demo__title-section">
                        <h3 class="demo__title">MIDI Device Demo</h3>
                        <div class="demo__subtitle tonika-text-muted">
                            Connect to devices and monitor MIDI messages
                        </div>
                    </div>
                    <div class="demo__actions">
                        <button class="tonika-btn demo__refresh-btn" data-action="refresh" title="Refresh device list">
                            Refresh
                        </button>
                    </div>
                </div>

                <div class="demo__status-bar">
                    <div class="tonika-alert tonika-alert--info" role="status" aria-live="polite">Initializing MIDI...</div>
                </div>

                <div class="demo__content">
                    <div class="demo__section">
                        <div class="demo__section-header">
                            <h4 class="demo__section-title">MIDI Inputs</h4>
                            <div class="tonika-badge">
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
                            <div class="tonika-badge">
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
                        Connect to input devices to monitor live MIDI messages. Demonstrates interactive module development.
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
      this._inputListEl.innerHTML = devices
        .map((device) => this._renderDeviceItem(device, "input"))
        .join("");
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
      this._outputListEl.innerHTML = devices
        .map((device) => this._renderDeviceItem(device, "output"))
        .join("");
    }

    _renderDeviceItem(device, type) {
      // Show our monitoring status, not the device's connection status
      const isMonitoring = device.isListening || false;
      const connectionText = isMonitoring ? "Monitoring" : "Not monitoring";

      // Get the last message for this device
      const lastMessage =
        this._lastMessages.get(device.id) ||
        (type === "input" ? "No messages yet" : "Output device");

      // Determine button state
      const isConnected = device.isListening;
      const buttonText = isConnected ? "Disconnect" : "Connect";
      const buttonClass = isConnected
        ? "tonika-btn--danger"
        : "tonika-btn--primary";
      const buttonAction = isConnected ? "disconnect" : "connect";

      // Disable connect button for outputs
      const buttonDisabled = type === "output" ? "disabled" : "";
      const buttonTitle =
        type === "output"
          ? "Output devices cannot be monitored"
          : `${buttonText} to monitor MIDI messages`;

      // Tonika core status dot
      const dotClass = isMonitoring
        ? "tonika-dot tonika-dot--ok"
        : "tonika-dot tonika-dot--error";

      return `
                <div class="demo__device-item" data-device-id="${device.id}">
                    <div class="demo__device-info">
                        <div class="demo__device-name">${this._escapeHTML(device.name)}</div>
                        <div class="demo__device-meta tonika-text-muted">
                            ${this._escapeHTML(device.manufacturer)}
                        </div>
                    </div>
                    <div class="demo__last-message tonika-text-muted" title="${this._escapeHTML(lastMessage)}">
                        ${this._escapeHTML(this._truncateMessage(lastMessage))}
                    </div>
                    <div class="demo__device-controls">
                        <button class="tonika-btn ${buttonClass}" 
                                data-action="${buttonAction}" 
                                data-device-id="${device.id}" 
                                data-device-type="${type}"
                                title="${buttonTitle}"
                                ${buttonDisabled}>
                            ${buttonText}
                        </button>
                    </div>
                    <div class="demo__device-status">
                        <div class="${dotClass}" title="Status: ${connectionText}"></div>
                        <div class="demo__connection-status tonika-text-muted">
                            ${connectionText}
                        </div>
                    </div>
                </div>
            `;
    }

    _truncateMessage(message, maxLength = 30) {
      if (message.length <= maxLength) return message;
      return message.substring(0, maxLength - 3) + "...";
    }

    // === Event Handlers ======================================================

    _attachUIHandlers() {
      if (!this._mount) return;

      this._mount.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        const deviceId = btn.dataset.deviceId;
        const deviceType = btn.dataset.deviceType;

        switch (action) {
          case "refresh":
            this._refreshDevices();
            this._updateStatus("Device list refreshed.", "info");
            break;
          case "connect":
            if (deviceId && deviceType) {
              this._connectToDevice(deviceId, deviceType);
            }
            break;
          case "disconnect":
            if (deviceId && deviceType) {
              this._disconnectFromDevice(deviceId, deviceType);
            }
            break;
        }
      });
    }

    // === Helper Methods ======================================================

    _updateStatus(message, type = "info") {
      if (!this._statusEl) return;

      const valid = new Set(["info", "success", "error"]);
      const t = valid.has(type) ? type : "info";
      this._statusEl.textContent = message;
      this._statusEl.className = `tonika-alert tonika-alert--${t}`;
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
     * Manually refresh the device list
     */
    refresh() {
      this._refreshDevices();
    }
  }

  // Export to global scope
  window.Demo = Demo;
})();
