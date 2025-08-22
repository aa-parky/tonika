const STORAGE_KEY = "tonika.settings.v1";

// Expanded defaults: add a Support block
const DEFAULTS = {
  bigChordScale: 1.0,
  showNoteNames: true,
  velocityScaling: 1.0,
  latencyCompensation: 0,
  showTheoryExplanations: false,
  viewSel: "both",
  keySel: "C",
  scaleSel: "major",
  tuningSel: "40,45,50,55,59,64", // EADGBE std
  support: {
    showDevtools: false,
  },
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return deepMerge(structuredClone(DEFAULTS), parsed);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Settings save failed", e);
  }
}

// shallow merge for top-level, deep for nested objects we know about
function deepMerge(base, patch) {
  for (const k of Object.keys(patch || {})) {
    if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
      base[k] = deepMerge(base[k], patch[k]);
    } else {
      base[k] = patch[k];
    }
  }
  return base;
}

export class Settings {
  constructor() {
    this._data = load();
    this._subs = new Set(); // fn(next, prev)
  }
  get all() {
    return structuredClone(this._data);
  }
  get(key) {
    return this._data[key];
  }

  // dot-path helper (e.g., setPath('support.showDevtools', true))
  setPath(path, value) {
    const prev = structuredClone(this._data);
    const parts = path.split(".");
    let ref = this._data;
    while (parts.length > 1) {
      const p = parts.shift();
      if (!(p in ref) || typeof ref[p] !== "object") ref[p] = {};
      ref = ref[p];
    }
    ref[parts[0]] = value;
    save(this._data);
    this._notify(prev);
  }

  set(key, value) {
    const prev = structuredClone(this._data);
    this._data = { ...this._data, [key]: value };
    save(this._data);
    this._notify(prev);
  }

  update(patch) {
    const prev = structuredClone(this._data);
    const p = typeof patch === "function" ? patch(prev) : patch;
    this._data = deepMerge(this._data, p);
    save(this._data);
    this._notify(prev);
  }

  subscribe(fn, fireImmediately = false) {
    this._subs.add(fn);
    if (fireImmediately) fn(this._data, this._data);
    return () => this._subs.delete(fn);
  }

  _notify(prev) {
    for (const fn of this._subs) {
      try {
        fn(this._data, prev);
      } catch (e) {
        console.error("[Settings]", e);
      }
    }
  }
}

export const settings = new Settings();
