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

  function convertToMIDI(takeData) {
    if (!window.MidiWriter) {
      console.error("MidiWriter library not loaded");
      return null;
    }

    try {
      const track = new MidiWriter.Track();

      // Add track name and tempo
      track.addTrackName(`Tonika Take ${fmtStamp(takeData)}`);
      track.setTempo(120); // Default 120 BPM
      track.setTimeSignature(4, 4); // 4/4 time signature

      // Convert events to MIDI format with chord detection
      const noteOnEvents = new Map(); // Track note on events to calculate durations
      const midiEvents = [];
      const CHORD_THRESHOLD_MS = 50; // Notes within 50ms are considered simultaneous

      // First pass: collect all note events and pair note on/off
      takeData.events.forEach((event) => {
        // Skip CC events for MIDI note generation (they're recorded but don't create notes)
        if (event.type !== "on" && event.type !== "off") return;

        if (event.type === "on" && event.vel > 0) {
          noteOnEvents.set(event.midi, {
            ...event,
            startTime: event.t,
          });
        } else if (
          event.type === "off" ||
          (event.type === "on" && event.vel === 0)
        ) {
          const noteOnEvent = noteOnEvents.get(event.midi);
          if (noteOnEvent) {
            const duration = Math.max(event.t - noteOnEvent.startTime, 50); // Minimum 50ms duration
            midiEvents.push({
              pitch: event.midi,
              velocity: noteOnEvent.vel,
              startTime: noteOnEvent.startTime,
              duration: duration,
            });
            noteOnEvents.delete(event.midi);
          }
        }
      });

      // Handle any remaining note-on events (notes that didn't have note-off)
      noteOnEvents.forEach((noteOnEvent, midi) => {
        const duration = Math.max(
          takeData.durationMs - noteOnEvent.startTime,
          100,
        );
        midiEvents.push({
          pitch: midi,
          velocity: noteOnEvent.vel,
          startTime: noteOnEvent.startTime,
          duration: duration,
        });
      });

      // Sort events by start time
      midiEvents.sort((a, b) => a.startTime - b.startTime);

      // Group simultaneous notes into chords
      const chordGroups = [];
      let currentGroup = [];
      let currentGroupTime = -1;

      midiEvents.forEach((event) => {
        if (
          currentGroupTime === -1 ||
          Math.abs(event.startTime - currentGroupTime) <= CHORD_THRESHOLD_MS
        ) {
          // Add to current chord group
          currentGroup.push(event);
          if (currentGroupTime === -1) currentGroupTime = event.startTime;
        } else {
          // Start new chord group
          if (currentGroup.length > 0) {
            chordGroups.push({
              startTime: currentGroupTime,
              notes: [...currentGroup],
            });
          }
          currentGroup = [event];
          currentGroupTime = event.startTime;
        }
      });

      // Don't forget the last group
      if (currentGroup.length > 0) {
        chordGroups.push({
          startTime: currentGroupTime,
          notes: [...currentGroup],
        });
      }

      // Convert chord groups to MidiWriter format
      let currentTime = 0;
      chordGroups.forEach((group) => {
        const waitTime = Math.max(0, group.startTime - currentTime);
        const waitTicks = Math.round((waitTime / 1000) * 480); // Convert ms to ticks (480 ticks per quarter note)

        if (group.notes.length === 1) {
          // Single note
          const note = group.notes[0];
          const durationTicks = Math.round((note.duration / 1000) * 480);

          track.addEvent(
            new MidiWriter.NoteEvent({
              pitch: note.pitch,
              duration: `T${durationTicks}`,
              velocity: Math.round((note.velocity / 127) * 100),
              wait: `T${waitTicks}`,
            }),
          );

          currentTime = group.startTime + note.duration;
        } else {
          // Chord - multiple simultaneous notes
          const pitches = group.notes.map((n) => n.pitch);
          const velocities = group.notes.map((n) =>
            Math.round((n.velocity / 127) * 100),
          );
          const avgDuration =
            group.notes.reduce((sum, n) => sum + n.duration, 0) /
            group.notes.length;
          const durationTicks = Math.round((avgDuration / 1000) * 480);

          track.addEvent(
            new MidiWriter.NoteEvent({
              pitch: pitches,
              duration: `T${durationTicks}`,
              velocity: velocities[0], // Use first note's velocity for the chord
              wait: `T${waitTicks}`,
            }),
          );

          currentTime = group.startTime + avgDuration;
        }
      });

      // Create the MIDI file
      const writer = new MidiWriter.Writer(track);
      return writer.buildFile();
    } catch (error) {
      console.error("Error converting to MIDI:", error);
      return null;
    }
  }

  function downloadFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportTake(index, format = "json") {
    const takes = (window.Recorder && Recorder.getTakes()) || [];
    if (index < 0 || index >= takes.length) return;

    const take = takes[index];
    const timestamp = fmtStamp(take);

    if (format === "midi") {
      const midiData = convertToMIDI(take);
      if (midiData) {
        downloadFile(midiData, `tonika_take_${timestamp}.mid`, "audio/midi");
      } else {
        alert("Failed to convert to MIDI format");
      }
    } else {
      // Default JSON export
      const jsonData = JSON.stringify(take, null, 2);
      downloadFile(
        jsonData,
        `tonika_take_${timestamp}.json`,
        "application/json",
      );
    }
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

      // Create export dropdown
      const exportDropdown = document.createElement("div");
      exportDropdown.className = "export-dropdown";

      const exportBtn = document.createElement("button");
      exportBtn.className = "btn small export-btn";
      exportBtn.textContent = "Export ▼";

      const exportMenu = document.createElement("div");
      exportMenu.className = "export-menu hidden";

      const exportJSON = document.createElement("button");
      exportJSON.className = "export-option";
      exportJSON.textContent = "Export as JSON";
      exportJSON.onclick = (e) => {
        e.stopPropagation();
        exportTake(actualIndex, "json");
        exportMenu.classList.add("hidden");
        exportDropdown.classList.remove("open");
        li.classList.remove("dropdown-open");
      };

      const exportMIDI = document.createElement("button");
      exportMIDI.className = "export-option";
      exportMIDI.textContent = "Export as MIDI";
      exportMIDI.onclick = (e) => {
        e.stopPropagation();
        exportTake(actualIndex, "midi");
        exportMenu.classList.add("hidden");
        exportDropdown.classList.remove("open");
        li.classList.remove("dropdown-open");
      };

      exportMenu.appendChild(exportJSON);
      exportMenu.appendChild(exportMIDI);

      // Toggle dropdown on button click
      exportBtn.onclick = (e) => {
        e.stopPropagation();

        // Close other open dropdowns first
        document
          .querySelectorAll(".export-menu:not(.hidden)")
          .forEach((menu) => {
            if (menu !== exportMenu) {
              menu.classList.add("hidden");
              // Remove stacking classes from other dropdowns
              const otherDropdown = menu.closest(".export-dropdown");
              const otherListItem = menu.closest("li");
              if (otherDropdown) otherDropdown.classList.remove("open");
              if (otherListItem)
                otherListItem.classList.remove("dropdown-open");
            }
          });

        // Toggle current dropdown
        const isOpening = exportMenu.classList.contains("hidden");
        exportMenu.classList.toggle("hidden");

        // Manage stacking context classes
        if (isOpening) {
          exportDropdown.classList.add("open");
          li.classList.add("dropdown-open");
        } else {
          exportDropdown.classList.remove("open");
          li.classList.remove("dropdown-open");
        }
      };

      exportDropdown.appendChild(exportBtn);
      exportDropdown.appendChild(exportMenu);

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn small";
      btnDelete.textContent = "Delete";
      btnDelete.onclick = () => Recorder.deleteTake(actualIndex);

      right.append(exportDropdown, btnDelete);
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

    // Global click handler to close export dropdowns
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".export-dropdown")) {
        document
          .querySelectorAll(".export-menu:not(.hidden)")
          .forEach((menu) => {
            menu.classList.add("hidden");
            // Clean up stacking classes
            const dropdown = menu.closest(".export-dropdown");
            const listItem = menu.closest("li");
            if (dropdown) dropdown.classList.remove("open");
            if (listItem) listItem.classList.remove("dropdown-open");
          });
      }
    });
  });
})();
