/**
 * Chord Dictionary Module
 * Provides chord lookup, search, and exploration functionality
 */

class ChordDictionary {
    constructor() {
        this.chords = {};
        this.voicings = {};
        this.currentChord = null;
        this.searchResults = [];
        this.selectedNotes = [];
        this.currentCategory = 'major';
        
        // DOM elements
        this.elements = {};
        
        console.log('ChordDictionary initialized');
    }

    /**
     * Initialize the chord dictionary
     */
    async init() {
        try {
            await this.loadChordData();
            this.setupDOMElements();
            this.setupEventListeners();
            this.setupDictionaryTabs();
            console.log('ChordDictionary ready');
        } catch (error) {
            console.error('Failed to initialize ChordDictionary:', error);
        }
    }

    /**
     * Load chord data from JSON files
     */
    async loadChordData() {
        try {
            // Load existing chord data
            const response = await fetch('./theory/chords.json');
            this.chords = await response.json();
            
            // TODO: Load voicings data when voicings.json is created
            // const voicingsResponse = await fetch('./theory/voicings.json');
            // this.voicings = await voicingsResponse.json();
            
            console.log('Chord data loaded:', Object.keys(this.chords).length, 'chords');
        } catch (error) {
            console.error('Failed to load chord data:', error);
            // Fallback to basic chord data
            this.chords = this.getBasicChordData();
        }
    }

    /**
     * Get basic chord data as fallback
     */
    getBasicChordData() {
        return {
            'C': { notes: ['C', 'E', 'G'], intervals: ['1', '3', '5'], quality: 'Major' },
            'Cm': { notes: ['C', 'Eb', 'G'], intervals: ['1', 'b3', '5'], quality: 'Minor' },
            'C7': { notes: ['C', 'E', 'G', 'Bb'], intervals: ['1', '3', '5', 'b7'], quality: 'Dominant 7th' },
            'Cmaj7': { notes: ['C', 'E', 'G', 'B'], intervals: ['1', '3', '5', '7'], quality: 'Major 7th' },
            'Am': { notes: ['A', 'C', 'E'], intervals: ['1', 'b3', '5'], quality: 'Minor' },
            'F': { notes: ['F', 'A', 'C'], intervals: ['1', '3', '5'], quality: 'Major' },
            'G': { notes: ['G', 'B', 'D'], intervals: ['1', '3', '5'], quality: 'Major' }
        };
    }

