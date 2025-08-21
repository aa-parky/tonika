"use strict";
// Global DOM helpers (attached to window for non-module usage)
(function (global) {
  if (!global.qs) global.qs = (sel, ctx = document) => ctx.querySelector(sel);
  if (!global.qsa)
    global.qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  if (!global.el)
    global.el = (tag, props = {}) => {
      const n = document.createElement(tag);
      Object.assign(n, props);
      return n;
    };
  if (!global.text) global.text = (t) => document.createTextNode(t);
  if (!global.qsStrict)
    global.qsStrict = (sel, ctx = document) => {
      const node = ctx.querySelector(sel);
      if (!node)
        throw new Error(`qsStrict: element not found for selector: ${sel}`);
      return node;
    };
})(window);
