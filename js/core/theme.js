 const root = document.documentElement;

    // load saved choice or sensible defaults
    const savedTheme = localStorage.getItem('tonika.theme') || 'brown-02';
    const savedMode  = localStorage.getItem('tonika.mode')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    root.setAttribute('data-theme', savedTheme);
    root.setAttribute('data-mode',  savedMode);

    // public helpers
    window.TonikaTheme = {
    setTheme(name) {
    root.setAttribute('data-theme', name);
    localStorage.setItem('tonika.theme', name);
},
    toggleMode() {
    const next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-mode', next);
    localStorage.setItem('tonika.mode', next);
},
    setMode(mode) {
    root.setAttribute('data-mode', mode);
    localStorage.setItem('tonika.mode', mode);
}
};
