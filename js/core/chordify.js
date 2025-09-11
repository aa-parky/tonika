// ===================================================================
/* CHORDIFY: table -> iframe controller (vanilla JS, no framework)
 Expects a JSON file at ./song_data.json with objects:
 { artist, song, duration, key, tempo, pulse, progressions, iframe_url }
*/
// ===================================================================
(() => {
const chordify = {
    tableView: document.getElementById("chordify-table-view"),
    playerView: document.getElementById("chordify-player-view"),
    tbody: document.getElementById("chordify-tbody"),
    empty: document.getElementById("chordify-empty"),
    stats: document.getElementById("chordify-stats"),
    search: document.getElementById("chordify-search"),
    backBtn: document.getElementById("chordify-back"),
    openBtn: document.getElementById("chordify-open"),
    iframe: document.getElementById("chordify-iframe"),
    title: document.getElementById("chordify-title"),
    artist: document.getElementById("chordify-artist"),
    duration: document.getElementById("chordify-duration"),
    key: document.getElementById("chordify-key"),
    tempo: document.getElementById("chordify-tempo"),
    pulse: document.getElementById("chordify-pulse"),
    progressions: document.getElementById("chordify-progressions"),
    rows: [],
    data: [],
};

function toggleViews(showPlayer) {
    chordify.tableView.hidden = !!showPlayer;
    chordify.playerView.hidden = !showPlayer;
}

function renderStats(filteredCount, totalCount) {
    chordify.stats.textContent = `${filteredCount} / ${totalCount} songs`;
}

function createRow(item, idx) {
    const tr = document.createElement("tr");
    tr.className = "chordify--table__row chordify--table__row--clickable";
    tr.dataset.index = String(idx);
    tr.innerHTML = `
    <td class="chordify--table__cell chordify--table__cell--song">
      <div class="chordify--song-info">
        <div class="chordify--song-info__title">${item.song}</div>
      </div>
    </td>
    <td class="chordify--table__cell chordify--table__cell--artist">
      <span class="chordify--artist-name">${item.artist}</span>
    </td>
    <td class="chordify--table__cell chordify--table__cell--duration">
      <span class="chordify--duration">${item.duration || ""}</span>
    </td>
    <td class="chordify--table__cell chordify--table__cell--key">
      <span class="chordify--key-badge">${item.key || ""}</span>
    </td>
    <td class="chordify--table__cell chordify--table__cell--tempo">
      <span class="chordify--tempo">${item.tempo || ""}</span>
    </td>
    <td class="chordify--table__cell chordify--table__cell--pulse">
      <span class="chordify--pulse">${item.pulse || ""}</span>
    </td>
    <td class="chordify--table__cell chordify--table__cell--progressions">
      <span class="chordify--progressions">${item.progressions || ""}</span>
    </td>
    <td class="chordify--table__cell chordify--table__cell--actions">
      <button class="chordify--btn chordify--btn--small" data-action="open">Open</button>
    </td>`;
    return tr;
}

function renderTable(data) {
    chordify.tbody.innerHTML = "";
    chordify.rows = data.map((item, idx) => {
        const row = createRow(item, idx);
        chordify.tbody.appendChild(row);
        return row;
    });
    chordify.empty.hidden = data.length !== 0;
    renderStats(data.length, chordify.data.length);
}

function filterTable(query) {
    const q = (query || "").toLowerCase();
    const filtered = chordify.data.filter((item) => {
        return (
            (item.song || "").toLowerCase().includes(q) ||
            (item.artist || "").toLowerCase().includes(q)
        );
    });
    renderTable(filtered);
}

function openItem(item) {
    if (!item) return;
    chordify.title.textContent = item.song || "—";
    chordify.artist.textContent = item.artist || "";
    chordify.duration.textContent = item.duration || "";
    chordify.key.textContent = item.key || "";
    chordify.tempo.textContent = item.tempo || "";
    chordify.pulse.textContent = item.pulse || "";
    chordify.progressions.textContent = item.progressions || "";
    chordify.iframe.src = item.iframe_url || "";
    chordify.openBtn.href = item.iframe_url || "#";
    toggleViews(true);
}

function attachChordifyHandlers() {
    // Back to list
    chordify.backBtn.addEventListener("click", () => {
        chordify.iframe.src = "about:blank";
        toggleViews(false);
    });

    // Row click / Open button
    chordify.tbody.addEventListener("click", (e) => {
        const openBtn = e.target.closest("[data-action='open']");
        const tr = e.target.closest("tr[data-index]");
        if (!tr) return;
        const idx = Number(tr.dataset.index);
        const item = chordify.data[idx];
        if (openBtn || tr) openItem(item);
    });

    // Search
    chordify.search.addEventListener("input", (e) => {
        filterTable(e.target.value);
    });
}

async function loadChordifyData() {
    try {
        const res = await fetch("song_data.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch song_data.json");
        const data = await res.json();
        chordify.data = Array.isArray(data) ? data : [];
        renderTable(chordify.data);
    } catch (err) {
        console.warn("[Chordify] Could not load song_data.json:", err);
        chordify.stats.textContent = "0 / 0 songs";
        chordify.empty.hidden = false;
    }
}

attachChordifyHandlers();
loadChordifyData();
toggleViews(false);
})();