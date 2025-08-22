/**
 * Chord Dictionary Module (Stage A + shim)
 * Keeps behaviour the same; uses qs/qsa helpers with a local fallback.
 */
"use strict";

// ---- Lightweight DOM helpers (fallback if dom.js not loaded) ----
(function () {
  if (!window.qs) window.qs = (sel, ctx = document) => ctx.querySelector(sel);
  if (!window.qsa)
    window.qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  if (!window.el)
    window.el = (tag, props = {}) => {
      const n = document.createElement(tag);
      Object.assign(n, props);
      return n;
    };
  if (!window.text) window.text = (t) => document.createTextNode(t);
})();

const DEBUG = false;
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

class ChordDictionary {
  constructor() {
    this.chords = {};
    this.voicings = {};
    this.currentChord = null;
    this.searchResults = [];
    this.selectedNotes = [];
    this.currentCategory = "major";

    // DOM elements
    this.elements = {};

    DEBUG && console.log("ChordDictionary initialized");
  }

  async init() {
    try {
      await this.loadChordData();
      this.setupDOMElements();
      this.setupEventListeners();
      this.setupDictionaryTabs();
      DEBUG && console.log("ChordDictionary ready");
    } catch (error) {
      console.error("Failed to initialize ChordDictionary:", error);
    }
  }

  async loadChordData() {
    try {
      const response = await fetch("./theory/chords.json");
      this.chords = await response.json();
      DEBUG &&
        console.log(
          "Chord data loaded:",
          Object.keys(this.chords).length,
          "chords",
        );
    } catch (error) {
      console.error("Failed to load chord data:", error);
      this.chords = this.getBasicChordData();
    }
  }

  getBasicChordData() {
    return {
      C: {
        notes: ["C", "E", "G"],
        intervals: ["1", "3", "5"],
        quality: "Major",
      },
      Cm: {
        notes: ["C", "Eb", "G"],
        intervals: ["1", "b3", "5"],
        quality: "Minor",
      },
      C7: {
        notes: ["C", "E", "G", "Bb"],
        intervals: ["1", "3", "5", "b7"],
        quality: "Dominant 7th",
      },
      Cmaj7: {
        notes: ["C", "E", "G", "B"],
        intervals: ["1", "3", "5", "7"],
        quality: "Major 7th",
      },
      Am: {
        notes: ["A", "C", "E"],
        intervals: ["1", "b3", "5"],
        quality: "Minor",
      },
      F: {
        notes: ["F", "A", "C"],
        intervals: ["1", "3", "5"],
        quality: "Major",
      },
      G: {
        notes: ["G", "B", "D"],
        intervals: ["1", "3", "5"],
        quality: "Major",
      },
    };
  }

  setupDOMElements() {
    this.elements = {
      // Search elements
      searchInput: qs("#chord-search-input"),
      searchSuggestions: qs("#search-suggestions"),

      // Display elements
      chordDisplay: qs("#chord-display"),
      chordName: qs("#dict-chord-name"),
      chordNotes: qs("#chord-notes"),
      chordIntervals: qs("#chord-intervals"),
      chordFunction: qs("#chord-function-dict"),
      chordQuality: qs("#chord-quality"),

      // Piano elements
      pianoContainer: qs("#dictionary-piano"),
      interactivePiano: qs("#interactive-piano"),

      // Voicings elements
      voicingsGrid: qs("#voicings-grid"),

      // Browse elements
      chordCategories: qs("#chord-categories"),
      chordDetails: qs("#chord-details"),

      // Interactive elements
      selectedNotesList: qs("#selected-notes-list"),
      clearNotesBtn: qs("#clear-notes"),
      chordResults: qs("#chord-results"),
    };
  }

  setupEventListeners() {
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener("input", (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Suggestion chips
    qsa(".suggestion-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const target = e.currentTarget || e.target;
        const chordName = target.dataset.chord;
        if (!chordName) return;
        this.selectChord(chordName);
        if (this.elements.searchInput)
          this.elements.searchInput.value = chordName;
      });
    });

