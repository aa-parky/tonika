import { settings } from "../services/settings.js";
import { mountMidiDevtools, unmountMidiDevtools } from "./midi-devtools.js";

function ensureSupportBox() {
  let box = document.getElementById("support-box");
  if (box) return box;
  box = document.createElement("section");
  box.id = "support-box";
  box.style.cssText = `
	max-width: 980px; margin: 0 auto 12px; padding: 10px 12px;
	border: 1px dashed #394150; border-radius: 8px;
	font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
	background: rgba(56,64,78,.15);
  `;
  box.innerHTML = `
	<strong>Support</strong>
	<label style="margin-left:12px; cursor:pointer;">
	  <input id="support-devtools" type="checkbox" />
	  Show MIDI Devtools <span style="opacity:.6">(Alt/Option + D)</span>
	</label>
  `;
  document.body.prepend(box);
  return box;
}

function syncDevtoolsToggle(checked) {
  if (checked) {
    mountMidiDevtools({ target: document.body });
  } else {
    unmountMidiDevtools();
  }
}

export function bootSupport() {
  const box = ensureSupportBox();
  const toggle = box.querySelector("#support-devtools");

  // Reflect current settings into UI
  const current = !!settings.get("support")?.showDevtools;
  toggle.checked = current;
  syncDevtoolsToggle(current);

  // Persist on change
  toggle.addEventListener("change", () => {
    settings.update({ support: { showDevtools: !!toggle.checked } });
  });

  // React to external changes (e.g., query or keyboard)
  settings.subscribe((next, prev) => {
    const after = !!next.support?.showDevtools;
    const before = !!prev.support?.showDevtools;
    if (after !== before) {
      toggle.checked = after;
      syncDevtoolsToggle(after);
    }
  });

  // Keyboard shortcut: Alt/Option + D
  window.addEventListener("keydown", (e) => {
    if (
      (e.altKey || e.metaKey) &&
      !e.ctrlKey &&
      !e.shiftKey &&
      e.key.toLowerCase() === "d"
    ) {
      e.preventDefault();
      settings.update((s) => ({
        support: { showDevtools: !s.support?.showDevtools },
      }));
    }
  });
}