    /**
     * Setup DOM element references
     */
    setupDOMElements() {
        this.elements = {
            // Search elements
            searchInput: document.getElementById('chord-search-input'),
            searchSuggestions: document.getElementById('search-suggestions'),
            
            // Display elements
            chordDisplay: document.getElementById('chord-display'),
            chordName: document.getElementById('dict-chord-name'),
            chordNotes: document.getElementById('chord-notes'),
            chordIntervals: document.getElementById('chord-intervals'),
            chordFunction: document.getElementById('chord-function-dict'),
            chordQuality: document.getElementById('chord-quality'),
            
            // Piano elements
            pianoContainer: document.getElementById('dictionary-piano'),
            interactivePiano: document.getElementById('interactive-piano'),
            
            // Voicings elements
            voicingsGrid: document.getElementById('voicings-grid'),
            
            // Browse elements
            chordCategories: document.getElementById('chord-categories'),
            chordDetails: document.getElementById('chord-details'),
            
            // Interactive elements
            selectedNotesList: document.getElementById('selected-notes-list'),
            clearNotesBtn: document.getElementById('clear-notes'),
            chordResults: document.getElementById('chord-results')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Suggestion chips
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const chordName = e.target.dataset.chord;
                this.selectChord(chordName);
                this.elements.searchInput.value = chordName;
            });
        });

        // Category selection
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectCategory(e.target.dataset.category);
            });
        });

        // Clear notes button
        if (this.elements.clearNotesBtn) {
            this.elements.clearNotesBtn.addEventListener('click', () => {
                this.clearSelectedNotes();
            });
        }
    }

    /**
     * Setup dictionary sub-tabs
     */
    setupDictionaryTabs() {
        const dictTabBtns = document.querySelectorAll('.dict-tab-btn');
        const dictTabContents = document.querySelectorAll('.dict-tab-content');

        dictTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.dictTab;
                
                // Remove active class from all buttons and contents
                dictTabBtns.forEach(b => b.classList.remove('active'));
                dictTabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                e.target.classList.add('active');
                document.getElementById(`dict-tab-${targetTab}`).classList.add('active');
                
                // Handle tab-specific initialization
                this.handleTabSwitch(targetTab);
            });
        });
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        if (query.length < 2) {
            this.clearChordDisplay();
            return;
        }

        const results = this.searchChords(query);
        if (results.length > 0) {
            this.selectChord(results[0].name);
        }
    }

    /**
     * Search for chords matching the query
     */
    searchChords(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const results = [];

        for (const [chordName, chordData] of Object.entries(this.chords)) {
            if (chordName.toLowerCase().includes(normalizedQuery)) {
                results.push({
                    name: chordName,
                    data: chordData,
                    relevance: this.calculateRelevance(chordName, normalizedQuery)
                });
            }
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    /**
     * Calculate search relevance score
     */
    calculateRelevance(chordName, query) {
        const name = chordName.toLowerCase();
        if (name === query) return 100;
        if (name.startsWith(query)) return 80;
        if (name.includes(query)) return 60;
        return 0;
    }

    /**
     * Select and display a chord
     */
    selectChord(chordName) {
        const chordData = this.chords[chordName];
        if (!chordData) {
            console.warn('Chord not found:', chordName);
            return;
        }

        this.currentChord = { name: chordName, data: chordData };
        this.displayChord();
        console.log('Selected chord:', chordName);
    }

    /**
     * Display the selected chord
     */
    displayChord() {
        if (!this.currentChord) return;

        const { name, data } = this.currentChord;

        // Update chord display
        this.elements.chordName.textContent = name;
        this.elements.chordNotes.textContent = data.notes ? data.notes.join(' - ') : '-';
        this.elements.chordIntervals.textContent = data.intervals ? data.intervals.join(' - ') : '-';
        this.elements.chordQuality.textContent = data.quality || '-';
        this.elements.chordFunction.textContent = this.getChordFunction(name) || '-';

        // Update piano visualization (placeholder)
        this.updatePianoVisualization();
        
        // Update voicings (placeholder)
        this.updateVoicings();
    }

    /**
     * Get chord function (placeholder)
     */
    getChordFunction(chordName) {
        // TODO: Implement proper chord function analysis
        if (chordName.startsWith('C')) return 'I (Tonic)';
        if (chordName.startsWith('F')) return 'IV (Subdominant)';
        if (chordName.startsWith('G')) return 'V (Dominant)';
        if (chordName.startsWith('Am')) return 'vi (Relative Minor)';
        return 'Function TBD';
    }

    /**
     * Update piano visualization (placeholder)
     */
    updatePianoVisualization() {
        if (!this.currentChord) return;
        
        const notes = this.currentChord.data.notes || [];
        this.elements.pianoContainer.innerHTML = `
            <div class="piano-placeholder">
                <p>Piano visualization for: <strong>${this.currentChord.name}</strong></p>
                <p>Notes: ${notes.join(', ')}</p>
                <p><em>Piano keyboard will be rendered here</em></p>
            </div>
        `;
    }

    /**
     * Update voicings display (placeholder)
     */
    updateVoicings() {
        if (!this.currentChord) return;

        const voicings = this.generateBasicVoicings(this.currentChord);
        
        this.elements.voicingsGrid.innerHTML = voicings.map(voicing => `
            <div class="voicing-card">
                <div class="voicing-name">${voicing.name}</div>
                <div class="voicing-notes">${voicing.notes.join(' - ')}</div>
                <div class="voicing-placeholder">
                    <em>Mini piano will appear here</em>
                </div>
            </div>
        `).join('');
    }

    /**
     * Generate basic voicings (placeholder)
     */
    generateBasicVoicings(chord) {
        const notes = chord.data.notes || [];
        if (notes.length === 0) return [];

        const voicings = [
            { name: 'Root Position', notes: notes },
        ];

        // Add inversions if chord has enough notes
        if (notes.length >= 3) {
            const firstInversion = [notes[1], notes[2], notes[0]];
            voicings.push({ name: '1st Inversion', notes: firstInversion });
        }

        if (notes.length >= 4) {
            const secondInversion = [notes[2], notes[3], notes[0], notes[1]];
            voicings.push({ name: '2nd Inversion', notes: secondInversion });
        }

        return voicings;
    }

    /**
     * Select chord category for browsing
     */
    selectCategory(category) {
        this.currentCategory = category;
        
        // Update active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Display chords in category
        this.displayCategoryChords(category);
    }

    /**
     * Display chords in selected category (placeholder)
     */
    displayCategoryChords(category) {
        const categoryChords = this.getChordsInCategory(category);
        
        this.elements.chordDetails.innerHTML = `
            <div class="category-chords">
                <h4>${this.getCategoryTitle(category)}</h4>
                <div class="chord-list">
                    ${categoryChords.map(chord => `
                        <div class="chord-item" data-chord="${chord}">
                            <span class="chord-name">${chord}</span>
                            <span class="chord-notes">${this.chords[chord]?.notes?.join(' ') || ''}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Add click listeners to chord items
        this.elements.chordDetails.querySelectorAll('.chord-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const chordName = e.currentTarget.dataset.chord;
                this.selectChord(chordName);
            });
        });
    }

    /**
     * Get chords in category (placeholder)
     */
    getChordsInCategory(category) {
        const allChords = Object.keys(this.chords);
        
        switch (category) {
            case 'major':
                return allChords.filter(chord => 
                    !chord.includes('m') && !chord.includes('7') && !chord.includes('sus')
                );
            case 'minor':
                return allChords.filter(chord => chord.includes('m') && !chord.includes('7'));
            case 'seventh':
                return allChords.filter(chord => chord.includes('7'));
            default:
                return allChords.slice(0, 5); // Placeholder
        }
    }

    /**
     * Get category title
     */
    getCategoryTitle(category) {
        const titles = {
            'major': 'Major Chords',
            'minor': 'Minor Chords',
            'seventh': '7th Chords',
            'extended': 'Extended Chords',
            'altered': 'Altered Chords',
            'suspended': 'Suspended Chords'
        };
        return titles[category] || 'Chords';
    }

    /**
     * Handle tab switching
     */
    handleTabSwitch(tabName) {
        switch (tabName) {
            case 'search':
                // Initialize search tab
                break;
            case 'browse':
                // Initialize browse tab
                this.displayCategoryChords(this.currentCategory);
                break;
            case 'interactive':
                // Initialize interactive tab
                this.setupInteractivePiano();
                break;
        }
    }

    /**
     * Setup interactive piano (placeholder)
     */
    setupInteractivePiano() {
        this.elements.interactivePiano.innerHTML = `
            <div class="interactive-placeholder">
                <p><em>Interactive piano keyboard will appear here</em></p>
                <p>Click keys to select notes and identify chords</p>
            </div>
        `;
    }

    /**
     * Clear selected notes
     */
    clearSelectedNotes() {
        this.selectedNotes = [];
        this.elements.selectedNotesList.textContent = 'None';
        this.elements.chordResults.innerHTML = '<div class="placeholder-text">Select notes to identify chords</div>';
    }

    /**
     * Clear chord display
     */
    clearChordDisplay() {
        this.currentChord = null;
        this.elements.chordName.textContent = 'Select a chord to explore';
        this.elements.chordNotes.textContent = '-';
        this.elements.chordIntervals.textContent = '-';
        this.elements.chordFunction.textContent = '-';
        this.elements.chordQuality.textContent = '-';
        
        this.elements.pianoContainer.innerHTML = '<div class="placeholder-text">Piano visualization will appear here</div>';
        this.elements.voicingsGrid.innerHTML = '<div class="placeholder-text">Chord voicings will appear here</div>';
    }
}

// Initialize chord dictionary when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.chordDictionary === 'undefined') {
        window.chordDictionary = new ChordDictionary();
        window.chordDictionary.init();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordDictionary;
}

