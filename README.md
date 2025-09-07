# 🎶 Tonika

> *A notebook for creativity in the space of music development.*

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
| 🧃 [Soundonika](https://github.com/aa-parky/soundonika)  | Headless audio engine with WebAudio scheduling and samples.  |
| 🎹 [Clavonika](https://github.com/aa-parky/clavonika)    | An 88-key interactive MIDI piano keyboard.                   |
| 🎚️ [Midonika](https://github.com/aa-parky/midonika)     | Visualize and debug live MIDI input/output messages.         |
| 🔌 [Jackonika](https://github.com/aa-parky/jackonika)    | Your MIDI patchbox: listens, connects, and routes.           |
| 🎙️ [Catchonika](https://github.com/aa-parky/catchonika) | Always listening—capture spontaneous ideas and takes.        |
| 🎼 [Chordonika](https://github.com/aa-parky/chordonika)  | Explore chords, visualize voicings, find that special sound. |
| 🥁 [Rhythonika](https://github.com/aa-parky/rhythonika)  | Smart metronome and rhythm trainer with creative patterns.   |

Each of these modules is being developed to work independently or within the **Tonika rack**.

---

## 🧃 Audio Foundation: Soundonika

**Soundonika** serves as the audio backbone for the Tonika ecosystem. It's a headless WebAudio engine that provides:

- **Precise audio scheduling** with sub-millisecond timing
- **Sample-based playback** with velocity sensitivity
- **Oscillator fallbacks** for universal compatibility
- **Modular integration** - any `*onika` module can use it
- **Local sample support** for Tonika users, graceful degradation for standalone modules

### Quick Integration Example:

```javascript
// Initialize Soundonika in your module
const audioContext = new AudioContext();
const audioEngine = new Soundonika.Engine(audioContext, {
    sampleBasePath: './samples'  // Local samples for Tonika users
});

await audioEngine.init();

// Schedule sounds with precise timing
audioEngine.scheduleSound(audioContext.currentTime, 'kick', 1.0);
```

**Sound Types Available:** kick, snare, hihat_closed, hihat_open, perc, shaker, accent, normal

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

### 🧱 Dev Philosophy

- **BEM CSS model** for all module UI
- Modules mount via `new YourModule({ mount: "#your-element-id" })`
- Clean separation of structure (HTML), style (CSS), and logic (JS)
- **Soundonika integration** for consistent audio across modules
- No frameworks—just the web platform (HTML/JS/CSS)

### 🎵 Audio-Enabled Module Development

For modules that need audio (metronomes, drum machines, sound effects):

1. **Include Soundonika** via CDN: `https://cdn.jsdelivr.net/gh/aa-parky/soundonika@main/js/soundonika.js`
2. **Initialize on user interaction** (browsers require user gesture for audio)
3. **Include local samples** in your module's `./samples` directory for Tonika users
4. **Test fallback behavior** - Soundonika gracefully degrades to click sounds

---

## 📚 Documentation

We're building:
- A GitHub Wiki with module overviews and implementation guides
- A full developer tutorial for making your own `*onika` modules
- **Soundonika integration examples** and audio best practices
- Examples, templates, and design notes

Want to build your own module? You'll be welcome in the Tonika family.

---

## 🤝 Contributing

We welcome:
- Ideas and feedback from musicians and learners
- Feature suggestions or UX ideas
- Bug reports or performance issues
- PRs with improvements or new modules!
- **Audio samples and sound packs** (CC0/Free/Open licensed)

Feel free to fork and tinker—or raise an issue if you're stuck.

---

## 📜 License

MIT License © 2025 [aa-parky](https://github.com/aa-parky)

## Licensing

- **Tonika (code)** — MIT License
- **Piano sample assets** — Public Domain [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/), [Upright Piano KW, Version 2022-02-21](https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html)

---

## 🧙‍♂️ A Final Word from the Goblin Desk

Tonika isn't a product. It's a space.  
It's a little studio in your browser, built with curiosity and kindness.  
Come and play.

