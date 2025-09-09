// ======================================================================
// Tonika Dynamic Theme System
// ----------------------------------------------------------------------
// This version auto-applies the saved theme/mode and dynamically
// injects available theme options into the #theme-selector dropdown.
//
// Future versions may fetch from a manifest, but this uses a static list.
// ======================================================================

const root = document.documentElement;

// 1. List of available themes (can be auto-generated later)
const availableThemes = [
    { name: "Brown 01", value: "brown-01", href: "css/themes/brown_01.css" },
    { name: "Brown 02", value: "brown-02", href: "css/themes/brown_02.css" }
];

// 2. Load saved theme/mode or sensible defaults
const savedTheme = localStorage.getItem('tonika.theme') || 'brown-02';
const savedMode  = localStorage.getItem('tonika.mode') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

root.setAttribute('data-theme', savedTheme);
root.setAttribute('data-mode', savedMode);

// 3. Inject theme <link> tags if not already loaded
availableThemes.forEach(theme => {
    if (!document.querySelector(`link[href="${theme.href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = theme.href;
        document.head.appendChild(link);
    }
});

// 4. Inject dropdown options and listen for changes
window.addEventListener("DOMContentLoaded", () => {
    const selector = document.getElementById("theme-selector");
    if (!selector) return;

    // Populate theme selector
    availableThemes.forEach(theme => {
        const opt = document.createElement("option");
        opt.value = theme.value;
        opt.textContent = theme.name;
        selector.appendChild(opt);
    });

    // Set initial selected option
    selector.value = savedTheme;

    // Change handler
    selector.addEventListener("change", (e) => {
        const selected = e.target.value;
        root.setAttribute("data-theme", selected);
        localStorage.setItem("tonika.theme", selected);
    });
});

// 5. Global helpers (e.g. for "Toggle Mode" button)
window.TonikaTheme = {
    setTheme(name) {
        root.setAttribute("data-theme", name);
        localStorage.setItem("tonika.theme", name);
    },
    toggleMode() {
        const next = root.getAttribute("data-mode") === "dark" ? "light" : "dark";
        root.setAttribute("data-mode", next);
        localStorage.setItem("tonika.mode", next);
    },
    setMode(mode) {
        root.setAttribute("data-mode", mode);
        localStorage.setItem("tonika.mode", mode);
    }
};