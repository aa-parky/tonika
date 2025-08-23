// Universal *onika loader.
// Looks for elements with [data-onika="GlobalName"] and mounts them to data-target.
function resolveGlobal(path) {
  // Supports "Clavonika" or "Namespace.Clavonika"
  return path
    .split(".")
    .reduce((acc, key) => (acc ? acc[key] : undefined), window);
}

function mountComponent(globalName, targetSelector, opts = {}) {
  const mod = resolveGlobal(globalName);
  const target = document.querySelector(targetSelector);
  if (!mod) {
    console.warn(`[Tonika] Global "${globalName}" not found on window.`);
    if (target)
      target.textContent = `⚠︎ ${globalName} is not loaded (script missing?)`;
    return false;
  }
  if (!target) {
    console.warn(`[Tonika] Target "${targetSelector}" not found.`);
    return false;
  }
  // Convention: each module exposes mount(el, opts)
  if (typeof mod.mount !== "function") {
    console.warn(`[Tonika] ${globalName} has no mount(el, opts) method.`);
    target.textContent = `⚠︎ ${globalName} has no mount(el, opts)`;
    return false;
  }
  target.innerHTML = ""; // clear slot
  mod.mount(target, opts);
  return true;
}

export function setupOnikaLoader() {
  // Click-to-mount buttons
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-onika][data-target]");
    if (!btn) return;
    const name = btn.getAttribute("data-onika");
    const target = btn.getAttribute("data-target");
    mountComponent(name, target);
  });

  // Auto-mount any cards that declare data-onika + data-target (optional)
  document
    .querySelectorAll("[data-onika][data-target][data-autoload]")
    .forEach((el) => {
      mountComponent(
        el.getAttribute("data-onika"),
        el.getAttribute("data-target"),
      );
    });

  // Expose a helper for manual scripting if needed
  window.Tonika = Object.assign(window.Tonika || {}, { mountComponent });
}
