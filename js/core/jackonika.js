// js/core/jackonika.js
// Jackonika (Tonika core edition) - lightweight Web MIDI input bridge
(function () {
    const LS_KEY = "tonika_jackonika_last_input_id";

    let midiAccess = null;
    let currentInput = null;
    let optionsRef = {
        selectorId: "midiDeviceSelector",
        onNoteOn: null,
        onNoteOff: null,
        onStatus: null // ('info'|'warn'|'error', message)
    };

    function status(type, message) {
        try { optionsRef.onStatus && optionsRef.onStatus(type, message); } catch {}
        if (type === "error") console.warn("[Jackonika] " + message);
        else console.log("[Jackonika] " + message);
    }

    function ensureSelector(id) {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement("select");
            el.id = id;
            el.className = "tonika-select";
            document.body.insertBefore(el, document.body.firstChild);
            status("info", `Created <select id="${id}"> automatically`);
        }
        return el;
    }

    function listInputs() {
        return Array.from(midiAccess.inputs.values());
    }

    function saveLastInputId(id) {
        try { localStorage.setItem(LS_KEY, id || ""); } catch {}
    }

    function getLastInputId() {
        try { return localStorage.getItem(LS_KEY) || ""; } catch { return ""; }
    }

    function attachInput(input) {
        if (currentInput && currentInput.state !== "disconnected") {
            currentInput.onmidimessage = null;
        }
        currentInput = input || null;
        if (!currentInput) return;

        currentInput.onmidimessage = (ev) => {
            const [statusByte, note, vel] = ev.data || [];
            const type = statusByte & 0xf0;

            if (type === 0x90 && vel > 0) {
                // NOTE ON
                optionsRef.onNoteOn && optionsRef.onNoteOn(note, vel);
            } else if (type === 0x80) {
                // NOTE OFF (real)
                optionsRef.onNoteOff && optionsRef.onNoteOff(note);
            } else if (type === 0x90 && vel === 0) {
                // NOTE OFF (NoteOn with vel=0 convention)
                optionsRef.onNoteOff && optionsRef.onNoteOff(note);
            }
        };
    }

    function refreshDevices() {
        const selector = ensureSelector(optionsRef.selectorId);
        const prevValue = selector.value;
        const inputs = listInputs();

        // Rebuild list
        selector.innerHTML = "";
        inputs.forEach((inp) => {
            const opt = document.createElement("option");
            opt.value = inp.id;
            opt.textContent = `${inp.name} ${inp.manufacturer ? "— " + inp.manufacturer : ""}`;
            selector.appendChild(opt);
        });

        if (inputs.length === 0) {
            selector.disabled = true;
            status("warn", "No MIDI inputs available. Connect a device and try again.");
            attachInput(null);
            return;
        }

        selector.disabled = false;

        // Determine which input to select:
        // 1) previously selected & still present
        // 2) last-used from localStorage
        // 3) otherwise, first input
        let targetId = "";
        const lastUsed = getLastInputId();

        if (prevValue && inputs.some(i => i.id === prevValue)) {
            targetId = prevValue;
        } else if (lastUsed && inputs.some(i => i.id === lastUsed)) {
            targetId = lastUsed;
        } else {
            targetId = inputs[0].id;
        }

        selector.value = targetId;
        const target = inputs.find(i => i.id === targetId);
        attachInput(target);
        saveLastInputId(targetId);
        status("info", `Selected MIDI input: ${target?.name || "(none)"}`);
    }

    function wireSelectorChange() {
        const selector = ensureSelector(optionsRef.selectorId);
        selector.addEventListener("change", () => {
            const id = selector.value;
            const found = listInputs().find(i => i.id === id);
            attachInput(found || null);
            saveLastInputId(found?.id || "");
            status("info", `Switched to: ${found?.name || "(none)"}`);
        });
    }

    async function init(opts = {}) {
        // merge options
        optionsRef = { ...optionsRef, ...opts };

        // secure context check
        const isSecure = (location.protocol === "https:") || (location.hostname === "localhost" || location.hostname === "127.0.0.1");
        if (!isSecure) {
            status("warn", "Web MIDI requires a secure context (https or localhost).");
        }

        if (!("requestMIDIAccess" in navigator)) {
            status("error", "Web MIDI API not available in this browser.");
            return;
        }

        try {
            midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        } catch (err) {
            status("error", "Failed to get MIDI access. User may have denied permission.");
            return;
        }

        midiAccess.onstatechange = refreshDevices;
        ensureSelector(optionsRef.selectorId);
        wireSelectorChange();
        refreshDevices();

        status("info", "Jackonika ready.");
    }

    // Expose under Tonika namespace + global back-compat
    if (typeof window !== "undefined") {
        window.Tonika = window.Tonika || {};
        window.Tonika.Jackonika = { init };
        window.Jackonika = window.Jackonika || {};
        window.Jackonika.init = init;
    }

    // Module export (bundlers)
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { init };
    }
})();