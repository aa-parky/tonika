// takes.js
// Tonika – session Takes panel (renders from Recorder.getTakes()).

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function fmtDuration(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const msr = Math.floor(ms % 1000);
    const mm = m.toString();
    const ss = s.toString().padStart(2, "0");
    const mss = msr.toString().padStart(3, "0");
    return `${mm}:${ss}.${mss}`;
  }
  function fmtStamp(take) {
    return new Date(take.startedAt).toISOString(); // e.g. 2025-08-19T10:21:29.354Z
  }

  function renderList(container) {
    const takes = (window.Recorder && Recorder.getTakes()) || [];
    container.innerHTML = "";

    if (!takes.length) {
      const empty = document.createElement("div");
      empty.className = "small";
      empty.style.opacity = "0.8";
      empty.textContent =
        "No takes yet — play something and pause to capture a take.";
      container.appendChild(empty);
      return;
    }

    const ol = document.createElement("ol");
    ol.className = "takes-list";
    takes.forEach((t, i) => {
      const li = document.createElement("li");

      const left = document.createElement("div");
      left.className = "take-left";
      left.innerHTML = `
		<div class="take-name">tonika_take_${fmtStamp(t)}</div>
		<div class="small">Duration: ${fmtDuration(t.durationMs)} • Events: ${t.events.length}</div>
	  `;

      const right = document.createElement("div");
      right.className = "take-actions";
      const btnExport = document.createElement("button");
      btnExport.className = "btn small";
      btnExport.textContent = "Export";
      btnExport.onclick = () => Recorder.exportTake(i);

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn small";
      btnDelete.textContent = "Delete";
      btnDelete.onclick = () => Recorder.deleteTake(i);

      right.append(btnExport, btnDelete);
      li.append(left, right);
      ol.appendChild(li);
    });

    container.appendChild(ol);
  }

  function buildPanel() {
    const pianoCard = document.getElementById("pianoCard");
    if (!pianoCard) return null;

    let takesCard = document.getElementById("takesCard");
    if (!takesCard) {
      takesCard = document.createElement("div");
      takesCard.className = "card";
      takesCard.id = "takesCard";
      takesCard.innerHTML = `
		<div class="stat">
		  <div class="title">Takes</div>
		  <div class="stat-right">
			<div class="small">Auto-captured this session</div>
			<button id="clearTakesBtn" class="btn small">Clear all</button>
		  </div>
		</div>
		<div id="takesPanel"></div>
	  `;
      pianoCard.parentElement.insertBefore(takesCard, pianoCard.nextSibling);
    }
    return {
      panel: document.getElementById("takesPanel"),
      clearBtn: document.getElementById("clearTakesBtn"),
    };
  }

  ready(() => {
    const ui = buildPanel();
    if (!ui || !ui.panel) return;

    // Initial render (also catches restored takes from storage)
    renderList(ui.panel);

    // Button: Clear all takes
    if (ui.clearBtn) ui.clearBtn.onclick = () => Recorder.clear();

    // Re-render on any recorder updates
    window.addEventListener("recorder:take", () => renderList(ui.panel));
    window.addEventListener("recorder:takeschanged", () =>
      renderList(ui.panel),
    );
  });
})();
