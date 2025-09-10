// tonika-ui.js — tiny UI helpers (tabs and delegate to TonikaTheme)
// Exposes API at window.Tonika.UI and auto-binds on DOM ready.
(() => {
    const Tonika = (window.Tonika = window.Tonika || {});
    const UI = (Tonika.UI = Tonika.UI || {});

    // Tab switching: expects .tabs button order to match .tab-content section order.
    function openTab(index) {
        const tabs = document.querySelectorAll(".tabs button");
        const sections = document.querySelectorAll(".tab-content section");
        tabs.forEach((tab, i) => {
            tab.classList.toggle("active", i === index);
            sections[i]?.classList.toggle("active", i === index);
        });
    }

    // Theme toggle → delegate to TonikaTheme
    function toggleTheme() {
        if (window.TonikaTheme && typeof window.TonikaTheme.toggleMode === "function") {
            window.TonikaTheme.toggleMode();
        } else {
            console.warn("TonikaTheme.toggleMode() not available");
        }
    }

    function bindTabs() {
        const tabs = document.querySelectorAll(".tabs button");
        tabs.forEach((btn, i) => {
            if (!btn.dataset.bound) {
                btn.addEventListener("click", () => openTab(i));
                btn.dataset.bound = "1";
            }
        });
    }

    function bindThemeToggle() {
        document.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-action='toggle-theme']");
            if (btn) toggleTheme();
        });
    }

    function init() {
        bindTabs();
        bindThemeToggle();
    }

    // Expose API (backwards compat)
    UI.openTab = openTab;
    UI.toggleTheme = toggleTheme;
    UI.init = init;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();