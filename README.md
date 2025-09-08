# 🎶 Tonika

> _A notebook for creativity in the space of music development._

Tonika is a modular, open-source music environment built to help you explore, create, and develop musical ideas—whether you're a beginner, expert, composer, or curious coder. It's a growing collection of purpose-built tools that speak MIDI, listen closely, and always strive to stay out of your way.

We built Tonika for ourselves—but we share it with the world.

- 🎹 For musicians: it's an interactive composition assistant.
- 🧠 For learners: it's a friendly way to explore chords, rhythm, and ideas.
- 🧰 For developers: it's a well-documented playground for musical tools.

Tonika is free, open source, and licensed under the MIT License.

---

## 💡 Philosophy

Tonika is:

- **Creative-first**: simple tools for musical play and exploration.
- **Modular**: each `*onika` tool does one thing well and can stand alone.
- **Curated**: a bundled front-end includes the best of our toolset.
- **Friendly**: strong docs, simple code, and room for tinkerers.
- **Accessible**: for learners, hobbyists, professionals, and educators.

---

## 🎛️ The Curated Tonika Frontend

Tonika includes a default browser-based UI that brings together a suite of `*onika` tools. These modules can be used independently or as part of the curated experience.

| Module                                                   | Description                                                  |
|----------------------------------------------------------|--------------------------------------------------------------|
| 🧃 **Soundonika** _(integrated)_                         | Headless audio engine with WebAudio scheduling and samples.  |
| 🎹 [Clavonika](https://github.com/aa-parky/clavonika)    | An 88-key interactive MIDI piano keyboard.                   |
| 🎚️ [Midonika](https://github.com/aa-parky/midonika)     | Visualize and debug live MIDI input/output messages.         |
| 🔌 [Jackonika](https://github.com/aa-parky/jackonika)    | Your MIDI patchbox: listens, connects, and routes.           |
| 🎙️ [Catchonika](https://github.com/aa-parky/catchonika) | Always listening—capture spontaneous ideas and takes.        |
| 🎼 [Chordonika](https://github.com/aa-parky/chordonika)  | Explore chords, visualize voicings, find that special sound. |
| 🥁 [Rhythonika](https://github.com/aa-parky/rhythonika)  | Smart metronome and rhythm trainer with creative patterns.   |

Each of these modules is being developed to work independently or within the **Tonika rack**.

---

## 🧃 Audio Foundation: Soundonika

**Soundonika** is Tonika's integrated audio engine—a powerful, flexible WebAudio foundation that provides precise audio scheduling, sample playback, and seamless integration with the Tonika ecosystem.

### Core Features

- **🎯 Precise Timing**: Sub-millisecond audio scheduling using WebAudio's high-resolution timers
- **🎵 Sample Playback**: High-quality sample-based audio with velocity sensitivity
- **🔄 Runtime Kit Switching**: Dynamic sample mapping changes without reinitialization
- **🎛️ Configurable Architecture**: No hard-coded samples—everything is configurable
- **🌐 Local Integration**: Seamless access to Tonika's curated sample library
- **🔧 Modular Design**: Clean API for integration with any `*onika` module

### Quick Start

```javascript
// Initialize Soundonika with Tonika's sample library
const audioContext = new AudioContext();
const audioEngine = new SoundonikaEngine(audioContext, {
  sampleBasePath: "./samples", // Tonika's local samples
});

await audioEngine.init();

// Play sounds immediately
audioEngine.scheduleSound(audioContext.currentTime, "kick", 1.0);

// Schedule precise sequences
const startTime = audioContext.currentTime + 0.1;
audioEngine.scheduleSound(startTime, "kick", 1.0);
audioEngine.scheduleSound(startTime + 0.5, "snare", 0.8);
audioEngine.scheduleSound(startTime + 1.0, "hihat_closed", 0.6);
```

### Runtime Kit Switching

One of Soundonika's most powerful features is the ability to switch between different sample kits at runtime:

```javascript
// Switch to a different drum kit
const vinylKit = {
  kick: "percussion/VinylDrumKitsVol1/VDK1_Kit01_kick.wav",
  snare: "percussion/VinylDrumKitsVol1/VDK1_Kit01_snare.wav",
  hihat_closed: "percussion/VinylDrumKitsVol1/VDK1_Kit01_hihat1.wav",
  // ... more mappings
};

await audioEngine.setSampleMappings(vinylKit);
// Engine automatically loads new samples and updates mappings
```

### API Reference

| Method                                     | Description                                 | Returns            |
|--------------------------------------------|---------------------------------------------|--------------------|
| `constructor(audioContext, options)`       | Create new engine instance                  | `SoundonikaEngine` |
| `async init()`                             | Initialize audio graph and load samples     | `Promise<void>`    |
| `scheduleSound(when, soundType, velocity)` | Schedule a sound for playback               | `void`             |
| `async setSampleMappings(mappings)`        | Update sample mappings and load new samples | `Promise<void>`    |
| `getSampleMappings()`                      | Get current sample mappings                 | `Object`           |
| `setVolume(volume)`                        | Set master volume (0.0 - 1.0)               | `void`             |
| `getVolume()`                              | Get current master volume                   | `number`           |
| `setSoundMode(mode)`                       | Set playback mode ('samples' or 'clicks')   | `void`             |
| `getSoundMode()`                           | Get current playback mode                   | `string`           |
| `isReady()`                                | Check if engine is initialized and ready    | `boolean`          |
| `getLoadingProgress()`                     | Get sample loading progress (0.0 - 1.0)     | `number`           |
| `getLoadedSampleCount()`                   | Get number of loaded samples                | `number`           |

### Available Sound Types

Soundonika includes mappings for common drum and percussion sounds:

| Sound Type     | Description   | Default Sample                 |
|----------------|---------------|--------------------------------|
| `kick`         | Kick drum     | DopeDrumsVol5/DD5_Kick_01.wav  |
| `snare`        | Snare drum    | DopeDrumsVol5/DD5_Snare_01.wav |
| `hihat_closed` | Closed hi-hat | DopeDrumsVol5/DD5_CH_01.wav    |
| `hihat_open`   | Open hi-hat   | DopeDrumsVol5/DD5_OH_01.wav    |
| `perc`         | Percussion    | DopeDrumsVol5/DD5_Perc_01.wav  |
| `shaker`       | Shaker        | DopeDrumsVol5/DD5_Shk_01.wav   |
| `accent`       | Accent beat   | DopeDrumsVol5/DD5_Kick_01.wav  |
| `normal`       | Normal beat   | DopeDrumsVol5/DD5_CH_01.wav    |

### Configuration Options

```javascript
const options = {
  sampleBasePath: "./samples", // Path to sample directory
  sampleMappings: customMappings, // Custom sample mappings
  volume: 0.8, // Initial volume (0.0 - 1.0)
  mode: "samples", // Playback mode ('samples' or 'clicks')
};

const engine = new SoundonikaEngine(audioContext, options);
```

### Integration with Tonika Modules

Soundonika is designed to be the audio backbone for all Tonika modules:

```javascript
// In your *onika module
class YourOnikaModule {
  constructor(options = {}) {
    this.audioEngine = null;
  }

  async initAudio() {
    const audioContext = new AudioContext();
    this.audioEngine = new SoundonikaEngine(audioContext);
    await this.audioEngine.init();
  }

  playMetronomeClick() {
    if (this.audioEngine && this.audioEngine.isReady()) {
      this.audioEngine.scheduleSound(audioContext.currentTime, "accent", 1.0);
    }
  }
}
```

### Demo and Examples

Explore Soundonika's capabilities in the integrated demo:

- **File**: `/demo/soundonika.html`
- **Features**: Runtime kit switching, precision timing, velocity control
- **Interactive**: Test all sound types and configuration options

---

## 🚧 Development

We are actively building Tonika and welcome contributions, bug reports, feedback, and good musical vibes. You don't need to be a coder to get involved—musical ideas and UI feedback are just as valuable.

### 💾 Getting Started (Dev Mode)

Start here:  
👉 [https://github.com/aa-parky/tonika](https://github.com/aa-parky/tonika)

You'll find:

- 📁 Demo HTML loader (for local module dev)
- 🧪 Light/dark theme testers
- 📚 Documentation scaffold with Soundonika integration guides
- 🎵 Sample audio assets for development
- 🧃 Soundonika demo and API examples

### 🧱 Dev Philosophy

- **BEM CSS model** for all module UI
- Modules mount via `new YourModule({ mount: "#your-element-id" })`
- Clean separation of structure (HTML), style (CSS), and logic (JS)
- **Soundonika integration** for consistent audio across modules
- No frameworks—just the web platform (HTML/JS/CSS)

### 🎵 Audio-Enabled Module Development

For modules that need audio (metronomes, drum machines, sound effects):

1. **Use Soundonika directly** - it's included in Tonika: `js/soundonika.js`
2. **Initialize on user interaction** (browsers require user gesture for audio)
3. **Leverage local samples** - Soundonika knows Tonika's sample structure
4. **Test configuration options** - try different sample mappings and kits

## 📚 Documentation

We're building:

- A GitHub Wiki with module overviews and implementation guides
- A full developer tutorial for making your own `*onika` modules
- **Soundonika integration examples** and audio best practices
- Examples, templates, and design notes
- **Audio programming guides** for musical applications

Want to build your own module? You'll be welcome in the Tonika family.

---

## 🤝 Contributing

We welcome:

- Ideas and feedback from musicians and learners
- Feature suggestions or UX ideas
- Bug reports or performance issues
- PRs with improvements or new modules!
- **Audio samples and sound packs** (CC0/Free/Open licensed)
- **Soundonika enhancements** - new features, optimizations, or integrations

Feel free to fork and tinker—or raise an issue if you're stuck.

---

## 📜 License

MIT License © 2025 [aa-parky](https://github.com/aa-parky)

## Licensing

- **Tonika (code)** — MIT License
- **Soundonika (audio engine)** — MIT License
- **Piano sample assets** — Public Domain [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), [Upright Piano KW, Version 2022-02-21](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html)
- **Drum sample assets** — Various open licenses (see individual sample pack documentation)

---

## 📚 Documentation
