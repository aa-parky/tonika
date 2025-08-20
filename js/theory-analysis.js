/* =========================
   Music Theory Analysis Engine for Tonika
   Phase 1: Roman Numeral Analysis & Chord Functions
   ========================= */

/**
 * TheoryAnalysis - Main class for music theory analysis
 */
class TheoryAnalysis {
  
  /**
   * Analyze a chord and return theory information
   * @param {Object} chordResult - Result from detectChordDetail
   * @param {number} keyPc - Key pitch class (0-11)
   * @param {number} keyMask - Bitmask of notes in current scale
   * @returns {Object} Theory analysis data
   */
  static analyze(chordResult, keyPc, keyMask) {
    if (!chordResult || keyPc === undefined) {
      return {
        roman: null,
        function: null,
        tensions: [],
        progression: null,
        voiceLeading: null
      };
    }

    // Determine if we're in major or minor key
    const keyType = this.determineKeyType(keyMask);
    
    // Calculate Roman numeral
    const roman = this.calculateRomanNumeral(chordResult, keyPc, keyType);
    
    // Determine chord function
    const chordFunction = this.determineChordFunction(roman, keyType);
    
    // Calculate available tensions (Phase 1: basic implementation)
    const tensions = this.calculateBasicTensions(chordResult);

    return {
      roman: roman,
      function: chordFunction,
      tensions: tensions,
      progression: null, // Phase 2
      voiceLeading: null // Phase 3
    };
  }

  /**
   * Determine if the key is major or minor based on the scale mask
   * @param {number} keyMask - Bitmask of notes in current scale
   * @returns {string} 'major' or 'minor'
   */
  static determineKeyType(keyMask) {
    if (!keyMask) return 'major'; // Default to major if no scale selected
    
    // Convert bitmask to array of pitch classes
    const scaleNotes = [];
    for (let i = 0; i < 12; i++) {
      if (keyMask & (1 << i)) {
        scaleNotes.push(i);
      }
    }
    
    if (scaleNotes.length < 7) return 'major'; // Not enough notes to determine
    
    // Check for major scale pattern (W-W-H-W-W-W-H)
    // In pitch classes: 0-2-4-5-7-9-11 (relative to root)
    const majorPattern = [0, 2, 4, 5, 7, 9, 11];
    const minorPattern = [0, 2, 3, 5, 7, 8, 10]; // Natural minor
    
    // Normalize scale to start from 0
    const normalizedScale = scaleNotes.map(note => (note - scaleNotes[0] + 12) % 12).sort((a, b) => a - b);
    
    // Check if it matches major pattern
    const matchesMajor = majorPattern.every((interval, index) => 
      index < normalizedScale.length && normalizedScale[index] === interval
    );
    
    // Check if it matches minor pattern  
    const matchesMinor = minorPattern.every((interval, index) => 
      index < normalizedScale.length && normalizedScale[index] === interval
    );
    
    if (matchesMinor) return 'minor';
    return 'major'; // Default to major
  }

  /**
   * Calculate Roman numeral for a chord
   * @param {Object} chordResult - Chord detection result
   * @param {number} keyPc - Key pitch class
   * @param {string} keyType - 'major' or 'minor'
   * @returns {string} Roman numeral (e.g., 'IMaj7', 'ii7', 'V7')
   */
  static calculateRomanNumeral(chordResult, keyPc, keyType) {
    // Calculate scale degree (0-6)
    const scaleDegree = (chordResult.rootPc - keyPc + 12) % 12;
    
    // Map pitch class to scale degree
    const scaleDegreeMappings = {
      major: { 0: 1, 2: 2, 4: 3, 5: 4, 7: 5, 9: 6, 11: 7 },
      minor: { 0: 1, 2: 2, 3: 3, 5: 4, 7: 5, 8: 6, 10: 7 }
    };
    
    const mapping = scaleDegreeMappings[keyType];
    const degree = mapping[scaleDegree];
    
    if (!degree) {
      // Non-diatonic chord - try to find closest or use chromatic analysis
      return this.analyzeNonDiatonicChord(chordResult, keyPc, keyType);
    }
    
    // Get Roman numeral base
    const romanBase = this.getRomanNumeralBase(degree, keyType);
    
    // Add chord quality suffix
    const suffix = this.getChordQualitySuffix(chordResult.quality, chordResult.label);
    
    return romanBase + suffix;
  }