    // Category selection
    qsa(".category-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const target = e.currentTarget || e.target;
        const cat = target.dataset.category;
        if (!cat) return;
        this.selectCategory(cat);
      });
    });

    // Clear notes button
    if (this.elements.clearNotesBtn) {
      this.elements.clearNotesBtn.addEventListener("click", () =>
        this.clearSelectedNotes(),
      );
    }
  }

  setupDictionaryTabs() {
    const dictTabBtns = qsa(".dict-tab-btn");
    const dictTabContents = qsa(".dict-tab-content");

    dictTabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget || e.target;
        const targetTab = target.dataset.dictTab;
        if (!targetTab) return;

        // Remove active class from all buttons and contents
        dictTabBtns.forEach((b) => b.classList.remove("active"));
        dictTabContents.forEach((c) => c.classList.remove("active"));

        // Add active class to clicked button and corresponding content
        target.classList.add("active");
        const tabPanel = qs(`#dict-tab-${targetTab}`);
        if (tabPanel) tabPanel.classList.add("active");

        this.handleTabSwitch(targetTab);
      });
    });
  }

  handleSearch(query) {
    if (!query || query.length < 2) {
      this.clearChordDisplay();
      return;
    }
    const results = this.searchChords(query);
    if (results.length > 0) this.selectChord(results[0].name);
  }

  searchChords(query) {
    const normalizedQuery = String(query).toLowerCase().trim();
    const results = [];

    for (const [chordName, chordData] of Object.entries(this.chords)) {
      if (chordName.toLowerCase().includes(normalizedQuery)) {
        results.push({
          name: chordName,
          data: chordData,
          relevance: this.calculateRelevance(chordName, normalizedQuery),
        });
      }
    }
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  calculateRelevance(chordName, query) {
    const name = chordName.toLowerCase();
    if (name === query) return 100;
    if (name.startsWith(query)) return 80;
    if (name.includes(query)) return 60;
    return 0;
  }

  selectChord(chordName) {
    const chordData = this.chords[chordName];
    if (!chordData) {
      console.warn("Chord not found:", chordName);
      return;
    }
    this.currentChord = { name: chordName, data: chordData };
    this.displayChord();
    DEBUG && console.log("Selected chord:", chordName);
  }

  displayChord() {
    if (!this.currentChord) return;

    const { name, data } = this.currentChord;
    this.elements.chordName.textContent = name;
    this.elements.chordNotes.textContent = data.notes
      ? data.notes.join(" - ")
      : "-";
    this.elements.chordIntervals.textContent = data.intervals
      ? data.intervals.join(" - ")
      : "-";
    this.elements.chordQuality.textContent = data.quality || "-";
    this.elements.chordFunction.textContent =
      this.getChordFunction(name) || "-";

    this.updatePianoVisualization();
    this.updateVoicings();
  }

  getChordFunction(chordName) {
    if (chordName.startsWith("C")) return "I (Tonic)";
    if (chordName.startsWith("F")) return "IV (Subdominant)";
    if (chordName.startsWith("G")) return "V (Dominant)";
    if (chordName.startsWith("Am")) return "vi (Relative Minor)";
    return "Function TBD";
  }

  updatePianoVisualization() {
    if (!this.currentChord) return;
    const notes = this.currentChord.data.notes || [];
    this.elements.pianoContainer.innerHTML = `
      <div class="piano-placeholder">
        <p>Piano visualization for: <strong>${esc(this.currentChord.name)}</strong></p>
        <p>Notes: ${esc(notes.join(", "))}</p>
        <p><em>Piano keyboard will be rendered here</em></p>
      </div>`;
  }

  updateVoicings() {
    if (!this.currentChord) return;
    const voicings = this.generateBasicVoicings(this.currentChord);
    this.elements.voicingsGrid.innerHTML = voicings
      .map(
        (v) => `
      <div class="voicing-card">
        <div class="voicing-name">${esc(v.name)}</div>
        <div class="voicing-notes">${esc(v.notes.join(" - "))}</div>
        <div class="voicing-placeholder"><em>Mini piano will appear here</em></div>
      </div>`,
      )
      .join("");
  }

  generateBasicVoicings(chord) {
    const notes = chord.data.notes || [];
    if (notes.length === 0) return [];
    const voicings = [{ name: "Root Position", notes }];
    if (notes.length >= 3)
      voicings.push({
        name: "1st Inversion",
        notes: [notes[1], notes[2], notes[0]],
      });
    if (notes.length >= 4)
      voicings.push({
        name: "2nd Inversion",
        notes: [notes[2], notes[3], notes[0], notes[1]],
      });
    return voicings;
  }

  selectCategory(category) {
    this.currentCategory = category;
    qsa(".category-item").forEach((item) => item.classList.remove("active"));
    const active = qs(`[data-category="${category}"]`);
    if (active) active.classList.add("active");
    this.displayCategoryChords(category);
  }

  displayCategoryChords(category) {
    const categoryChords = this.getChordsInCategory(category);
    this.elements.chordDetails.innerHTML = `
      <div class="category-chords">
        <h4>${this.getCategoryTitle(category)}</h4>
        <div class="chord-list">
          ${categoryChords
            .map(
              (chord) => `
            <div class="chord-item" data-chord="${esc(chord)}">
              <span class="chord-name">${esc(chord)}</span>
              <span class="chord-notes">${esc(this.chords[chord]?.notes?.join(" ") || "")}</span>
            </div>`,
            )
            .join("")}
        </div>
      </div>`;

    this.elements.chordDetails
      .querySelectorAll(".chord-item")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          const name = e.currentTarget.dataset.chord;
          this.selectChord(name);
        });
      });
  }

  getChordsInCategory(category) {
    const allChords = Object.keys(this.chords);
    switch (category) {
      case "major":
        return allChords.filter(
          (c) => !c.includes("m") && !c.includes("7") && !c.includes("sus"),
        );
      case "minor":
        return allChords.filter((c) => c.includes("m") && !c.includes("7"));
      case "seventh":
        return allChords.filter((c) => c.includes("7"));
      default:
        return allChords.slice(0, 5);
    }
  }

  getCategoryTitle(category) {
    const titles = {
      major: "Major Chords",
      minor: "Minor Chords",
      seventh: "7th Chords",
      extended: "Extended Chords",
      altered: "Altered Chords",
      suspended: "Suspended Chords",
    };
    return titles[category] || "Chords";
  }

  handleTabSwitch(tabName) {
    switch (tabName) {
      case "search":
        break;
      case "browse":
        this.displayCategoryChords(this.currentCategory);
        break;
      case "interactive":
        this.setupInteractivePiano();
        break;
    }
  }

  setupInteractivePiano() {
    this.elements.interactivePiano.innerHTML = `
      <div class="interactive-placeholder">
        <p><em>Interactive piano keyboard will appear here</em></p>
        <p>Click keys to select notes and identify chords</p>
      </div>`;
  }

  clearSelectedNotes() {
    this.selectedNotes = [];
    this.elements.selectedNotesList.textContent = "None";
    this.elements.chordResults.innerHTML =
      '<div class="placeholder-text">Select notes to identify chords</div>';
  }

  clearChordDisplay() {
    this.currentChord = null;
    this.elements.chordName.textContent = "Select a chord to explore";
    this.elements.chordNotes.textContent = "-";
    this.elements.chordIntervals.textContent = "-";
    this.elements.chordFunction.textContent = "-";
    this.elements.chordQuality.textContent = "-";
    this.elements.pianoContainer.innerHTML =
      '<div class="placeholder-text">Piano visualization will appear here</div>';
    this.elements.voicingsGrid.innerHTML =
      '<div class="placeholder-text">Chord voicings will appear here</div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.chordDictionary === "undefined") {
    window.chordDictionary = new ChordDictionary();
    window.chordDictionary.init();
  }
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = ChordDictionary;
}
