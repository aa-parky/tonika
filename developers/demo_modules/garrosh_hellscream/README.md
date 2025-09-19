# garrosh Hellscream VU Meter

A user-created Tonika add-on module.  
This component listens to **Jackonika** MIDI events via the shared **Tonika.Bus** and displays a retro-style VU meter with a swinging CSS needle.

Originally “borrowed” from an Orc’s chopper gauge — returned slightly shinier. 🪓🎛️

---

## Features

- Reacts to incoming MIDI `noteon` velocities (`0–127`).
- Fast rise, slow analog-style decay (classic VU behaviour).
- Clean separation: no changes required in Jackonika or core Tonika files.
- Fully self-contained: HTML, CSS, and PNG assets live in this module folder.

---

## Structure

```

modules/
garrosh-hellscream/
garrosh\_hellscream.html   # Standalone demo scaffold
garrosh\_hellscream.css    # Styles + needle positioning
velocity.png             # VU meter faceplate
README.md                # This file

```

---

## Usage

1. Open `garrosh_hellscream.html` in a browser.
2. Connect a MIDI device that Jackonika can see.
3. Play notes — the needle will swing according to velocity.

The module works out-of-the-box with **Tonika.Bus** and requires no extra setup.

---

## Integration Ideas

- Mount inside `tonika.html` like any other Tonika module card.
- Refactor into `Tonika.HellscreamVU` class for first-class integration (inherits from `TonikaModule`).
- Add peak-hold or multi-needle overlays for advanced use.
- Style variations (different faceplates, LED bar mode, neon goblin mode, etc).

---

## License

GPL-3.0 © 2025 — part of the wider **Tonika** ecosystem.

```
