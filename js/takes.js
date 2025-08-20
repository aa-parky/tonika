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

    // Get sort preference
    const sortSelect = document.getElementById("takesSortSelect");
    const sortOrder = sortSelect ? sortSelect.value : getSortPreference();

    // Sort takes based on preference
    const sortedTakes = [...takes].sort((a, b) => {
      if (sortOrder === "oldest") {
        return a.startedAt - b.startedAt; // Oldest first
      } else {
        return b.startedAt - a.startedAt; // Newest first (default)
      }
    });

    const ol = document.createElement("ol");
    ol.className = "takes-list";
    sortedTakes.forEach((t, originalIndex) => {
      // Find the original index in the unsorted array for proper deletion
      const actualIndex = takes.indexOf(t);

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
      btnExport.onclick = () => Recorder.exportTake(actualIndex);

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn small";
      btnDelete.textContent = "Delete";
      btnDelete.onclick = () => Recorder.deleteTake(actualIndex);

      right.append(btnExport, btnDelete);
      li.append(left, right);
      ol.appendChild(li);
    });

    container.appendChild(ol);
  }

  function getSortPreference() {
    return localStorage.getItem("tonika-takes-sort") || "newest";
  }

  function setSortPreference(sortOrder) {
    localStorage.setItem("tonika-takes-sort", sortOrder);
  }

  function initializeSortControl() {
    const sortSelect = document.getElementById("takesSortSelect");
    if (!sortSelect) return;

    // Restore saved sort preference
    const savedSort = getSortPreference();
    sortSelect.value = savedSort;

    // Add event listener for sort changes
    sortSelect.addEventListener("change", () => {
      const newSort = sortSelect.value;
      setSortPreference(newSort);

      // Re-render the list with new sort order
      const takesPanel = document.getElementById("takesPanel");
      if (takesPanel) {
        renderList(takesPanel);
      }
    });
  }

  function buildPanel() {
    // Use the existing takesPanel in the tab structure
    const takesPanel = document.getElementById("takesPanel");
    const clearBtn = document.getElementById("clearTakesBtn");

    if (!takesPanel) {
      console.warn(
        "takesPanel not found - tab structure may not be loaded yet",
      );
      return null;
    }

    return {
      panel: takesPanel,
      clearBtn: clearBtn,
    };
  }

  ready(() => {
    const ui = buildPanel();
    if (!ui || !ui.panel) return;

    // Initialize sort control
    initializeSortControl();

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
