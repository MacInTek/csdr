import { db } from "../scripts/firebaseConfig.js";
import {
  collection, getDocs,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { darkModeCSS } from "../scripts/darkMode.js";

/**
 * PersonnelInventory — read-only inventory view with search.
 *
 * Firestore path:
 *   cabinet/{cabinetId}
 *   cabinet/{cabinetId}/drawers/{drawerId}
 *   cases/{caseId}  (stores drawerId for grouping)
 *
 * Features:
 *   - Search bar filters cabinets / drawers by name (highlights matches)
 *   - "View Cases" per drawer opens a modal with its own case search bar
 *   - No add / rename / delete — strictly read-only
 */
class PersonnelInventory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._cabinets         = [];
    this._drawersByCabinet = {};
    this._casesByDrawer    = {};
    this._searchTerm       = "";
    this._modalCases       = [];
  }

  connectedCallback() {
    this._render();
    this._loadAll();

    // Reload whenever a case is added or edited elsewhere (e.g. caseManage.js)
    this._onCasesChanged = () => this._loadAll();
    window.addEventListener("cases-changed", this._onCasesChanged);
  }

  disconnectedCallback() {
    window.removeEventListener("cases-changed", this._onCasesChanged);
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  async _loadAll() {
    const grid = this.shadowRoot.getElementById("cabinetGrid");
    if (grid) grid.innerHTML = `<p class="empty-msg">Loading...</p>`;

    try {
      const cabSnap = await getDocs(collection(db, "cabinet"));
      this._cabinets = [];
      cabSnap.forEach(d => this._cabinets.push({ id: d.id, data: d.data() }));
      this._cabinets.sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""));

      this._drawersByCabinet = {};
      await Promise.all(this._cabinets.map(async ({ id: cabId }) => {
        const snap = await getDocs(collection(db, "cabinet", cabId, "drawers"));
        this._drawersByCabinet[cabId] = [];
        snap.forEach(d => this._drawersByCabinet[cabId].push({ id: d.id, data: d.data() }));
      }));

      const caseSnap = await getDocs(collection(db, "cases"));
      this._casesByDrawer = {};
      caseSnap.forEach(d => {
        const did = d.data().drawerId;
        if (did) {
          if (!this._casesByDrawer[did]) this._casesByDrawer[did] = [];
          this._casesByDrawer[did].push({ id: d.id, data: d.data() });
        }
      });
    } catch (err) {
      console.error("Inventory load error:", err);
    }

    this._renderCabinets();
  }

  // ── Cabinet render ────────────────────────────────────────────────────────

  _renderCabinets() {
    const grid = this.shadowRoot.getElementById("cabinetGrid");
    if (!grid) return;

    const term = this._searchTerm.toLowerCase().trim();

    // Keep cabinet if its name matches OR any drawer label matches
    const filtered = this._cabinets.filter(({ id: cabId, data: cab }) => {
      if (!term) return true;
      if ((cab.name || "").toLowerCase().includes(term)) return true;
      return (this._drawersByCabinet[cabId] || []).some(({ data: d }) =>
        (d.label || `Drawer ${d.drawerNo}`).toLowerCase().includes(term)
      );
    });

    // Result count hint
    const countEl = this.shadowRoot.getElementById("searchResultCount");
    if (countEl) {
      countEl.textContent = term
        ? `${filtered.length} of ${this._cabinets.length} cabinet${this._cabinets.length !== 1 ? "s" : ""} match`
        : "";
    }

    if (!filtered.length) {
      grid.innerHTML = term
        ? `<p class="empty-msg">No cabinets or drawers match "<strong>${this._esc(term)}</strong>".</p>`
        : `<p class="empty-msg">No cabinets available.</p>`;
      return;
    }

    grid.innerHTML = "";

    filtered.forEach(({ id: cabId, data: cab }) => {
      const allDrawers = (this._drawersByCabinet[cabId] || [])
        .slice().sort((a, b) => a.data.drawerNo - b.data.drawerNo);

      // When searching, show only matching drawers unless the cabinet name itself matched
      const cabNameMatches = !term || (cab.name || "").toLowerCase().includes(term);
      const visibleDrawers = cabNameMatches
        ? allDrawers
        : allDrawers.filter(({ data: d }) =>
            (d.label || `Drawer ${d.drawerNo}`).toLowerCase().includes(term)
          );

      const totalCases = allDrawers.reduce((s, d) => s + (this._casesByDrawer[d.id]?.length || 0), 0);

      const card = document.createElement("div");
      card.className = "cabinet-card";
      card.innerHTML = `
        <div class="cabinet-header">
          <span class="cab-icon">🗄️</span>
          <div class="cab-title-wrap">
            <span class="cab-name">${this._highlight(cab.name, term)}</span>
            <span class="cab-meta">${allDrawers.length} drawers · ${totalCases} cases total</span>
          </div>
        </div>
        <div class="drawers-list">
          ${visibleDrawers.map(({ id: dId, data: d }) => {
            const count    = this._casesByDrawer[dId]?.length || 0;
            const pct      = Math.min(100, Math.round((count / 100) * 100));
            const full     = count >= 100;
            const barColor = full ? "#dc3545" : pct > 75 ? "#fd7e14" : "#0c6d38";
            const label    = d.label || `Drawer ${d.drawerNo}`;
            return `
              <div class="drawer-row">
                <div class="drawer-top">
                  <span class="drawer-label">${this._highlight(label, term)}</span>
                  <span class="drawer-count ${full ? "full" : ""}">${count}/100${full ? " 🔴 Full" : ""}</span>
                </div>
                <div class="bar-wrap">
                  <div class="bar" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <div class="drawer-actions">
                  <button class="text-btn view-btn"
                    data-drawer-id="${dId}"
                    data-drawer-label="${this._esc(label)}"
                    data-cabinet-name="${this._esc(cab.name)}">👁 View Cases</button>
                </div>
              </div>`;
          }).join("")}
        </div>`;

      card.querySelectorAll(".view-btn").forEach(btn => {
        btn.onclick = () => this._openDrawerModal(
          btn.dataset.drawerId,
          btn.dataset.drawerLabel,
          btn.dataset.cabinetName,
          this._casesByDrawer[btn.dataset.drawerId] || []
        );
      });

      grid.appendChild(card);
    });
  }

  // ── Drawer cases modal ────────────────────────────────────────────────────

  _openDrawerModal(drawerId, drawerLabel, cabinetName, cases) {
    const modal       = this.shadowRoot.getElementById("drawerModal");
    const title       = this.shadowRoot.getElementById("drawerModalTitle");
    const searchWrap  = this.shadowRoot.getElementById("drawerSearchWrap");
    const searchInput = this.shadowRoot.getElementById("drawerCaseSearch");
    if (!modal) return;

    title.textContent = `${cabinetName} › ${drawerLabel}`;
    this._modalCases  = cases;

    // Reset search input
    if (searchInput) searchInput.value = "";
    if (searchWrap)  searchWrap.style.display = cases.length ? "flex" : "none";

    this._renderModalCases("");
    modal.style.display = "flex";

    // Re-wire input (clone to remove stale listeners)
    if (searchInput) {
      const fresh = searchInput.cloneNode(true);
      searchInput.parentNode.replaceChild(fresh, searchInput);
      fresh.addEventListener("input", e => this._renderModalCases(e.target.value));
      requestAnimationFrame(() => fresh.focus());
    }
  }

  _renderModalCases(term) {
    const body = this.shadowRoot.getElementById("drawerModalBody");
    if (!body) return;

    const t = (term || "").toLowerCase().trim();
    const filtered = t
      ? this._modalCases.filter(({ data: c }) =>
          (c.caseNo  || "").toLowerCase().includes(t) ||
          (c.nature  || "").toLowerCase().includes(t) ||
          (c.status  || "").toLowerCase().includes(t) ||
          this._fmtDate(c.dateFilled).toLowerCase().includes(t)
        )
      : this._modalCases;

    if (!filtered.length) {
      body.innerHTML = t
        ? `<p class="empty-msg" style="padding:16px 0">No cases match "<strong>${this._esc(t)}</strong>".</p>`
        : `<p class="empty-msg" style="padding:16px 0">No cases in this drawer.</p>`;
      return;
    }

    body.innerHTML = `
      <p class="modal-count">${filtered.length} case${filtered.length !== 1 ? "s" : ""}${t ? " found" : ""}</p>
      <table class="cases-table">
        <thead><tr>
          <th>#</th><th>Docket No</th><th>Nature of Case</th><th>Status</th><th>Date Filed</th>
        </tr></thead>
        <tbody>
          ${filtered.map(({ data: c }, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${this._highlight(c.caseNo || "-", t)}</td>
              <td>${this._highlight(c.nature || "-", t)}</td>
              <td><span class="badge ${c.status || ""}">${c.status || "-"}</span></td>
              <td>${this._fmtDate(c.dateFilled)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }

  _closeDrawerModal() {
    this.shadowRoot.getElementById("drawerModal").style.display = "none";
    this._modalCases = [];
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  _highlight(text, term) {
    const escaped = this._esc(text);
    if (!term) return escaped;
    const idx = escaped.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return escaped;
    return (
      escaped.slice(0, idx) +
      `<mark>${escaped.slice(idx, idx + term.length)}</mark>` +
      escaped.slice(idx + term.length)
    );
  }

  _fmtDate(s) {
    if (!s) return "-";
    const p = s.split("-");
    return p.length === 3 ? `${p[1]}/${p[2]}/${p[0]}` : s;
  }

  // ── Shadow DOM ────────────────────────────────────────────────────────────

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; padding:20px; background:#f4f6f9; font-family:"Segoe UI",Arial,sans-serif; }

        .card { background:#fff; border-radius:16px; padding:24px; box-shadow:0 8px 24px rgba(0,0,0,.08); }
        h2 { color:#0c6d38; margin:0 0 6px; font-size:22px; }
        .subtitle { font-size:13px; color:#888; margin:0 0 16px; }

        /* ── Cabinet search ── */
        .search-wrap { position:relative; margin-bottom:8px; }
        .search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:16px; color:#888; pointer-events:none; }
        .search-input {
          width:100%; padding:10px 36px 10px 38px; border-radius:10px;
          border:1px solid #ccc; font-size:14px; box-sizing:border-box;
          transition:border-color .2s, box-shadow .2s;
        }
        .search-input:focus { outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15); }
        .search-input::placeholder { color:#aaa; }
        .search-clear {
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          background:none; border:none; font-size:20px; color:#999; cursor:pointer;
          padding:2px 6px; border-radius:4px; display:none; line-height:1;
        }
        .search-clear.visible { display:block; }
        .search-clear:hover { color:#333; background:rgba(0,0,0,.05); }
        .search-result-count { font-size:12px; color:#888; margin-bottom:16px; min-height:16px; }

        /* ── Cabinet grid ── */
        #cabinetGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px; }
        .empty-msg { color:#888; font-size:14px; }

        .cabinet-card { border:2px solid #e0e0e0; border-radius:14px; overflow:hidden; transition:border-color .2s,box-shadow .2s; }
        .cabinet-card:hover { border-color:#0c6d38; box-shadow:0 6px 20px rgba(12,109,56,.12); }

        .cabinet-header { display:flex; align-items:center; gap:10px; padding:14px 16px; background:linear-gradient(135deg,#0c6d38,#0e7d42); color:white; }
        .cab-icon { font-size:22px; flex-shrink:0; }
        .cab-title-wrap { flex:1; min-width:0; }
        .cab-name { display:block; font-size:15px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cab-meta { font-size:12px; opacity:.8; }

        .drawers-list { padding:12px 14px; display:flex; flex-direction:column; gap:10px; }
        .drawer-row { background:#f9fafb; border:1px solid #eee; border-radius:10px; padding:10px 12px; }
        .drawer-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .drawer-label { font-size:13px; font-weight:600; color:#333; }
        .drawer-count { font-size:12px; color:#666; }
        .drawer-count.full { color:#dc3545; font-weight:700; }
        .bar-wrap { height:6px; background:#e9ecef; border-radius:3px; overflow:hidden; margin-bottom:8px; }
        .bar { height:100%; border-radius:3px; transition:width .3s; }
        .drawer-actions { display:flex; }
        .text-btn { background:#f0f9f4; color:#0c6d38; border:1px solid #a5d6a7; border-radius:6px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
        .text-btn:hover { background:#0c6d38; color:white; }

        /* ── Highlight ── */
        mark { background:#fff176; color:#333; border-radius:2px; padding:0 1px; font-style:normal; }

        /* ── Status badges ── */
        .badge { padding:3px 8px; border-radius:999px; font-size:11px; font-weight:600; }
        .Pending  { background:#fff3cd; color:#856404; }
        .Resolved { background:#d4edda; color:#155724; }
        .Closed   { background:#f8d7da; color:#721c24; }

        /* ── Drawer modal ── */
        .drawer-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1200; align-items:center; justify-content:center; }
        .drawer-modal-content {
          background:white; border-radius:16px; padding:24px;
          width:90%; max-width:720px; max-height:88vh; overflow-y:auto;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
          display:flex; flex-direction:column;
        }
        .drawer-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:12px; border-bottom:2px solid #eee; flex-shrink:0; }
        .drawer-modal-header h3 { margin:0; color:#0c6d38; font-size:18px; }
        .modal-close-btn { background:none; border:none; font-size:24px; cursor:pointer; color:#666; padding:4px 8px; border-radius:6px; transition:background .15s; line-height:1; }
        .modal-close-btn:hover { background:#f0f0f0; }

        /* Case search inside modal */
        .drawer-search-wrap { display:flex; align-items:center; position:relative; margin-bottom:12px; flex-shrink:0; }
        .drawer-search-icon { position:absolute; left:10px; font-size:15px; color:#888; pointer-events:none; }
        .drawer-search-input {
          width:100%; padding:9px 12px 9px 34px; border-radius:8px;
          border:1px solid #ccc; font-size:13px; box-sizing:border-box;
          transition:border-color .2s, box-shadow .2s;
        }
        .drawer-search-input:focus { outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15); }
        .drawer-search-input::placeholder { color:#aaa; }

        .modal-count { font-size:12px; color:#888; margin:0 0 8px; flex-shrink:0; }

        /* ── Cases table ── */
        .cases-table { width:100%; border-collapse:collapse; font-size:13px; }
        .cases-table th { background:#0c6d38; color:white; padding:10px 12px; text-align:left; font-weight:600; }
        .cases-table td { padding:9px 12px; border-bottom:1px solid #eee; }
        .cases-table tr:last-child td { border-bottom:none; }
        .cases-table tbody tr:hover td { background:#f0f9f4; }

        @media(max-width:600px) {
          #cabinetGrid { grid-template-columns:1fr; }
          .drawer-modal-content { width:96%; padding:16px; }
        }
        ${darkModeCSS}
      </style>

      <div class="card">
        <h2>🗄️ Inventory</h2>
        <p class="subtitle">Browse physical cabinets and drawers. Contact an admin to make changes.</p>

        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            id="cabinetSearch"
            class="search-input"
            placeholder="Search cabinets or drawers..."
            autocomplete="off"
          />
          <button class="search-clear" id="cabinetSearchClear" aria-label="Clear search">×</button>
        </div>
        <div class="search-result-count" id="searchResultCount"></div>

        <div id="cabinetGrid"></div>
      </div>

      <!-- Drawer cases modal -->
      <div class="drawer-modal" id="drawerModal">
        <div class="drawer-modal-content">
          <div class="drawer-modal-header">
            <h3 id="drawerModalTitle">Drawer Cases</h3>
            <button class="modal-close-btn" id="drawerModalClose">&times;</button>
          </div>
          <div class="drawer-search-wrap" id="drawerSearchWrap" style="display:none;">
            <span class="drawer-search-icon">🔍</span>
            <input
              type="text"
              id="drawerCaseSearch"
              class="drawer-search-input"
              placeholder="Search by docket no, nature, status, date..."
              autocomplete="off"
            />
          </div>
          <div id="drawerModalBody"></div>
        </div>
      </div>
    `;

    // Cabinet search
    const cabSearch      = this.shadowRoot.getElementById("cabinetSearch");
    const cabSearchClear = this.shadowRoot.getElementById("cabinetSearchClear");

    cabSearch.addEventListener("input", e => {
      this._searchTerm = e.target.value;
      cabSearchClear.classList.toggle("visible", !!e.target.value.trim());
      this._renderCabinets();
    });
    cabSearch.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        cabSearch.value = "";
        this._searchTerm = "";
        cabSearchClear.classList.remove("visible");
        this._renderCabinets();
      }
    });
    cabSearchClear.addEventListener("click", () => {
      cabSearch.value = "";
      this._searchTerm = "";
      cabSearchClear.classList.remove("visible");
      this._renderCabinets();
      cabSearch.focus();
    });

    // Drawer modal close
    this.shadowRoot.getElementById("drawerModalClose").addEventListener("click", () => this._closeDrawerModal());
    this.shadowRoot.getElementById("drawerModal").addEventListener("click", e => {
      if (e.target === this.shadowRoot.getElementById("drawerModal")) this._closeDrawerModal();
    });
  }
}

customElements.define("personnel-inventory", PersonnelInventory);
