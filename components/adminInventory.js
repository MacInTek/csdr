import { db, auth } from "../scripts/firebaseConfig.js";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { darkModeCSS } from "../scripts/darkMode.js";

/**
 * AdminInventory — manages physical file cabinets and drawers.
 *
 * Firestore structure (nested subcollection):
 *   cabinet/{cabinetId}                  ← cabinet document
 *   cabinet/{cabinetId}/drawers/{drawerId} ← drawer subcollection
 *   cases/{caseId}                       ← stores cabinetId, cabinetName, drawerId, drawerLabel
 *
 * Rules:
 *   - Each cabinet auto-gets 5 drawers on creation.
 *   - Each drawer holds at most 100 cases.
 *   - Admin can add / rename / delete cabinets and rename drawers.
 *   - Deleting a cabinet cascades to its drawers and unassigns affected cases.
 */
class AdminInventory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._cabinets = [];
    this._drawersByCabinet = {}; // { cabinetId: [{ id, data }] }
    this._casesByDrawer   = {}; // { drawerId: [{ id, data }] }
    this._renamingCabinetId = null;
    this._renamingCurrentName = "";
    this._drawerCapacity = 50; // default capacity per drawer (cases per drawer)
    this._drawerCount    = 5;  // default number of drawers per cabinet
    this._renamingDrawerId = null;
    this._renamingCabinetIdForDrawer = null;
    this._renamingCurrentDrawerLabel = "";
  }

  connectedCallback() {
    this._render();
    this._loadAll();
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _notify(msg) {
    const el    = this.shadowRoot.getElementById("notifyMsg");
    const modal = this.shadowRoot.getElementById("notifyModal");
    if (el) el.textContent = msg;
    if (modal) modal.style.display = "flex";
  }
  _hideNotify() { this.shadowRoot.getElementById("notifyModal").style.display = "none"; }

  _loading(msg = "Processing...") {
    const el    = this.shadowRoot.getElementById("loadingText");
    const modal = this.shadowRoot.getElementById("loadingModal");
    if (el) el.textContent = msg;
    if (modal) modal.style.display = "flex";
  }
  _hideLoading() { this.shadowRoot.getElementById("loadingModal").style.display = "none"; }

  // ── Data ──────────────────────────────────────────────────────────────────

  async _loadAll() {
    const grid = this.shadowRoot.getElementById("cabinetGrid");
    if (grid) grid.innerHTML = `<p class="empty-msg">Loading...</p>`;

    try {
      // 1. Load all cabinets
      const cabSnap = await getDocs(collection(db, "cabinet"));
      this._cabinets = [];
      cabSnap.forEach(d => this._cabinets.push({ id: d.id, data: d.data() }));
      this._cabinets.sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""));

      // 2. Load drawers for each cabinet (subcollection)
      this._drawersByCabinet = {};
      await Promise.all(this._cabinets.map(async ({ id: cabId }) => {
        const snap = await getDocs(collection(db, "cabinet", cabId, "drawers"));
        this._drawersByCabinet[cabId] = [];
        snap.forEach(d => this._drawersByCabinet[cabId].push({ id: d.id, data: d.data() }));
      }));

      // 3. Load cases and group by drawerId
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

  // ── Cabinet CRUD ──────────────────────────────────────────────────────────

  async _addCabinet() {
    const input = this.shadowRoot.getElementById("cabinetNameInput");
    const name  = (input?.value || "").trim();
    if (!name) { this._notify("Please enter a cabinet name."); return; }

    const dup = this._cabinets.some(c => (c.data.name || "").toLowerCase() === name.toLowerCase());
    if (dup) { this._notify(`Cabinet "${name}" already exists.`); return; }

    this._loading("Creating cabinet...");
    try {
      // Create cabinet document
      const cabRef = await addDoc(collection(db, "cabinet"), {
        name,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || "",
      });

      // Create drawers as subcollection documents (count set by admin)
      await Promise.all(
        Array.from({ length: this._drawerCount }, (_, i) =>
          addDoc(collection(db, "cabinet", cabRef.id, "drawers"), {
            drawerNo: i + 1,
            label: `Drawer ${i + 1}`,
            capacity: this._drawerCapacity,
            createdAt: serverTimestamp(),
          })
        )
      );

      if (input) input.value = "";
      await this._loadAll();
      this._notify(`Cabinet "${name}" added with ${this._drawerCount} drawer${this._drawerCount !== 1 ? "s" : ""}.`);
    } catch (err) {
      this._notify("Failed: " + err.message);
    }
    this._hideLoading();
  }

  async _renameCabinet(cabId, currentName) {
    this._openRenameModal(cabId, currentName);
  }

  _openRenameModal(cabId, currentName) {
    this._renamingCabinetId = cabId;
    this._renamingCurrentName = currentName;
    const modal = this.shadowRoot.getElementById("renameModal");
    const input = this.shadowRoot.getElementById("renameInput");
    const title = this.shadowRoot.getElementById("renameModalTitle");
    if (title) title.textContent = `Rename Cabinet: ${currentName}`;
    if (input) input.value = currentName;
    if (modal) modal.style.display = "flex";
    input?.focus();
  }

  _closeRenameModal() {
    this._renamingCabinetId = null;
    this._renamingCurrentName = "";
    const modal = this.shadowRoot.getElementById("renameModal");
    if (modal) modal.style.display = "none";
  }

  async _saveRename() {
    const input = this.shadowRoot.getElementById("renameInput");
    if (!input || !this._renamingCabinetId) return;

    const newName = input.value.trim();
    if (!newName || newName === this._renamingCurrentName) {
      this._closeRenameModal();
      return;
    }

    const dup = this._cabinets.some(c => c.id !== this._renamingCabinetId && (c.data.name || "").toLowerCase() === newName.toLowerCase());
    if (dup) {
      this._notify(`"${newName}" already exists.`);
      return;
    }

    this._loading("Renaming...");
    try {
      await updateDoc(doc(db, "cabinet", this._renamingCabinetId), { name: newName });
      await this._loadAll();
      this._notify(`Renamed to "${newName}".`);
      this._closeRenameModal();
    } catch (err) {
      this._notify("Failed: " + err.message);
    }
    this._hideLoading();
  }

  async _deleteCabinet(cabId, cabName) {
    if (!confirm(`Delete cabinet "${cabName}" and all its drawers?\n\nCases assigned to these drawers will be unassigned.`)) return;

    this._loading("Deleting...");
    try {
      const drawers = this._drawersByCabinet[cabId] || [];

      // Unassign cases that reference any drawer in this cabinet
      const affectedCases = drawers.flatMap(({ id: did }) => this._casesByDrawer[did] || []);
      await Promise.all(affectedCases.map(c =>
        updateDoc(doc(db, "cases", c.id), {
          cabinetId: "", cabinetName: "", drawerId: "", drawerLabel: "",
        })
      ));

      // Delete all drawer subcollection documents
      await Promise.all(drawers.map(({ id: did }) =>
        deleteDoc(doc(db, "cabinet", cabId, "drawers", did))
      ));

      // Delete the cabinet document itself
      await deleteDoc(doc(db, "cabinet", cabId));

      await this._loadAll();
      this._notify(`Cabinet "${cabName}" deleted.`);
    } catch (err) { this._notify("Failed: " + err.message); }
    this._hideLoading();
  }

  _renameDrawer(cabId, drawerId, currentLabel) {
    this._openDrawerRenameModal(cabId, drawerId, currentLabel);
  }

  _openDrawerRenameModal(cabId, drawerId, currentLabel) {
    this._renamingDrawerId = drawerId;
    this._renamingCabinetIdForDrawer = cabId;
    this._renamingCurrentDrawerLabel = currentLabel;
    const modal = this.shadowRoot.getElementById("drawerRenameModal");
    const input = this.shadowRoot.getElementById("drawerRenameInput");
    const title = this.shadowRoot.getElementById("drawerRenameModalTitle");
    if (title) title.textContent = `Rename Drawer: ${currentLabel}`;
    if (input) input.value = currentLabel;
    if (modal) modal.style.display = "flex";
    input?.focus();
  }

  _closeDrawerRenameModal() {
    this._renamingDrawerId = null;
    this._renamingCabinetIdForDrawer = null;
    this._renamingCurrentDrawerLabel = "";
    const modal = this.shadowRoot.getElementById("drawerRenameModal");
    if (modal) modal.style.display = "none";
  }

  async _saveDrawerRename() {
    const input = this.shadowRoot.getElementById("drawerRenameInput");
    if (!input || !this._renamingDrawerId || !this._renamingCabinetIdForDrawer) return;

    const newLabel = input.value.trim();
    if (!newLabel || newLabel === this._renamingCurrentDrawerLabel) {
      this._closeDrawerRenameModal();
      return;
    }

    this._loading("Renaming drawer...");
    try {
      await updateDoc(doc(db, "cabinet", this._renamingCabinetIdForDrawer, "drawers", this._renamingDrawerId), { label: newLabel });
      await this._loadAll();
      this._notify(`Drawer renamed to "${newLabel}".`);
      this._closeDrawerRenameModal();
    } catch (err) {
      this._notify("Failed: " + err.message);
    }
    this._hideLoading();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  _renderCabinets() {
    const grid = this.shadowRoot.getElementById("cabinetGrid");
    if (!grid) return;

    if (!this._cabinets.length) {
      grid.innerHTML = `<p class="empty-msg">No cabinets yet. Add one above.</p>`;
      return;
    }

    grid.innerHTML = "";

    this._cabinets.forEach(({ id: cabId, data: cab }) => {
      const drawers    = (this._drawersByCabinet[cabId] || []).slice().sort((a, b) => a.data.drawerNo - b.data.drawerNo);
      const totalCases = drawers.reduce((s, d) => s + (this._casesByDrawer[d.id]?.length || 0), 0);

      const card = document.createElement("div");
      card.className = "cabinet-card";
      card.innerHTML = `
        <div class="cabinet-header">
          <span class="cab-icon">🗄️</span>
          <div class="cab-title-wrap">
            <span class="cab-name">${this._esc(cab.name)}</span>
            <span class="cab-meta">${drawers.length} drawers · ${totalCases} cases total</span>
          </div>
          <div class="cab-actions">
            <button class="icon-btn rename-cab" title="Rename cabinet">✏️</button>
            <button class="icon-btn delete-cab" title="Delete cabinet">🗑️</button>
          </div>
        </div>
        <div class="drawers-list">
          ${drawers.map(({ id: dId, data: d }) => {
            const cap      = d.capacity || 50;  // use stored capacity; fall back to 50, not the UI setting
            const count    = this._casesByDrawer[dId]?.length || 0;
            const pct      = Math.min(100, Math.round((count / cap) * 100));
            const full     = count >= cap;
            const barColor = full ? "#dc3545" : pct > 75 ? "#fd7e14" : "#0c6d38";
            const label    = d.label || `Drawer ${d.drawerNo}`;
            return `
              <div class="drawer-row">
                <div class="drawer-top">
                  <span class="drawer-label">${this._esc(label)}</span>
                  <span class="drawer-count ${full ? "full" : ""}">${count}/${cap}${full ? " 🔴 Full" : ""}</span>
                </div>
                <div class="bar-wrap"><div class="bar" style="width:${pct}%;background:${barColor}"></div></div>
                <div class="drawer-actions">
                  <button class="text-btn view-btn"
                    data-cab-id="${cabId}"
                    data-drawer-id="${dId}"
                    data-drawer-label="${this._esc(label)}"
                    data-cabinet-name="${this._esc(cab.name)}">👁 View Cases</button>
                  <button class="text-btn rename-btn"
                    data-cab-id="${cabId}"
                    data-drawer-id="${dId}"
                    data-drawer-label="${this._esc(label)}">✏️ Rename</button>
                </div>
              </div>`;
          }).join("")}
        </div>`;

      card.querySelector(".rename-cab").onclick = () => this._renameCabinet(cabId, cab.name);
      card.querySelector(".delete-cab").onclick  = () => this._deleteCabinet(cabId, cab.name);
      card.querySelectorAll(".view-btn").forEach(btn => {
        btn.onclick = () => this._openDrawerModal(
          btn.dataset.drawerId,
          btn.dataset.drawerLabel,
          btn.dataset.cabinetName,
          this._casesByDrawer[btn.dataset.drawerId] || []
        );
      });
      card.querySelectorAll(".rename-btn").forEach(btn => {
        btn.onclick = () => this._renameDrawer(btn.dataset.cabId, btn.dataset.drawerId, btn.dataset.drawerLabel);
      });

      grid.appendChild(card);
    });
  }

  // ── Drawer cases modal ────────────────────────────────────────────────────

  _openDrawerModal(drawerId, drawerLabel, cabinetName, cases) {
    const modal = this.shadowRoot.getElementById("drawerModal");
    const title = this.shadowRoot.getElementById("drawerModalTitle");
    const body  = this.shadowRoot.getElementById("drawerModalBody");
    if (!modal) return;

    title.textContent = `${cabinetName} › ${drawerLabel}`;
    body.innerHTML = cases.length
      ? `<div style="overflow-x:auto;">
         <table class="cases-table">
           <thead><tr><th>#</th><th>Case No</th><th>Nature of Case</th><th>Status</th><th>Date Filed</th></tr></thead>
           <tbody>
             ${cases.map(({ data: c }, i) => `
               <tr>
                 <td>${i + 1}</td>
                 <td>${this._esc(c.caseNo || "-")}</td>
                 <td>${this._esc(c.nature || "-")}</td>
                 <td><span class="badge ${c.status || ""}">${c.status || "-"}</span></td>
                 <td>${this._fmtDate(c.dateFilled)}</td>
               </tr>`).join("")}
           </tbody>
         </table>
         </div>`
      : `<p class="empty-msg" style="padding:16px 0">No cases in this drawer.</p>`;

    modal.style.display = "flex";
  }

  _closeDrawerModal() {
    this.shadowRoot.getElementById("drawerModal").style.display = "none";
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
        .subtitle { font-size:13px; color:#888; margin:0 0 20px; }

        .add-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }
        .add-row input {
          flex:1; min-width:200px; padding:10px 14px; border-radius:8px;
          border:1px solid #ccc; font-size:14px; transition:border-color .2s,box-shadow .2s;
        }
        .add-row input:focus { outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15); }
        .add-row button {
          padding:10px 22px; background:#0c6d38; color:white; border:none;
          border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;
          white-space:nowrap; transition:all .2s;
        }
        .add-row button:hover { background:#095a2e; transform:translateY(-1px); box-shadow:0 4px 10px rgba(12,109,56,.25); }
        .hint { font-size:12px; color:#888; margin-bottom:20px; }

        /* ── Drawer capacity setting ── */
        .capacity-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 16px;
          background: #f0f9f4;
          border: 1.5px solid #a5d6a7;
          border-radius: 10px;
          margin-bottom: 18px;
        }
        .capacity-label { font-size:13px; font-weight:600; color:#333; white-space:nowrap; }
        .capacity-controls { display:flex; align-items:center; gap:8px; }
        .capacity-input {
          width: 80px;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1.5px solid #ccc;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          transition: border-color .2s, box-shadow .2s;
        }
        .capacity-input:focus { outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15); }
        .cap-btn {
          padding: 7px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          white-space: nowrap;
        }
        .save-cap-btn { background:#0c6d38; color:white; }
        .save-cap-btn:hover { background:#095a2e; transform:translateY(-1px); }
        .reset-cap-btn { background:#e9ecef; color:#555; }
        .reset-cap-btn:hover { background:#dee2e6; color:#333; }
        .capacity-hint { font-size:12px; color:#888; }

        #cabinetGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:20px; }
        .empty-msg { color:#888; font-size:14px; }

        .cabinet-card { border:2px solid #e0e0e0; border-radius:14px; overflow:hidden; transition:border-color .2s,box-shadow .2s; }
        .cabinet-card:hover { border-color:#0c6d38; box-shadow:0 6px 20px rgba(12,109,56,.12); }

        .cabinet-header { display:flex; align-items:center; gap:10px; padding:14px 16px; background:linear-gradient(135deg,#0c6d38,#0e7d42); color:white; }
        .cab-icon { font-size:22px; flex-shrink:0; }
        .cab-title-wrap { flex:1; min-width:0; }
        .cab-name { display:block; font-size:15px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cab-meta { font-size:12px; opacity:.8; }
        .cab-actions { display:flex; gap:6px; flex-shrink:0; }
        .icon-btn { background:rgba(255,255,255,.15); border:none; border-radius:6px; padding:5px 8px; cursor:pointer; font-size:14px; color:white; transition:background .15s; }
        .icon-btn:hover { background:rgba(255,255,255,.3); }

        .drawers-list { padding:12px 14px; display:flex; flex-direction:column; gap:10px; }
        .drawer-row { background:#f9fafb; border:1px solid #eee; border-radius:10px; padding:10px 12px; }
        .drawer-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .drawer-label { font-size:13px; font-weight:600; color:#333; }
        .drawer-count { font-size:12px; color:#666; }
        .drawer-count.full { color:#dc3545; font-weight:700; }
        .bar-wrap { height:6px; background:#e9ecef; border-radius:3px; overflow:hidden; margin-bottom:8px; }
        .bar { height:100%; border-radius:3px; transition:width .3s; }
        .drawer-actions { display:flex; gap:8px; }
        .text-btn { background:#f0f9f4; color:#0c6d38; border:1px solid #a5d6a7; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s; }
        .text-btn:hover { background:#0c6d38; color:white; }

        .badge { padding:3px 8px; border-radius:999px; font-size:11px; font-weight:600; }
        .Pending  { background:#fff3cd; color:#856404; }
        .Resolved { background:#d4edda; color:#155724; }
        .Closed   { background:#f8d7da; color:#721c24; }

        .drawer-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1200; align-items:center; justify-content:center; }
        .drawer-modal-content { background:white; border-radius:16px; padding:24px; width:90%; max-width:720px; max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .drawer-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #eee; }
        .drawer-modal-header h3 { margin:0; color:#0c6d38; font-size:18px; }
        .modal-close-btn { background:none; border:none; font-size:24px; cursor:pointer; color:#666; padding:4px 8px; border-radius:6px; transition:background .15s; line-height:1; }
        .modal-close-btn:hover { background:#f0f0f0; }

        .rename-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1300; align-items:center; justify-content:center; }
        .rename-modal-content { background:white; border-radius:16px; padding:24px; width:90%; max-width:400px; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .rename-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #eee; }
        .rename-modal-header h3 { margin:0; color:#0c6d38; font-size:18px; }
        .rename-modal-body { margin-bottom:18px; }
        .rename-modal-body label { display:block; font-weight:600; color:#333; margin-bottom:6px; }
        .rename-modal-body input { width:100%; padding:10px 14px; border-radius:8px; border:1px solid #ccc; font-size:14px; transition:border-color .2s,box-shadow .2s; }
        .rename-modal-body input:focus { outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15); }
        .rename-modal-actions { display:flex; justify-content:flex-end; gap:10px; }
        .save-btn, .cancel-btn {
          padding: 10px 14px;
          border-radius: 12px;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }
        .save-btn {
          background: #0c6d38;
          color: #fff;
        }
        .cancel-btn {
          background: #f2f5f2;
          color: #333;
        }

        .drawer-rename-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1300; align-items:center; justify-content:center; }
        .drawer-rename-modal-content { background:white; border-radius:16px; padding:24px; width:90%; max-width:400px; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .drawer-rename-modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #eee; }
        .drawer-rename-modal-header h3 { margin:0; color:#0c6d38; font-size:18px; }
        .drawer-rename-modal-body { margin-bottom:18px; }
        .drawer-rename-modal-body label { display:block; font-weight:600; color:#333; margin-bottom:6px; }
        .drawer-rename-modal-body input { width:100%; padding:10px 14px; border-radius:8px; border:1px solid #ccc; font-size:14px; transition:border-color .2s,box-shadow .2s; }
        .drawer-rename-modal-body input:focus { outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15); }
        .drawer-rename-modal-actions { display:flex; justify-content:flex-end; gap:10px; }

        .cases-table { width:100%; border-collapse:collapse; font-size:13px; }
        .cases-table th { background:#0c6d38; color:white; padding:10px 12px; text-align:left; font-weight:600; }
        .cases-table td { padding:9px 12px; border-bottom:1px solid #eee; }
        .cases-table tr:last-child td { border-bottom:none; }
        .cases-table tbody tr:hover td { background:#f0f9f4; }

        .notify-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.3); z-index:1400; align-items:center; justify-content:center; }
        .notify-box { background:white; padding:20px 24px; border-radius:12px; box-shadow:0 14px 50px rgba(0,0,0,.18); min-width:260px; max-width:92%; text-align:center; border-left:6px solid #0c6d38; }
        .notify-box p { font-weight:600; color:#0f172a; margin:0 0 14px; font-size:14px; }
        .notify-ok { background:#0c6d38; color:white; border:none; border-radius:8px; padding:8px 22px; font-size:14px; font-weight:600; cursor:pointer; }
        .notify-ok:hover { background:#095a2e; }

        .loading-modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1500; align-items:center; justify-content:center; }
        .loading-box { background:white; padding:18px 24px; border-radius:12px; box-shadow:0 14px 50px rgba(0,0,0,.18); display:flex; gap:14px; align-items:center; }
        .spinner { width:32px; height:32px; border-radius:50%; border:4px solid #eee; border-top-color:#0c6d38; animation:spin 1s linear infinite; flex-shrink:0; }
        .loading-text { font-weight:600; color:#0f172a; font-size:14px; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── Global box-sizing fix ── */
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Prevent host from overflowing viewport ── */
        :host { overflow-x: hidden; }

        /* ── Drawer modal table: scrollable on small screens ── */
        #drawerModalBody { overflow-x: auto; }
        .cases-table { min-width: 420px; }

        /* ── Modal inputs: full-width safe ── */
        .rename-modal-body input,
        .drawer-rename-modal-body input { box-sizing: border-box; width: 100%; }

        /* ── Capacity row: stack on small screens ── */
        @media(max-width:640px) {
          :host { padding: 12px; }

          .card { padding: 16px; }

          h2 { font-size: 18px; }

          /* Capacity rows stack vertically */
          .capacity-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            padding: 12px;
          }
          .capacity-label { white-space: normal; }
          .capacity-controls { width: 100%; flex-wrap: wrap; }
          .capacity-input { flex: 1; min-width: 60px; width: auto; }
          .cap-btn { flex: 1; text-align: center; }
          .capacity-hint { width: 100%; }

          /* Add cabinet row */
          .add-row { flex-direction: column; }
          .add-row input, .add-row button { width: 100%; min-width: 0; }

          /* Cabinet grid: single column */
          #cabinetGrid { grid-template-columns: 1fr; }

          /* Cabinet header: prevent name overflow */
          .cab-name { white-space: normal; word-break: break-word; }

          /* Drawer actions: wrap buttons */
          .drawer-actions { flex-wrap: wrap; }
          .text-btn { flex: 1; text-align: center; min-width: 100px; }

          /* Drawer top: allow count to wrap below label */
          .drawer-top { flex-wrap: wrap; gap: 4px; }
          .drawer-count { width: 100%; }

          /* Modals: full-width on mobile */
          .drawer-modal-content,
          .rename-modal-content,
          .drawer-rename-modal-content {
            width: 96%;
            padding: 16px;
            max-height: 92vh;
          }
          .drawer-modal-header h3,
          .rename-modal-header h3,
          .drawer-rename-modal-header h3 {
            font-size: 15px;
            word-break: break-word;
          }

          /* Modal action buttons: full width */
          .rename-modal-actions,
          .drawer-rename-modal-actions {
            flex-direction: column-reverse;
            gap: 8px;
          }
          .save-btn, .cancel-btn { width: 100%; padding: 12px; text-align: center; }
        }
        ${darkModeCSS}
      </style>

      <div class="card">
        <h2>🗄️ Inventory Management</h2>
        <p class="subtitle">Configure settings below, then add a cabinet.</p>

        <!-- Drawer count setting -->
        <div class="capacity-row">
          <span class="capacity-label">🗂️ Drawers per cabinet:</span>
          <div class="capacity-controls">
            <input
              type="number"
              id="drawerCountInput"
              class="capacity-input"
              value="5"
              min="1"
              max="20"
              step="1"
            />
            <button class="cap-btn save-cap-btn" id="saveDrawerCountBtn" title="Apply">✔ Apply</button>
            <button class="cap-btn reset-cap-btn" id="resetDrawerCountBtn" title="Reset to default (5)">↺ Reset</button>
          </div>
          <span class="capacity-hint" id="drawerCountHint">Default: 5 drawers per cabinet</span>
        </div>

        <!-- Cases per drawer setting -->
        <div class="capacity-row">
          <span class="capacity-label">📦 Cases per drawer:</span>
          <div class="capacity-controls">
            <input
              type="number"
              id="drawerCapacityInput"
              class="capacity-input"
              value="50"
              min="1"
              max="500"
              step="1"
            />
            <button class="cap-btn save-cap-btn" id="saveDrawerCapacityBtn" title="Apply">✔ Apply</button>
            <button class="cap-btn reset-cap-btn" id="resetDrawerCapacityBtn" title="Reset to default (50)">↺ Reset</button>
          </div>
          <span class="capacity-hint" id="drawerCapacityHint">Default: 50 cases per drawer</span>
        </div>

        <div class="add-row">
          <input id="cabinetNameInput" placeholder="New cabinet name (e.g. Cabinet A)" maxlength="80" />
          <button id="addCabinetBtn">+ Add Cabinet</button>
        </div>
        <p class="hint">New drawers will be created with the settings above.</p>
        <div id="cabinetGrid"></div>
      </div>

      <div class="drawer-modal" id="drawerModal">
        <div class="drawer-modal-content">
          <div class="drawer-modal-header">
            <h3 id="drawerModalTitle">Drawer Cases</h3>
            <button class="modal-close-btn" id="drawerModalClose">&times;</button>
          </div>
          <div id="drawerModalBody"></div>
        </div>
      </div>

      <div class="rename-modal" id="renameModal">
        <div class="rename-modal-content">
          <div class="rename-modal-header">
            <h3 id="renameModalTitle">Rename Cabinet</h3>
            <button class="modal-close-btn" id="renameModalClose">&times;</button>
          </div>
          <div class="rename-modal-body">
            <label for="renameInput">New Cabinet Name</label>
            <input type="text" id="renameInput" placeholder="Enter new name" maxlength="80" />
          </div>
          <div class="rename-modal-actions">
            <button class="cancel-btn" id="cancelRenameBtn" type="button">Cancel</button>
            <button class="save-btn" id="saveRenameBtn" type="button">Save</button>
          </div>
        </div>
      </div>

      <div class="drawer-rename-modal" id="drawerRenameModal">
        <div class="drawer-rename-modal-content">
          <div class="drawer-rename-modal-header">
            <h3 id="drawerRenameModalTitle">Rename Drawer</h3>
            <button class="modal-close-btn" id="drawerRenameModalClose">&times;</button>
          </div>
          <div class="drawer-rename-modal-body">
            <label for="drawerRenameInput">New Drawer Name</label>
            <input type="text" id="drawerRenameInput" placeholder="Enter new name" maxlength="80" />
          </div>
          <div class="drawer-rename-modal-actions">
            <button class="cancel-btn" id="cancelDrawerRenameBtn" type="button">Cancel</button>
            <button class="save-btn" id="saveDrawerRenameBtn" type="button">Save</button>
          </div>
        </div>
      </div>

      <div class="notify-modal" id="notifyModal">
        <div class="notify-box">
          <p id="notifyMsg">Done</p>
          <button class="notify-ok" id="notifyOk">OK</button>
        </div>
      </div>

      <div class="loading-modal" id="loadingModal">
        <div class="loading-box">
          <div class="spinner"></div>
          <span class="loading-text" id="loadingText">Processing...</span>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("addCabinetBtn").addEventListener("click", () => this._addCabinet());
    this.shadowRoot.getElementById("cabinetNameInput").addEventListener("keydown", e => {
      if (e.key === "Enter") this._addCabinet();
    });

    // Drawer count controls
    const drawerCountInput   = this.shadowRoot.getElementById("drawerCountInput");
    const drawerCountHint    = this.shadowRoot.getElementById("drawerCountHint");
    const saveDrawerCountBtn = this.shadowRoot.getElementById("saveDrawerCountBtn");
    const resetDrawerCountBtn= this.shadowRoot.getElementById("resetDrawerCountBtn");

    const applyDrawerCount = () => {
      const val = parseInt(drawerCountInput.value, 10);
      if (!val || val < 1) {
        drawerCountInput.value = this._drawerCount;
        return;
      }
      this._drawerCount = val;
      drawerCountHint.textContent = val === 5
        ? "Default: 5 drawers per cabinet"
        : `Current: ${val} drawers per cabinet (default is 5)`;
      drawerCountHint.style.color = val === 5 ? "#888" : "#0c6d38";
    };

    saveDrawerCountBtn.addEventListener("click", applyDrawerCount);
    drawerCountInput.addEventListener("keydown", e => { if (e.key === "Enter") applyDrawerCount(); });
    resetDrawerCountBtn.addEventListener("click", () => {
      this._drawerCount = 5;
      drawerCountInput.value = 5;
      drawerCountHint.textContent = "Default: 5 drawers per cabinet";
      drawerCountHint.style.color = "#888";
    });

    // Cases per drawer controls
    const drawerCapInput      = this.shadowRoot.getElementById("drawerCapacityInput");
    const drawerCapHint       = this.shadowRoot.getElementById("drawerCapacityHint");
    const saveDrawerCapBtn    = this.shadowRoot.getElementById("saveDrawerCapacityBtn");
    const resetDrawerCapBtn   = this.shadowRoot.getElementById("resetDrawerCapacityBtn");

    const applyDrawerCapacity = () => {
      const val = parseInt(drawerCapInput.value, 10);
      if (!val || val < 1) {
        drawerCapInput.value = this._drawerCapacity;
        return;
      }
      this._drawerCapacity = val;
      drawerCapHint.textContent = val === 50
        ? "Default: 50 cases per drawer"
        : `Current: ${val} cases per drawer (default is 50)`;
      drawerCapHint.style.color = val === 50 ? "#888" : "#0c6d38";
    };

    saveDrawerCapBtn.addEventListener("click", applyDrawerCapacity);
    drawerCapInput.addEventListener("keydown", e => { if (e.key === "Enter") applyDrawerCapacity(); });
    resetDrawerCapBtn.addEventListener("click", () => {
      this._drawerCapacity = 50;
      drawerCapInput.value = 50;
      drawerCapHint.textContent = "Default: 50 cases per drawer";
      drawerCapHint.style.color = "#888";
    });
    this.shadowRoot.getElementById("drawerModalClose").addEventListener("click", () => this._closeDrawerModal());
    this.shadowRoot.getElementById("drawerModal").addEventListener("click", e => {
      if (e.target === this.shadowRoot.getElementById("drawerModal")) this._closeDrawerModal();
    });
    this.shadowRoot.getElementById("renameModalClose").addEventListener("click", () => this._closeRenameModal());
    this.shadowRoot.getElementById("renameModal").addEventListener("click", e => {
      if (e.target === this.shadowRoot.getElementById("renameModal")) this._closeRenameModal();
    });
    this.shadowRoot.getElementById("cancelRenameBtn").addEventListener("click", () => this._closeRenameModal());
    this.shadowRoot.getElementById("saveRenameBtn").addEventListener("click", () => this._saveRename());
    this.shadowRoot.getElementById("renameInput").addEventListener("keydown", e => {
      if (e.key === "Enter") this._saveRename();
    });
    this.shadowRoot.getElementById("drawerRenameModalClose").addEventListener("click", () => this._closeDrawerRenameModal());
    this.shadowRoot.getElementById("drawerRenameModal").addEventListener("click", e => {
      if (e.target === this.shadowRoot.getElementById("drawerRenameModal")) this._closeDrawerRenameModal();
    });
    this.shadowRoot.getElementById("cancelDrawerRenameBtn").addEventListener("click", () => this._closeDrawerRenameModal());
    this.shadowRoot.getElementById("saveDrawerRenameBtn").addEventListener("click", () => this._saveDrawerRename());
    this.shadowRoot.getElementById("drawerRenameInput").addEventListener("keydown", e => {
      if (e.key === "Enter") this._saveDrawerRename();
    });
    this.shadowRoot.getElementById("notifyOk").addEventListener("click", () => this._hideNotify());
  }
}

customElements.define("admin-inventory", AdminInventory);
