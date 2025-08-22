// js/core/bus.js
(function () {
  function Bus() {
    const map = new Map();
    return {
      on(type, fn) {
        if (!map.has(type)) map.set(type, new Set());
        map.get(type).add(fn);
        return () => map.get(type)?.delete(fn);
      },
      once(type, fn) {
        const off = this.on(type, (...args) => {
          off();
          fn(...args);
        });
        return off;
      },
      emit(type, payload) {
        map.get(type)?.forEach((fn) => fn(payload));
      },
      clear() {
        map.clear();
      },
    };
  }

  window.Core = window.Core || {};
  window.Core.Bus = Bus;
})();
