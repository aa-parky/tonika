// js/core/storage.js
(function () {
  const NS = "tonika/v2/";

  function key(k) {
    return NS + k;
  }

  function get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(key(k));
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function set(k, v) {
    try {
      localStorage.setItem(key(k), JSON.stringify(v));
    } catch {}
  }

  window.Core = window.Core || {};
  window.Core.Storage = { get, set };
})();
