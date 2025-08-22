import { bus } from "../core/event-bus.js";

export function mountMidiDevtools({ target = document.body } = {}) {
  if (document.getElementById("midi-devtools")) {
    return { unmount: () => unmountMidiDevtools() };
  }

  const wrap = document.createElement("section");
  wrap.id = "midi-devtools";
  wrap.style.cssText = `
	font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	background: #0b0c0f; color: #d5d8df; border: 1px solid #1f2430;
	border-radius: 8px; padding: 12px; margin: 12px auto; max-width: 980px;
  `;

  wrap.innerHTML = `
	<details open>
	  <summary style="cursor:pointer">MIDI Devtools</summary>
	  <div style="display:flex; gap:16px; margin-top:8px; flex-wrap:wrap">
		<div style="flex:1; min-width:260px">
		  <div style="opacity:.8; margin-bottom:6px">Inputs</div>
		  <ul id="midi-inputs" style="list-style:none; padding:0; margin:0"></ul>
		</div>
		<div style="flex:1; min-width:260px">
		  <div style="opacity:.8; margin-bottom:6px">Outputs</div>
		  <ul id="midi-outputs" style="list-style:none; padding:0; margin:0"></ul>
		</div>
	  </div>
	  <div style="opacity:.8; margin:10px 0 6px">Live events</div>
	  <div id="midi-log" style="
		background:#0f1116;border:1px solid #232838;border-radius:6px;
		padding:8px; max-height:240px; overflow:auto; white-space:pre; font-size:12px;
	  "></div>
	  <div style="display:flex; gap:8px; margin-top:8px">
		<button id="midi-log-clear">Clear</button>
	  </div>
	</details>
  `;
  target.prepend(wrap);

  const $in = wrap.querySelector("#midi-inputs");
  const $out = wrap.querySelector("#midi-outputs");
  const $log = wrap.querySelector("#midi-log");
  wrap.querySelector("#midi-log-clear").addEventListener("click", () => {
    $log.textContent = "";
  });

  const log = (line) => {
    const ts = new Date().toLocaleTimeString();
    $log.textContent += `[${ts}] ${line}\n`;
    $log.scrollTop = $log.scrollHeight;
  };

  const off = [];
  off.push(bus.on("midi:ready", () => log("MIDI ready")));
  off.push(bus.on("midi:error", (e) => log(`MIDI error: ${e.message}`)));
  off.push(
    bus.on("midi:ports", ({ inputs, outputs }) => {
      $in.innerHTML =
        inputs
          .map(
            (p) =>
              `<li>• ${p.name} <span style="opacity:.6">(${p.manufacturer || "—"})</span></li>`,
          )
          .join("") || "<li>—</li>";
      $out.innerHTML =
        outputs
          .map(
            (p) =>
              `<li>• ${p.name} <span style="opacity:.6">(${p.manufacturer || "—"})</span></li>`,
          )
          .join("") || "<li>—</li>";
      log(`Ports updated: ${inputs.length} in / ${outputs.length} out`);
    }),
  );
  off.push(
    bus.on("midi:noteon", (ev) =>
      log(
        `NOTE ON  ch${ev.channel} ${ev.name} (${ev.note}) vel=${ev.velocity} src="${ev.input}"`,
      ),
    ),
  );
  off.push(
    bus.on("midi:noteoff", (ev) =>
      log(
        `NOTE OFF ch${ev.channel} ${ev.name} (${ev.note}) vel=${ev.velocity} src="${ev.input}"`,
      ),
    ),
  );
  off.push(
    bus.on("midi:cc", (ev) =>
      log(
        `CC      ch${ev.channel} cc=${ev.cc} value=${ev.value} src="${ev.input}"`,
      ),
    ),
  );

  function unmount() {
    off.forEach((fn) => fn && fn()); // each .on returns an off()
    wrap.remove();
  }
  // expose a static helper too
  mountMidiDevtools._lastUnmount = unmount;
  return { unmount };
}

export function unmountMidiDevtools() {
  if (mountMidiDevtools._lastUnmount) {
    mountMidiDevtools._lastUnmount();
    mountMidiDevtools._lastUnmount = null;
  } else {
    const el = document.getElementById("midi-devtools");
    if (el) el.remove();
  }
}
