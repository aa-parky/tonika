# Tonika Modules

This directory is reserved for **user-created or optional add-on modules** that extend the Tonika ecosystem.  
Whereas `js/core/` contains the official core libraries, the `modules/` folder is a home for **standalone components** that:

- Build on existing Tonika functionality (e.g. Jackonika, Chordonika, Clavonika).
- Can be loaded into `tonika.html` or other host pages as optional extras.
- Remain self-contained: each module should keep its HTML, CSS, JS, and any assets local.

---

## Structure

Each module should live in its own subdirectory:

```

modules/
example-module/
example.html
example.css
example.js       # optional
assets/          # optional (images, fonts, etc)
README.md        # short description of the module

```

---

## Purpose

- Encourage **experimentation** without polluting `js/core/` or `demo/`.
- Provide a **clean separation** between official Tonika features and community / user-driven extensions.
- Allow modules to be versioned, tested, or even shared independently.

---

## Notes for Contributors

- Use clear, prefixed CSS class names (e.g. `.hellscream__needle`) to avoid style clashes.
- Avoid modifying core files; modules should listen to **Tonika.Bus** or extend `TonikaModule` if deeper integration is needed.
- Document each module with a short `README.md` describing what it does, how to use it, and any quirks.
- Modules may graduate into `js/core/` once they are stable, widely useful, and meet coding standards.

---

GPL-3.0 License © 2025 — part of the **Tonika** project.

