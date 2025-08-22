import { bus } from "../core/event-bus.js";

function toNoteName(n) {
  const names = [
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
  const name = names[n % 12];
  const oct = Math.floor(n / 12) - 1;
  return `${name}${oct}`;
}

class MidiService {
  constructor() {
    this.access = null;
    this.inputs = new Map();
    this.outputs = new Map();
    this.enabled = false;
  }

  async init() {
    if (!("requestMIDIAccess" in navigator)) {
      console.warn("[MIDI] Web MIDI not supported");
      bus.emit("midi:error", { message: "Web MIDI not supported" });
      return;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this._bindAccess(this.access);
      this.enabled = true;
      bus.emit("midi:ready", { enabled: true });
      this._emitPorts();
    } catch (e) {
      console.error("[MIDI] init failed", e);
      bus.emit("midi:error", { message: e?.message || "MIDI init failed" });
    }
  }

  _bindAccess(access) {
    const refresh = () => {
      this.inputs.clear();
      this.outputs.clear();
      for (const input of access.inputs.values()) {
        this.inputs.set(input.id, input);
        input.onmidimessage = (msg) => this._onMessage(input, msg);
      }
      for (const output of access.outputs.values()) {
        this.outputs.set(output.id, output);
      }
      this._emitPorts();
    };

    refresh();
    access.onstatechange = () => refresh();
  }

  _emitPorts() {
    bus.emit("midi:ports", {
      inputs: [...this.inputs.values()].map((p) => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer,
      })),
      outputs: [...this.outputs.values()].map((p) => ({
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer,
      })),
    });
  }

  _onMessage(input, { data, receivedTime }) {
    if (!data || data.length < 1) return;
    const status = data[0] & 0xf0;
    const channel = (data[0] & 0x0f) + 1;
    const d1 = data[1];
    const d2 = data[2];

    switch (status) {
      case 0x90: {
        // Note On (vel 0 = off)
        if (d2 === 0) {
          bus.emit("midi:noteoff", {
            note: d1,
            name: toNoteName(d1),
            velocity: 0,
            channel,
            input: input.name,
            ts: receivedTime,
          });
        } else {
          bus.emit("midi:noteon", {
            note: d1,
            name: toNoteName(d1),
            velocity: d2,
            channel,
            input: input.name,
            ts: receivedTime,
          });
        }
        break;
      }
      case 0x80: {
        // Note Off
        bus.emit("midi:noteoff", {
          note: d1,
          name: toNoteName(d1),
          velocity: d2 ?? 0,
          channel,
          input: input.name,
          ts: receivedTime,
        });
        break;
      }
      case 0xb0: {
        // CC
        bus.emit("midi:cc", {
          cc: d1,
          value: d2,
          channel,
          input: input.name,
          ts: receivedTime,
        });
        break;
      }
      case 0xf0: {
        // system messages (clock, etc.)
        // optional: emit specific system events if needed later
        break;
      }
      default:
        // no-op for now
        break;
    }
  }
}

export const midi = new MidiService();