  /**
   * Get the base Roman numeral for a scale degree
   * @param {number} degree - Scale degree (1-7)
   * @param {string} keyType - 'major' or 'minor'
   * @returns {string} Base Roman numeral
   */
  static getRomanNumeralBase(degree, keyType) {
    const majorNumerals = ['', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const minorNumerals = ['', 'i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
    
    const numerals = keyType === 'major' ? majorNumerals : minorNumerals;
    return numerals[degree] || 'X';
  }

  /**
   * Get chord quality suffix for Roman numeral
   * @param {string} quality - Chord quality from jazz notation
   * @param {string} label - Full chord label
   * @returns {string} Quality suffix
   */
  static getChordQualitySuffix(quality, label) {
    // Extract chord type from label (everything after the root note)
    const chordType = label.replace(/^[A-G][#b]?/, '');
    
    if (!chordType || chordType === '') return ''; // Major triad
    if (chordType === 'm') return ''; // Minor triad (already in Roman numeral)
    if (chordType === 'dim') return '°';
    if (chordType === 'aug') return '+';
    if (chordType === '7') return '7';
    if (chordType === 'maj7') return 'Maj7';
    if (chordType === 'm7') return '7';
    if (chordType === 'mMaj7') return 'Maj7';
    if (chordType === 'm7b5') return '7b5';
    if (chordType === 'dim7') return '°7';
    if (chordType === '9') return '9';
    if (chordType === 'maj9') return 'Maj9';
    if (chordType === 'm9') return '9';
    if (chordType === '11') return '11';
    if (chordType === '13') return '13';
    if (chordType === 'sus2') return 'sus2';
    if (chordType === 'sus4') return 'sus4';
    if (chordType === '6') return '6';
    if (chordType === 'm6') return '6';
    
    // Handle altered chords
    if (chordType.includes('(')) {
      const baseType = chordType.split('(')[0];
      const alterations = chordType.match(/\(([^)]+)\)/)?.[1] || '';
      return baseType + '(' + alterations + ')';
    }
    
    return chordType; // Fallback to original
  }

  /**
   * Analyze non-diatonic chords (chromatic chords)
   * @param {Object} chordResult - Chord detection result
   * @param {number} keyPc - Key pitch class
   * @param {string} keyType - 'major' or 'minor'
   * @returns {string} Roman numeral analysis
   */
  static analyzeNonDiatonicChord(chordResult, keyPc, keyType) {
    const scaleDegree = (chordResult.rootPc - keyPc + 12) % 12;
    
    // Common chromatic chords
    const chromaticAnalysis = {
      1: 'bII', // Neapolitan
      3: 'bIII', // Flat III
      6: 'bVI', // Flat VI  
      8: 'bVI', // Flat VI (enharmonic)
      10: 'bVII' // Flat VII
    };
    
    if (chromaticAnalysis[scaleDegree]) {
      const base = chromaticAnalysis[scaleDegree];
      const suffix = this.getChordQualitySuffix(chordResult.quality, chordResult.label);
      return base + suffix;
    }
    
    // Secondary dominants
    if (chordResult.quality === 'dominant') {
      return this.analyzeSecondaryDominant(scaleDegree, keyType);
    }
    
    // Fallback: use chromatic notation
    const chromaticRoot = this.getAccidentalNotation(scaleDegree);
    const suffix = this.getChordQualitySuffix(chordResult.quality, chordResult.label);
    return chromaticRoot + suffix;
  }

  /**
   * Analyze secondary dominant chords
   * @param {number} scaleDegree - Chromatic scale degree
   * @param {string} keyType - 'major' or 'minor'
   * @returns {string} Secondary dominant analysis
   */
  static analyzeSecondaryDominant(scaleDegree, keyType) {
    // Map scale degrees to their targets
    const secondaryTargets = {
      major: {
        2: 'V7/V',   // D7 in C major = V7/V
        4: 'V7/vi',  // E7 in C major = V7/vi  
        7: 'V7/iii', // B7 in C major = V7/iii
        9: 'V7/ii',  // A7 in C major = V7/ii
        11: 'V7/IV'  // B7 in C major = V7/IV
      },
      minor: {
        2: 'V7/v',   // D7 in C minor = V7/v
        4: 'V7/VI',  // E7 in C minor = V7/VI
        7: 'V7/III', // G7 in C minor = V7/III
        9: 'V7/ii',  // A7 in C minor = V7/ii
        11: 'V7/iv'  // B7 in C minor = V7/iv
      }
    };
    
    const targets = secondaryTargets[keyType];
    return targets[scaleDegree] || 'V7/?';
  }

  /**
   * Get accidental notation for chromatic degrees
   * @param {number} scaleDegree - Chromatic scale degree
   * @returns {string} Accidental notation
   */
  static getAccidentalNotation(scaleDegree) {
    const accidentals = {
      1: '#I',
      3: '#II', 
      6: '#IV',
      8: '#V',
      10: '#VI'
    };
    
    return accidentals[scaleDegree] || 'X';
  }

  /**
   * Determine chord function based on Roman numeral
   * @param {string} roman - Roman numeral
   * @param {string} keyType - 'major' or 'minor'
   * @returns {string} Chord function
   */
  static determineChordFunction(roman, keyType) {
    if (!roman) return null;
    
    // Extract base Roman numeral (remove quality suffixes)
    const baseRoman = roman.replace(/[°+]?(?:Maj)?[679]?(?:\([^)]*\))?(?:sus[24])?/g, '');
    
    // Function mappings
    const functions = {
      major: {
        'I': 'Tonic',
        'ii': 'Subdominant', 
        'iii': 'Tonic',
        'IV': 'Subdominant',
        'V': 'Dominant',
        'vi': 'Tonic',
        'vii°': 'Dominant'
      },
      minor: {
        'i': 'Tonic',
        'ii°': 'Subdominant',
        'III': 'Tonic', 
        'iv': 'Subdominant',
        'v': 'Dominant',
        'VI': 'Subdominant',
        'VII': 'Subtonic'
      }
    };
    
    const functionMap = functions[keyType];
    
    // Check for exact match first
    if (functionMap[baseRoman]) {
      return functionMap[baseRoman];
    }
    
    // Handle secondary dominants
    if (roman.includes('V7/')) {
      return 'Secondary Dominant';
    }
    
    // Handle chromatic chords
    if (roman.includes('b') || roman.includes('#')) {
      return 'Chromatic';
    }
    
    return 'Other';
  }

  /**
   * Calculate basic available tensions for a chord
   * @param {Object} chordResult - Chord detection result
   * @returns {Array} Array of available tension names
   */
  static calculateBasicTensions(chordResult) {
    const tensions = [];
    const quality = chordResult.quality;
    const intervals = new Set(chordResult.pcs.map(pc => pc % 12));
    
    // Basic tension availability based on chord quality
    if (quality === 'major' || quality === 'dominant') {
      if (!intervals.has(2)) tensions.push('9');
      if (!intervals.has(6)) tensions.push('#11');
      if (!intervals.has(9)) tensions.push('13');
    } else if (quality === 'minor') {
      if (!intervals.has(2)) tensions.push('9');
      if (!intervals.has(5)) tensions.push('11');
      if (!intervals.has(9)) tensions.push('13');
    }
    
    return tensions;
  }
}

// Make TheoryAnalysis available globally
window.TheoryAnalysis = TheoryAnalysis;

