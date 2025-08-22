# Tonika — Professional Music Theory Analysis in Real Time

Tonika is a comprehensive open-source web application for learning and analyzing music theory through real-time MIDI interaction. Built for musicians, students, and educators, it provides professional-grade chord recognition, harmonic analysis, and visual feedback without the complexity of traditional music software.

---

## 🎯 **Core Philosophy**

Tonika bridges the gap between theoretical knowledge and practical application by providing **instant visual feedback** as you play. It's designed as a **practice and composition companion** that helps you understand the "why" behind harmony, not just the "what."

---

## ✨ **Key Features**

### 🎹 **Professional Chord Recognition**

- **Standard Jazz Notation** — Industry-standard chord naming (Berklee/Real Book style)
- **Complex Harmony Support** — Extended chords (9th, 11th, 13th), alterations, slash bass
- **Intelligent Analysis** — Proper chord prioritization and root detection
- **Inversion Detection** — Identifies 1st, 2nd, 3rd inversions and slash bass chords

### 🎓 **Comprehensive Theory Analysis**

- **Roman Numeral Analysis** — Shows chord relationships within keys (I, ii, V7, etc.)
- **Harmonic Functions** — Identifies Tonic, Dominant, Subdominant roles
- **Available Tensions** — Displays extensions that can be added to chords
- **Chord Progressions** — Recognition of common patterns (ii-V-I, etc.) _[Phase 2]_
- **Voice Leading Analysis** — Smooth voice leading detection _[Phase 2]_

### 🖥️ **Dual Visual Interface**

- **Piano Visualization** — 88-key piano with viewport scrolling and zoom
- **Guitar Fretboard** — 24-fret display with multiple tuning options
- **Responsive Design** — Works seamlessly on desktop, tablet, and mobile
- **Color-Coded Display** — Root notes, scale tones, and pressed keys clearly distinguished

### 📚 **Educational Features**

- **Theory Explanations** — Optional descriptions for chord functions and concepts
- **Settings Toggle** — Switch between expert mode (clean) and learning mode (detailed)
- **Hover Tooltips** — Quick explanations without interrupting workflow
- **Real-time Feedback** — Learn theory concepts through immediate visual response

### 🎵 **Advanced Music Features**

- **Scale Highlighting** — Major, minor, modal, pentatonic, chromatic scales
- **Key Center Analysis** — Automatic key detection and scale degree relationships
- **MIDI Recording** — Capture and export your musical ideas
- **Session Management** — Save and organize multiple takes

---

## 🚀 **What Makes Tonika Special**

### **For Students**

- **Learn by Playing** — Theory concepts become intuitive through hands-on interaction
- **Visual Reinforcement** — See harmonic relationships as you play them
- **Progressive Learning** — Start with basic chords, advance to complex jazz harmony
- **No Subscription** — Free, open-source tool for serious music education

### **For Educators**

- **Teaching Tool** — Demonstrate harmonic concepts in real-time
- **Customizable** — Edit theory data via JSON files for specific curricula
- **Accessible** — Works in any modern browser, no software installation required

### **For Musicians**

- **Composition Aid** — Quickly identify and experiment with chord progressions
- **Practice Companion** — Understand the theory behind your playing
- **Professional Notation** — Industry-standard chord names for lead sheets and charts

---

## 🛠️ **Technical Specifications**

### **Architecture**

- **Vanilla JavaScript** — No frameworks, fast loading, minimal dependencies
- **Web MIDI API** — Direct browser-to-MIDI communication
- **Modular Design** — Separate modules for piano, guitar, theory analysis, and recording
- **JSON-Based Theory** — Easily customizable scales and chord definitions

### **Browser Compatibility**

- **Chrome/Edge** — Full Web MIDI support (recommended)
- **Firefox/Safari** — Limited MIDI support, manual input available
- **Mobile** — Touch-friendly interface, virtual MIDI input

### **Performance**

- **Real-time Analysis** — Sub-10ms chord detection and visual updates
- **Responsive UI** — Smooth animations and transitions
- **Memory Efficient** — Lightweight codebase, minimal resource usage

---

## 📖 **Music Theory Implementation**

### **Chord Detection Algorithm**

1. **Interval Analysis** — Analyzes pitch class relationships
2. **Root Prioritization** — Prefers bass notes and key center tones
3. **Jazz Conventions** — Follows standard jazz notation rules
4. **Extension Hierarchy** — Proper naming of 9th, 11th, 13th chords
5. **Alteration Notation** — Handles b9, #9, #11, b13 alterations

