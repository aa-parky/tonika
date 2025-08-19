// takes.js
// Tonika – session Takes panel (renders from Recorder.getTakes()).

(function () {
  // Wait until DOM and Recorder exist
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
    return new Date(take.startedAt)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "Z");
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
    // Insert after the piano card
    const pianoCard = document.getElementById("pianoCard");
    if (!pianoCard) return;

    // If card already exists, reuse
    let takesCard = document.getElementById("takesCard");
    if (!takesCard) {
      takesCard = document.createElement("div");
      takesCard.className = "card";
      takesCard.id = "takesCard";
      takesCard.innerHTML = `
		<div class="stat">
		  <div class="title">Takes</div>
		  <div class="small" id="takesHint">Auto-captured this session</div>
		</div>
		<div id="takesPanel"></div>
	  `;
      // Place after piano card
      pianoCard.parentElement.insertBefore(takesCard, pianoCard.nextSibling);
    }
    return document.getElementById("takesPanel");
  }

  ready(() => {
    const panel = buildPanel();
    if (!panel) return;

    // Initial render
    renderList(panel);

    // Re-render on any recorder updates
    window.addEventListener("recorder:take", () => renderList(panel));
    window.addEventListener("recorder:takeschanged", () => renderList(panel));
  });
})();