### **Supported Chord Types**

- **Triads** — Major, minor, diminished, augmented, suspended
- **Seventh Chords** — maj7, m7, 7, m7b5, dim7, mMaj7
- **Extended Chords** — 9, 11, 13 (major, minor, dominant)
- **Altered Dominants** — 7b9, 7#9, 7#11, 7b13, 7alt
- **Slash Bass** — Any chord with different bass note

### **Scale Support**

- **Major Modes** — Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
- **Minor Scales** — Natural, harmonic, melodic minor
- **Pentatonic** — Major and minor pentatonic scales
- **Specialty** — Blues, chromatic, whole tone, diminished

---

## 🎮 **Getting Started**

### **Quick Setup**

1. **Open** `index.html` in Chrome or Edge
2. **Connect** your MIDI keyboard via USB
3. **Select** your MIDI input from the dropdown
4. **Play** — chords are analyzed instantly!

### **For Learning**

1. **Enable Theory Explanations** — Settings → "Show theory explanations"
2. **Select a Key** — Choose your key center (C major recommended for beginners)
3. **Play Simple Chords** — Start with C, F, G triads
4. **Observe Analysis** — Watch Roman numerals and functions appear
5. **Experiment** — Try different inversions and extensions

### **For Advanced Users**

1. **Disable Explanations** — Keep interface clean for performance
2. **Use Hover Tooltips** — Quick reference without visual clutter
3. **Explore Jazz Chords** — Try complex voicings and alterations
4. **Record Sessions** — Capture your harmonic explorations

---

## 🔧 **Customization**

### **Theory Data**

- **`theory/scales.json`** — Add custom scales and modes
- **`theory/chords.json`** — Define new chord types and intervals
- **`theory/functions.json`** — Customize harmonic function descriptions

### **Settings**

- **Chord Size** — Adjust big chord display scaling
- **Theory Explanations** — Toggle educational descriptions
- **View Mode** — Piano only, guitar only, or both
- **Tuning** — Multiple guitar tuning options

---

## 🎯 **Use Cases**

### **Music Education**

- **Theory Classes** — Visual demonstration of harmonic concepts
- **Private Lessons** — Interactive learning tool for students
- **Self-Study** — Learn jazz harmony and chord progressions
- **Ear Training** — Connect visual patterns with harmonic sounds

### **Composition & Songwriting**

- **Chord Exploration** — Discover new harmonic possibilities
- **Progression Analysis** — Understand why certain changes work
- **Voice Leading** — Visualize smooth chord connections
- **Lead Sheet Creation** — Get proper chord names for charts

### **Performance Preparation**

- **Chart Analysis** — Understand the harmony in jazz standards
- **Improvisation Practice** — See available tensions and extensions
- **Accompaniment** — Learn effective chord voicings
- **Transcription Aid** — Identify chords in recordings

---

## 🌟 **Roadmap**

### **Phase 2 Features** _(In Development)_

- **Chord Progression Recognition** — Automatic ii-V-I detection
- **Voice Leading Analysis** — Smooth voice leading suggestions
- **Scale Recommendations** — Suggested scales for improvisation
- **MIDI Export** — Export recorded sessions as MIDI files

### **Future Enhancements**

- **Audio Analysis** — Analyze audio input in addition to MIDI
- **Preset Progressions** — Common jazz and pop progressions
- **Practice Mode** — Guided exercises and challenges
- **Collaboration Features** — Share sessions and analyses

---

## 🤝 **Contributing**

Tonika is open source and welcomes contributions! Whether you're a developer, musician, or educator, there are many ways to help:

- **Code Contributions** — Bug fixes, new features, performance improvements
- **Music Theory** — Expand chord/scale definitions, improve algorithms
- **Documentation** — Help improve guides and educational content
- **Testing** — Report bugs, suggest improvements, test on different devices
- **Translation** — Help make Tonika accessible to more musicians worldwide

---

## 📄 **License**

Tonika is released under the MIT License. Free for personal, educational, and commercial use.

---

## 🎵 **Credits**

Built with passion for music education and open-source collaboration. Special thanks to the music theory community and educators who inspired this project.

### **Dependencies**

- **[MidiWriterJS](https://github.com/grimmdude/MidiWriterJS)** by Garrett Grimm (@grimmdude) — JavaScript library for generating expressive multi-track MIDI files (MIT License)

### **Acknowledgments**

Special thanks to the music theory community and educators who inspired this project.

**Happy practicing!** 🎹🎸
