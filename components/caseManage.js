import { db, auth } from "../scripts/firebaseConfig.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  CLOUDINARY_UPLOAD_URL,
  CLOUDINARY_UPLOAD_PRESET
} from "../scripts/cloudinaryConfig.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class CaseManage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.pendingDeleteId = null;
    this._notificationTimer = null;
    this.allCases = []; // Store all cases for filtering
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.sortOrder = "newest"; // "newest", "oldest", "dateFilled-asc", "dateFilled-desc"
    this.searchColumn = "all"; // which column to search in
  }

  connectedCallback() {
    this.render();
    this.loadCases();
    this.loadCabinets();
    this.setupAutoStatus();
  }


  // ── Cabinet / Drawer helpers (nested subcollection structure) ────────────
  // Firestore path: cabinet/{cabId}/drawers/{drawerId}

  async loadCabinets() {
    try {
      const cabSnap = await getDocs(collection(db, "cabinet"));
      this._cabinets = [];
      const drawerFetches = [];

      cabSnap.forEach(cabDoc => {
        this._cabinets.push({ id: cabDoc.id, data: cabDoc.data() });
        drawerFetches.push(
          getDocs(collection(db, "cabinet", cabDoc.id, "drawers"))
            .then(snap => ({ cabId: cabDoc.id, snap }))
        );
      });

      this._cabinets.sort((a, b) => (a.data.name || "").localeCompare(b.data.name || ""));

      const drawerResults = await Promise.all(drawerFetches);
      this._drawersByCabinet = {};
      drawerResults.forEach(({ cabId, snap }) => {
        this._drawersByCabinet[cabId] = [];
        snap.forEach(d => this._drawersByCabinet[cabId].push({ id: d.id, data: d.data() }));
      });

      // Count cases per drawer from already-loaded allCases
      this._casesPerDrawer = {};
      this.allCases.forEach(({ data }) => {
        if (data.drawerId) {
          this._casesPerDrawer[data.drawerId] = (this._casesPerDrawer[data.drawerId] || 0) + 1;
        }
      });

      this._populateCabinetSelect();
    } catch (err) {
      console.error("Failed to load cabinets:", err);
    }
  }

  _populateCabinetSelect(selectId = "cabinetNo", drawerSelectId = "drawerNo") {
    const cabSelect = this.shadowRoot.getElementById(selectId);
    if (!cabSelect) return;

    const prev = cabSelect.value;
    cabSelect.innerHTML = `<option value="">— Select Cabinet —</option>`;
    (this._cabinets || []).forEach(({ id, data }) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = data.name || id;
      cabSelect.appendChild(opt);
    });
    if (prev) cabSelect.value = prev;

    if (!cabSelect._cabWired) {
      cabSelect._cabWired = true;
      cabSelect.addEventListener("change", () => this._populateDrawerSelect(selectId, drawerSelectId));
    }
  }

  _populateDrawerSelect(cabinetSelectId = "cabinetNo", drawerSelectId = "drawerNo") {
    const cabSelect    = this.shadowRoot.getElementById(cabinetSelectId);
    const drawerSelect = this.shadowRoot.getElementById(drawerSelectId);
    const hint         = this.shadowRoot.getElementById("drawerCapacityHint");
    if (!drawerSelect) return;

    const cabId = cabSelect?.value || "";
    drawerSelect.innerHTML = `<option value="">— Select Drawer —</option>`;
    drawerSelect.disabled = !cabId;
    if (hint) hint.style.display = "none";
    if (!cabId) return;

    const drawers = (this._drawersByCabinet || {})[cabId] || [];
    drawers.slice().sort((a, b) => a.data.drawerNo - b.data.drawerNo).forEach(({ id, data }) => {
      const count = (this._casesPerDrawer || {})[id] || 0;
      const cap   = data.capacity || 100;
      const full  = count >= cap;
      const opt   = document.createElement("option");
      opt.value   = id;
      opt.textContent = `${data.label || `Drawer ${data.drawerNo}`} (${count}/${cap})${full ? " — FULL" : ""}`;
      opt.disabled = full;
      drawerSelect.appendChild(opt);
    });

    if (!drawerSelect._drawerHintWired) {
      drawerSelect._drawerHintWired = true;
      drawerSelect.addEventListener("change", () => {
        if (!hint) return;
        const dId   = drawerSelect.value;
        const drw   = Object.values(this._drawersByCabinet || {}).flat().find(d => d.id === dId);
        const cap   = drw?.data?.capacity || 100;
        const count = dId ? ((this._casesPerDrawer || {})[dId] || 0) : null;
        if (dId && count !== null) {
          hint.textContent = `${count}/${cap} cases in this drawer.`;
          hint.style.display = "block";
          hint.style.color   = count >= cap ? "#b91c1c" : count >= cap * 0.75 ? "#92400e" : "#555";
        } else {
          hint.style.display = "none";
        }
      });
    }
  }

  _populateEditCabinetDrawer(selectedCabId, selectedDrawerId) {
    const cabSelect    = this.shadowRoot.getElementById("eCabinetNo");
    const drawerSelect = this.shadowRoot.getElementById("eDrawerNo");
    const hint         = this.shadowRoot.getElementById("eDrawerCapacityHint");
    if (!cabSelect) return;

    cabSelect.innerHTML = `<option value="">— Select Cabinet —</option>`;
    (this._cabinets || []).forEach(({ id, data }) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = data.name || id;
      if (id === selectedCabId) opt.selected = true;
      cabSelect.appendChild(opt);
    });

    const fillDrawers = (cabId) => {
      if (!drawerSelect) return;
      drawerSelect.innerHTML = `<option value="">— Select Drawer —</option>`;
      drawerSelect.disabled = !cabId;
      if (!cabId) return;

      const drawers = (this._drawersByCabinet || {})[cabId] || [];
      drawers.slice().sort((a, b) => a.data.drawerNo - b.data.drawerNo).forEach(({ id, data }) => {
        const count = (this._casesPerDrawer || {})[id] || 0;
        const cap   = data.capacity || 100;
        const full  = count >= cap && id !== selectedDrawerId;
        const opt   = document.createElement("option");
        opt.value   = id;
        opt.textContent = `${data.label || `Drawer ${data.drawerNo}`} (${count}/${cap})${full ? " — FULL" : ""}`;
        opt.disabled = full;
        if (id === selectedDrawerId) opt.selected = true;
        drawerSelect.appendChild(opt);
      });

      if (hint && selectedDrawerId) {
        const drw   = Object.values(this._drawersByCabinet || {}).flat().find(d => d.id === selectedDrawerId);
        const cap   = drw?.data?.capacity || 100;
        const count = (this._casesPerDrawer || {})[selectedDrawerId] || 0;
        hint.textContent = `${count}/${cap} cases in this drawer.`;
        hint.style.display = "block";
        hint.style.color   = count >= cap ? "#b91c1c" : count >= cap * 0.75 ? "#92400e" : "#555";
      }
    };

    fillDrawers(selectedCabId);

    cabSelect.addEventListener("change", () => {
      fillDrawers(cabSelect.value);
      if (hint) hint.style.display = "none";
    });
    if (drawerSelect) {
      drawerSelect.addEventListener("change", () => {
        if (!hint) return;
        const dId   = drawerSelect.value;
        const drw   = Object.values(this._drawersByCabinet || {}).flat().find(d => d.id === dId);
        const cap   = drw?.data?.capacity || 100;
        const count = dId ? ((this._casesPerDrawer || {})[dId] || 0) : null;
        if (dId && count !== null) {
          hint.textContent = `${count}/${cap} cases in this drawer.`;
          hint.style.display = "block";
          hint.style.color   = count >= cap ? "#b91c1c" : count >= cap * 0.75 ? "#92400e" : "#555";
        } else {
          hint.style.display = "none";
        }
      });
    }
  }

  setupAutoStatus() {
    const fieldIds = [
      "caseNo",
      "nature",
      "taxDec",
      "locationInput",
      "dateFilled",
      "dateOfAppeal",
      "dateDecided",
      "mrDateReceived",
      "mrDateResolution",
      "dateOfFinality"
    ];

    fieldIds.forEach(id => {
      const el = this.shadowRoot.getElementById(id);
      if (el) {
        el.addEventListener("input", () => {
          this.updateStatusLive();
        });
      }
    });

    // Initially disable winningParty and dateOfFinality fields
    const winningPartyField = this.shadowRoot.getElementById("winningParty");
    const dateOfFinalityField = this.shadowRoot.getElementById("dateOfFinality");
    
    if (winningPartyField) {
      winningPartyField.disabled = true;
      winningPartyField.style.opacity = "0.5";
      winningPartyField.style.cursor = "not-allowed";
    }
    
    if (dateOfFinalityField) {
      dateOfFinalityField.disabled = true;
      dateOfFinalityField.style.opacity = "0.5";
      dateOfFinalityField.style.cursor = "not-allowed";
    }

    // Trigger initial status check
    this.updateStatusLive();
  }


  determineStatus(data) {
    // Basic fields for Pending status
    const hasBasic =
      data.caseNo &&
      data.nature &&
      data.dateFilled &&
      data.dateOfAppeal;

    // Additional fields for Resolved status
    const hasResolved =
      hasBasic &&
      data.dateDecided &&
      data.mrDateReceived &&
      data.mrDateResolution;

    // Additional field for Closed status
    const hasClosed =
      hasResolved &&
      data.dateOfFinality;

    if (hasClosed) return "Closed";
    if (hasResolved) return "Resolved";
    
    // Default to Pending (even if not all basic fields are filled)
    return "Pending";
  }

  updateStatusLive() {
    const tempData = {
      caseNo: this.shadowRoot.getElementById("caseNo")?.value,
      nature: this.shadowRoot.getElementById("nature")?.value,
      taxDec: this.shadowRoot.getElementById("taxDec")?.value,
      location: this.shadowRoot.getElementById("locationInput")?.value,
      dateFilled: this.shadowRoot.getElementById("dateFilled")?.value,
      dateOfAppeal: this.shadowRoot.getElementById("dateOfAppeal")?.value,
      dateDecided: this.shadowRoot.getElementById("dateDecided")?.value,
      mrDateReceived: this.shadowRoot.getElementById("mrDateReceived")?.value,
      mrDateResolution: this.shadowRoot.getElementById("mrDateResolution")?.value,
      dateOfFinality: this.shadowRoot.getElementById("dateOfFinality")?.value,
    };

    const autoStatus = this.determineStatus(tempData);

    const statusSelect = this.shadowRoot.getElementById("status");
    if (statusSelect) {
      statusSelect.value = autoStatus;
    }

    // Enable/Disable fields based on status
    this._updateFieldsBasedOnStatus(autoStatus);
  }

  _updateFieldsBasedOnStatus(status) {
    const winningPartyField = this.shadowRoot.getElementById("winningParty");
    const dateOfFinalityField = this.shadowRoot.getElementById("dateOfFinality");

    // Disable fields if status is Pending
    // Enable fields if status is Resolved or Closed
    const shouldEnable = status === "Resolved" || status === "Closed";

    if (winningPartyField) {
      winningPartyField.disabled = !shouldEnable;
      winningPartyField.style.opacity = shouldEnable ? "1" : "0.5";
      winningPartyField.style.cursor = shouldEnable ? "text" : "not-allowed";
    }

    if (dateOfFinalityField) {
      dateOfFinalityField.disabled = !shouldEnable;
      dateOfFinalityField.style.opacity = shouldEnable ? "1" : "0.5";
      dateOfFinalityField.style.cursor = shouldEnable ? "text" : "not-allowed";
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
          background: #f4f6f9;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,.08);
        }

        h2 { color: #0c6d38; margin-bottom: 20px; }

        form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }

        .field { display:flex; flex-direction:column; gap:6px; }

        label { font-size:13px; font-weight:600; color:#444; }

        input, textarea, select {
          padding:10px 12px;
          border-radius:8px;
          border:1px solid #ccc;
          font-size:14px;
          transition: border-color .2s, box-shadow .2s;
        }

        input:focus, textarea:focus, select:focus {
          outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15);
        }

        textarea { resize: vertical; min-height:70px; max-height:150px; }

        select {
          appearance:none;
          background-image:
            linear-gradient(45deg, transparent 50%, #555 50%),
            linear-gradient(135deg, #555 50%, transparent 50%);
          background-position:
            calc(100% - 20px) calc(50% - 4px),
            calc(100% - 15px) calc(50% - 4px);
          background-size:5px 5px;
          background-repeat:no-repeat;
        }

        /* Parties Section */
        .parties-container {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .party-section {
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 16px;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          transition: all 0.3s ease;
        }

        .party-section:hover {
          border-color: #0c6d38;
          box-shadow: 0 4px 12px rgba(12,109,56,0.1);
          transform: translateY(-2px);
        }

        .party-section.active {
          border-color: #0c6d38;
          background: linear-gradient(180deg, #f0f9f4 0%, #ffffff 100%);
          box-shadow: 0 4px 16px rgba(12,109,56,0.15);
        }

        .party-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e8e8e8;
        }

        .party-header label {
          font-size: 14px;
          font-weight: 700;
          color: #0c6d38;
          margin: 0;
          flex: 1;
        }

        .party-icon {
          font-size: 18px;
        }

        .party-name-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 2px solid #ddd;
          font-size: 14px;
          transition: all 0.2s;
          margin-bottom: 12px;
        }

        .party-name-input:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 3px rgba(12,109,56,.1);
          background: #fff;
        }

        .party-roles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .role-checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          transition: all 0.2s;
          cursor: pointer;
        }

        .role-checkbox-group:hover {
          background: #f8f9fa;
          border-color: #0c6d38;
        }

        .role-checkbox-group input[type="radio"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #0c6d38;
          flex-shrink: 0;
        }

        .role-checkbox-group input[type="radio"]:checked + label {
          color: #0c6d38;
          font-weight: 600;
        }

        .role-checkbox-group label {
          font-size: 13px;
          font-weight: 500;
          color: #555;
          cursor: pointer;
          margin: 0;
          flex: 1;
          user-select: none;
        }

        .add-btn {
          background:#0c6d38;
          color:white;
          border:none;
          border-radius:10px;
          padding:12px;
          cursor:pointer;
          font-weight:600;
          grid-column:1 / -1;
        }


        .add-btn:hover { 
          // background:#095a2e;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transform: translateY(-3px);
          background: linear-gradient(180deg,#f8fff8,#eef9ef);
          color: #0c6d38;
          border: 1px solid #0c6d38;
          transition: 0.3s ease-in-out;
        }

        .table-wrapper { overflow-x:auto; }

        table { 
          width:100%; 
          min-width:990px; 
          border-collapse:separate; 
          border-spacing: 0;
          border-radius:12px; 
          overflow:hidden; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
          font-family: 'Gilroy-Bold', sans-serif;
          table-layout: fixed;
        }

        thead { background:#0c6d38; color:white; text-align:center; color: white;  font-size: 14px;  font-weight: 900; }

        th, td { 
          padding:12px; 
          // border-bottom:1px solid #eee; 
          borrder-top:1px solid #eee;
          font-size:14px; 
          text-align: left;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Set specific widths for columns to prevent overflow */
        th:nth-child(1), td:nth-child(1) { width: 120px; } /* Case No */
        th:nth-child(2), td:nth-child(2) { width: 200px; max-width: 200px; } /* Nature - fixed width */
        th:nth-child(3), td:nth-child(3) { width: 120px; } /* Tax Dec */
        th:nth-child(4), td:nth-child(4) { width: 150px; } /* Belonging Party */
        th:nth-child(5), td:nth-child(5) { width: 150px; } /* Opposing Party */
        th:nth-child(6), td:nth-child(6) { width: 120px; } /* Location */
        th:nth-child(7), td:nth-child(7) { width: 110px; } /* Date Filed */
        th:nth-child(8), td:nth-child(8) { width: 110px; } /* Date of Decision */
        th:nth-child(9), td:nth-child(9) { width: 110px; } /* MR Date Received */
        th:nth-child(10), td:nth-child(10) { width: 110px; } /* MR Date Resolution */
        th:nth-child(11), td:nth-child(11) { width: 110px; } /* Date of Appeal */
        th:nth-child(12), td:nth-child(12) { width: 110px; } /* Date of Finality */
        th:nth-child(13), td:nth-child(13) { width: 120px; } /* Winning Party */
        th:nth-child(14), td:nth-child(14) { width: 100px; } /* Status */
        th:nth-child(15), td:nth-child(15) { width: 130px; } /* Created By */
        th:nth-child(16), td:nth-child(16) { width: 130px; } /* Updated By */
        th:nth-child(17), td:nth-child(17) { width: 140px; text-align: center; } /* Actions */

        tbody tr { position: relative; }

        tbody tr td {
          // border-bottom: 1px solid #eee;
          border-top: 1px solid #eee;
        }

        tbody tr:hover { 
          background: rgba(12,109,56,.08); 
          cursor: pointer;
        }
        
        tbody tr:hover td { background: rgba(12,109,56,.08); }

        /* Tooltip styles */
        .row-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 1000;
          font-weight: 500;
        }

        .row-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.85);
        }

        tbody tr:hover .row-tooltip {
          opacity: 1;
        }

        .actions { 
          display:flex; 
          gap:6px; 
          justify-content: center; 
          align-items: center;  
          text-align: center; 
          height: 100%;
          min-height: 40px;
        }

        .edit-btn { background: #007BFF;}

        .actions button { color:white; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; transition: all 0.2s; }
        .actions button:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .loading,
        .empty {
          text-align: center;
          padding: 20px;
          color: #777;
          font-size: 14px;
        }

        /* STATUS BADGE */
        .status {
          padding:4px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:600;
          text-align:center;
          width:fit-content;
        }
        .Pending { background:#fff3cd; color:#856404; }
        .Resolved { background:#d4edda; color:#155724; }
        .Closed { background:#f8d7da; color:#721c24; }

        /* ================= MODAL ================= */
        .modal {
          display:none;
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.5);
          z-index:1000;
          align-items:center;
          justify-content:center;
        }
        .modal-content {
          background:white;
          border-radius:16px;
          padding:20px;
          width:90%;
          max-width:600px;
          max-height:90vh;
          overflow-y:auto;
        }
        .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .close { cursor:pointer; font-size:24px; padding:6px; border-radius:6px; transition: transform .12s ease, background .12s ease; }
        .close:hover { transform: scale(1.08); background: rgba(0,0,0,0.04); }
        .close:focus { outline: 3px solid rgba(12,109,56,0.12); }
        .close.cancel-btn {
          font-size: 14px;
          padding: 10px 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
          color: #495057;
          border: 1.5px solid #dee2e6;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .close.cancel-btn:hover {
          background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
          border-color: #adb5bd;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.12);
          color: #212529;
        }
        .close.cancel-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .close.cancel-btn:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 3px rgba(12,109,56,0.15);
        }

        .modal-body .field { margin-bottom:12px; }
        /* case number row */
        .case-input-row { display:flex; gap:8px; align-items:center; }
        .case-prefix { width:140px; max-width:40%; }
        .case-input { flex:1; }

        .save-btn {
          background: linear-gradient(180deg, #0c6d38 0%, #095a2e 100%);
          color:white;
          width:100%;
          padding:12px;
          border-radius:8px;
          border:none;
          cursor:pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(12,109,56,0.2);
        }
        .save-btn:hover {
          background: linear-gradient(180deg, #0e7d42 0%, #0c6d38 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(12,109,56,0.3);
        }
        .save-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 4px rgba(12,109,56,0.2);
        }
        .save-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(12,109,56,0.3);
        }

        /* Notification modal */
        .notify-modal {
          display:none;
          position:fixed;
          inset:0;
          background: rgba(0,0,0,0.3);
          z-index:1100;
          align-items:center;
          justify-content:center;
        }
        .notify-modal .notify-box {
          background: #fff;
          padding: 18px 20px;
          border-radius: 12px;
          box-shadow: 0 14px 50px rgba(2,6,23,0.18);
          min-width: 260px;
          max-width: 92%;
          text-align: center;
        }
        .notify-box.success { border-left: 6px solid #0c6d38; }
        .notify-box .msg { font-weight:600; color:#0f172a; margin-bottom:10px; }
        .notify-box .ok { background:#0c6d38; color:#fff; padding:8px 12px; border-radius:8px; border:none; cursor:pointer; }

        /* Loading modal */
        .loading-modal {
          display:none;
          position:fixed;
          inset:0;
          background: rgba(0,0,0,0.35);
          z-index:1150;
          align-items:center;
          justify-content:center;
        }
        .loading-box {
          background: #fff;
          padding: 18px 22px;
          border-radius: 12px;
          box-shadow: 0 14px 50px rgba(2,6,23,0.18);
          display:flex;
          gap:12px;
          align-items:center;
        }
        .spinner {
          width:36px;
          height:36px;
          border-radius:50%;
          border:4px solid #eee;
          border-top-color: var(--primary-green, #0c6d38);
          animation: spin 1s linear infinite;
        }
        

        /* Search bar styles */
        .search-container {
          margin-bottom: 20px;
          position: relative;
        }
        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          font-size: 18px;
          color: #666;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border-radius: 10px;
          border: 1px solid #ccc;
          font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .search-input:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 2px rgba(12,109,56,.15);
        }
        .search-input::placeholder {
          color: #999;
        }
        .search-help {
          margin-top: 8px;
          font-size: 12px;
          color: #555;
          line-height: 1.4;
          max-width: 680px;
        }
        .search-clear {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          border-radius: 4px;
          display: none;
          align-items: center;
          justify-content: center;
          transition: background .2s, color .2s;
        }
        .search-clear:hover {
          background: rgba(0,0,0,0.05);
          color: #333;
        }
        .search-clear.visible {
          display: flex;
        }

        /* Column filter chips */
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .filter-chip {
          padding: 4px 12px;
          border-radius: 20px;
          border: 1.5px solid #ccc;
          background: #fff;
          color: #555;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
          user-select: none;
        }
        .filter-chip:hover {
          border-color: #0c6d38;
          color: #0c6d38;
          background: #f0f9f4;
        }
        .filter-chip.active {
          background: #0c6d38;
          color: white;
          border-color: #0c6d38;
          box-shadow: 0 2px 6px rgba(12,109,56,0.25);
        }

        /* Sort Controls */
        .sort-controls {
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .sort-label { font-weight:600; color:#333; font-size:14px; }
        .sort-dropdown-wrap { position:relative; }
        .sort-icon-btn {
          padding:7px 12px; border:1.5px solid #0c6d38; background:#fff; color:#0c6d38;
          border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;
          display:inline-flex; align-items:center; gap:6px; transition:all .2s;
        }
        .sort-icon-btn:hover { background:#f0f9f4; }
        .sort-icon-btn.active-newest::after { content:" ↓ Newest"; }
        .sort-icon-btn.active-oldest::after  { content:" ↑ Oldest"; }
        .sort-icon-btn.active-dateFilled-asc::after  { content:" ↑ Date Filled"; }
        .sort-icon-btn.active-dateFilled-desc::after { content:" ↓ Date Filled"; }
        .sort-drop-menu {
          display:none; position:absolute; top:calc(100% + 6px); left:0;
          background:#fff; border:1px solid #ddd; border-radius:10px;
          box-shadow:0 8px 24px rgba(0,0,0,.12); z-index:500; min-width:150px; overflow:hidden;
        }
        .sort-drop-menu.open { display:block; }
        .sort-drop-opt {
          display:flex; align-items:center; gap:8px;
          width:100%; padding:10px 14px; background:none; border:none;
          text-align:left; font-size:13px; color:#333; cursor:pointer; transition:background .15s;
        }
        .sort-drop-opt:hover { background:#f0f9f4; color:#0c6d38; font-weight:600; }
        .sort-drop-opt.selected { color:#0c6d38; font-weight:700; }

        /* Pagination styles */
        .pagination-container {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 0;
        }
        .pagination-info {
          color: #666;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #fff;
          color: #333;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pagination-btn:hover:not(:disabled) {
          background: #0c6d38;
          color: white;
          border-color: #0c6d38;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f5f5f5;
        }
        .pagination-btn.active {
          background: #0c6d38;
          color: white;
          border-color: #0c6d38;
        }
        .items-per-page {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .items-per-page label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        .items-per-page select {
          padding: 6px 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }
        .items-per-page select:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 2px rgba(12,109,56,.15);
        }
        #belongingPartyName, #opposingPartyName {
          width: 90%;
        }

       
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { font-weight:600; color:#0f172a; }

        .input-error {
          min-height: 16px;
          font-size: 12px;
          color: #b91c1c;
          margin-bottom: 4px;
        }
        .field-hint {
          font-size: 11px;
          color: #888;
          margin: 0;
          line-height: 1.3;
        }

        /* Attachment styles */
        .attachment-wrap {
          margin-top: 6px;
        }
        .attachment-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f0f9f4;
          border: 1.5px dashed #0c6d38;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #0c6d38;
          transition: all 0.2s;
          user-select: none;
        }
        .attachment-label:hover {
          background: #e0f5ea;
          border-style: solid;
        }
        .attachment-label input[type="file"] {
          display: none;
        }
        .attachment-preview {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .attachment-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #e8f5e9;
          border: 1px solid #a5d6a7;
          border-radius: 20px;
          font-size: 12px;
          color: #2e7d32;
          max-width: 200px;
        }
        .attachment-chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .attachment-chip .remove-attach {
          background: none;
          border: none;
          cursor: pointer;
          color: #c62828;
          font-size: 14px;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
        }
        .attachment-chip .remove-attach:hover { color: #b71c1c; }
        .attachment-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #0c6d38;
          text-decoration: none;
          font-weight: 600;
          padding: 3px 8px;
          background: #f0f9f4;
          border-radius: 6px;
          border: 1px solid #a5d6a7;
          transition: background 0.2s;
        }
        .attachment-link:hover { background: #e0f5ea; text-decoration: underline; }
        .existing-attachments {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        /* Custom location autocomplete */
        .location-wrap { position: relative; }
        .location-dropdown {
          display: none;
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          z-index: 600;
          max-height: 220px;
          overflow-y: auto;
        }
        .location-dropdown.open { display: block; }
        .loc-opt {
          padding: 9px 14px;
          font-size: 13px;
          cursor: pointer;
          color: #333;
          transition: background .12s;
        }
        .loc-opt:hover, .loc-opt.active { background: #f0f9f4; color: #0c6d38; font-weight: 600; }
        .loc-opt mark { background: none; color: #0c6d38; font-weight: 700; }
        .loc-empty { padding: 10px 14px; font-size: 13px; color: #999; }

        /* Case Details Modal */
        .details-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999;
          align-items: center;
          justify-content: center;
        }

        .details-modal.active {
          display: flex;
        }

        .details-modal-content {
          background: white;
          border-radius: 16px;
          padding: 30px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .details-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #eee;
        }

        .details-modal-header h2 {
          margin: 0;
          color: #0c6d38;
          font-size: 22px;
        }

        .details-modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .details-modal-close:hover {
          background: #f0f0f0;
          color: #333;
        }

        .details-modal-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .detail-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-label {
          font-size: 13px;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 14px;
          color: #333;
          word-break: break-word;
          padding: 8px 0;
        }

        .detail-full-width {
          grid-column: 1 / -1;
        }

        /* Attachment display in details modal */
        .detail-attachments {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .attach-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 120px;
          text-decoration: none;
          border: 1.5px solid #d1e7dd;
          border-radius: 10px;
          padding: 8px;
          background: #f8fffe;
          transition: all 0.2s;
          cursor: pointer;
          overflow: hidden;
        }
        .attach-card:hover {
          border-color: #0c6d38;
          background: #edf7f1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(12,109,56,0.15);
        }
        .attach-card img {
          width: 100px;
          height: 72px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }
        .attach-card .attach-icon {
          font-size: 38px;
          line-height: 1;
        }
        .attach-card .attach-name {
          font-size: 11px;
          color: #333;
          font-weight: 600;
          text-align: center;
          word-break: break-all;
          max-width: 100%;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .attach-card .attach-type {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .attach-card .attach-view-btn {
          margin-top: 4px;
          width: 100%;
          padding: 5px 0;
          background: #0c6d38;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          letter-spacing: 0.3px;
        }
        .attach-card .attach-view-btn:hover { background: #095a2e; }

        /* File Viewer Modal */
        .file-viewer-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 1300;
          align-items: center;
          justify-content: center;
        }
        .file-viewer-modal.active { display: flex; }
        .file-viewer-content {
          background: #1a1a2e;
          border-radius: 14px;
          width: 94%;
          max-width: 960px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .file-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #16213e;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          gap: 12px;
          flex-shrink: 0;
        }
        .file-viewer-title {
          font-size: 13px;
          font-weight: 600;
          color: #e0e0e0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .file-viewer-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .file-viewer-btn {
          padding: 6px 14px;
          border-radius: 7px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .file-viewer-btn.open-btn {
          background: #0c6d38;
          color: white;
        }
        .file-viewer-btn.open-btn:hover { background: #0e7d42; }
        .file-viewer-btn.download-btn {
          background: #6f42c1;
          color: white;
        }
        .file-viewer-btn.download-btn:hover { background: #5a32a3; }
        .file-viewer-btn.close-btn {
          background: rgba(255,255,255,0.1);
          color: #ccc;
        }
        .file-viewer-btn.close-btn:hover { background: rgba(255,255,255,0.2); color: white; }
        .file-viewer-body {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          min-height: 300px;
        }
        .file-viewer-body img {
          max-width: 100%;
          max-height: calc(92vh - 80px);
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        .file-viewer-body iframe {
          width: 100%;
          height: calc(92vh - 80px);
          border: none;
          border-radius: 8px;
          background: white;
        }
        .file-viewer-unsupported {
          text-align: center;
          color: #aaa;
          padding: 40px 20px;
        }
        .file-viewer-unsupported .unsupported-icon { font-size: 56px; margin-bottom: 12px; }
        .file-viewer-unsupported p { font-size: 14px; margin: 6px 0; }
        .file-viewer-unsupported .unsupported-name {
          font-weight: 700;
          color: #ddd;
          font-size: 15px;
          word-break: break-all;
        }

        /* Map Modal */
        .map-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 1400;
          align-items: center;
          justify-content: center;
        }
        .map-modal.active { display: flex; }
        .map-modal-content {
          background: white;
          border-radius: 14px;
          width: 92%;
          max-width: 780px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          display: flex;
          flex-direction: column;
        }
        .map-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: #0c6d38;
          gap: 10px;
        }
        .map-modal-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .map-modal-close {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          font-size: 18px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .map-modal-close:hover { background: rgba(255,255,255,0.3); }
        #caseMapContainer {
          width: 100%;
          height: 420px;
        }
        .map-location-badge {
          padding: 10px 16px;
          background: #f4f6f9;
          font-size: 13px;
          color: #444;
          border-top: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Map button next to location */
        .location-map-btn {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f0f9f4;
          border: 1.5px solid #0c6d38;
          border-radius: 8px;
          color: #0c6d38;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .location-map-btn:hover {
          background: #0c6d38;
          color: white;
        }
        .location-map-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }

        @media (max-width:600px) {
          #caseMapContainer { height: 280px; }
          .map-modal-content { width: 96%; }
        }
            width: 95%;
            padding: 20px;
          }
          .details-modal-body {
            grid-template-columns: 1fr;
          }
          .detail-full-width {
            grid-column: 1;
          }
          table { min-width:700px; } 
          .pagination-container {
            flex-direction: column;
            align-items: stretch;
          }
          .pagination-controls {
            justify-content: center;
            flex-wrap: wrap;
          }
          .party-item {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .party-roles {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .parties-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .add-party-btn {
            width: 100%;
          }
        }
        ${darkModeCSS}
      </style>

      <div class="card">
        <h2>🛠 Case Management</h2>

        <form id="caseForm">
          <div class="field">
            <label for="caseNo">Case Number</label>
            <input id="caseNo" required />
            <span class="field-hint" id="caseNoHint" style="display:none;">Enter unique case number</span>
            <div id="caseNoError" class="input-error" aria-live="polite"></div>
          </div>

          <div class="field">
            <label for="nature">Nature of the Case</label>
            <textarea id="nature" required></textarea>
          </div>

          <div class="field">
            <label for="taxDec">Title / Tax Declaration</label>
            <input id="taxDec" />
          </div>

          <div class="parties-container">
            <div class="party-section" id="belongingPartySection">
              <div class="party-header">
                <span class="party-icon">👤</span>
                <label>Belonging / Filing Party</label>
              </div>
              <input 
                
                type="text" 
                class="party-name-input" 
                id="belongingPartyName" 
                placeholder="Enter party name"
              />
              <div class="party-roles">
                <div class="role-checkbox-group">
                  <input type="radio" id="belongingPetitioner" name="belongingPartyRole" value="Petitioner" />
                  <label for="belongingPetitioner">Petitioner</label>
                </div>
                <div class="role-checkbox-group">
                  <input type="radio" id="belongingComplainant" name="belongingPartyRole" value="Complainant" />
                  <label for="belongingComplainant">Complainant</label>
                </div>
                <div class="role-checkbox-group">
                  <input type="radio" id="belongingPlaintiff" name="belongingPartyRole" value="Plaintiff" />
                  <label for="belongingPlaintiff">Plaintiff</label>
                </div>
              </div>
            </div>

            <div class="party-section" id="opposingPartySection">
              <div class="party-header">
                <span class="party-icon">⚖️</span>
                <label>Opposing / Defending Party</label>
              </div>
              <input 
                type="text" 
                class="party-name-input" 
                id="opposingPartyName" 
                placeholder="Enter party name"
              />
              <div class="party-roles">
                <div class="role-checkbox-group">
                  <input type="radio" id="opposingRespondent" name="opposingPartyRole" value="Respondent" />
                  <label for="opposingRespondent">Respondent</label>
                </div>
                <div class="role-checkbox-group">
                  <input type="radio" id="opposingDefendant" name="opposingPartyRole" value="Defendant" />
                  <label for="opposingDefendant">Defendant</label>
                </div>
                <div class="role-checkbox-group">
                  <input type="radio" id="opposingLandowner" name="opposingPartyRole" value="Landowner" />
                  <label for="opposingLandowner">Landowner</label>
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label for="locationInput">Location</label>
            <div class="location-wrap">
              <input id="locationInput" placeholder="Type to search location..." autocomplete="off" />
              <div class="location-dropdown" id="locationDropdown"></div>
            </div>
            <button type="button" class="location-map-btn" id="locationMapBtn" disabled>📍 View on Map</button>
          </div>

          <!-- New fields -->

          <div class="field">
            <label for="dateFilled">Date Filed</label>
            <input type="date" id="dateFilled" required />
            <div class="attachment-wrap">
              <label class="attachment-label">
                📎 Attach file
                <input type="file" id="dateFilledFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
              </label>
              <div class="attachment-preview" id="dateFilledPreview"></div>
            </div>
          </div>

           <div class="field">
            <label for="dateDecided">Date of Decision</label>
            <input type="date" id="dateDecided" />
            <div class="attachment-wrap">
              <label class="attachment-label">
                📎 Attach file
                <input type="file" id="dateDecidedFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
              </label>
              <div class="attachment-preview" id="dateDecidedPreview"></div>
            </div>
          </div>

          <div class="field">
            <label for="mrDateReceived">MR Date Received</label>
            <input type="date" id="mrDateReceived" />
            <div class="attachment-wrap">
              <label class="attachment-label">
                📎 Attach file
                <input type="file" id="mrDateReceivedFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
              </label>
              <div class="attachment-preview" id="mrDateReceivedPreview"></div>
            </div>
          </div>

          <div class="field">
            <label for="mrDateResolution">MR Date Resolution</label>
            <input type="date" id="mrDateResolution" />
            <div class="attachment-wrap">
              <label class="attachment-label">
                📎 Attach file
                <input type="file" id="mrDateResolutionFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
              </label>
              <div class="attachment-preview" id="mrDateResolutionPreview"></div>
            </div>
          </div>

          <div class="field">
            <label for="dateOfAppeal">Date of Appeal</label>
            <input type="date" id="dateOfAppeal" />
            <div class="attachment-wrap">
              <label class="attachment-label">
                📎 Attach file
                <input type="file" id="dateOfAppealFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
              </label>
              <div class="attachment-preview" id="dateOfAppealPreview"></div>
            </div>
          </div>
          
          <div class="field">
            <label for="dateOfFinality">Date of Finality/Entry of Judgment</label>
            <input type="date" id="dateOfFinality" />
            <div class="attachment-wrap">
              <label class="attachment-label">
                📎 Attach file
                <input type="file" id="dateOfFinalityFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
              </label>
              <div class="attachment-preview" id="dateOfFinalityPreview"></div>
            </div>
          </div>

          <div class="field">
            <label for="winningParty">Winning Party</label>
            <input id="winningParty" />
          </div>

          <div class="field">
            <label for="cabinetNo">Cabinet No</label>
            <select id="cabinetNo">
              <option value="">— Select Cabinet —</option>
            </select>
          </div>

          <div class="field">
            <label for="drawerNo">Drawer No</label>
            <select id="drawerNo" disabled>
              <option value="">— Select Drawer —</option>
            </select>
            <div id="drawerCapacityHint" class="field-hint" style="display:none;"></div>
          </div>

          <div class="field">
            <label for="status">Status</label>
            <select id="status" disabled>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          
          <button class="add-btn" type="submit">Add Case</button>
        </form>

        <hr/>
        <br>

        <div class="search-container">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="searchInput" 
              class="search-input" 
              placeholder="Search cases..."
            />
            <button class="search-clear" id="searchClear" aria-label="Clear search">×</button>
          </div>
          <div class="search-help" id="searchHelp">Tip: enter text or dates to search. For date fields, use MM-DD-YYYY or MM/DD/YYYY (for example, 05-04-2026).</div>
          <div class="filter-chips" id="filterChips">
            <button class="filter-chip active" data-col="all">All Fields</button>
            <button class="filter-chip" data-col="caseNo">Case No</button>
            <button class="filter-chip" data-col="nature">Nature of Case</button>
            <button class="filter-chip" data-col="taxDec">Title / Tax Dec</button>
            <button class="filter-chip" data-col="belongingParty">Belonging Party</button>
            <button class="filter-chip" data-col="opposingParty">Opposing Party</button>
            <button class="filter-chip" data-col="location">Location</button>
            <button class="filter-chip" data-col="dateFilled">Date Filed</button>
            <button class="filter-chip" data-col="dateDecided">Date of Decision</button>
            <button class="filter-chip" data-col="mrDateReceived">MR Date Received</button>
            <button class="filter-chip" data-col="mrDateResolution">MR Date Resolution</button>
            <button class="filter-chip" data-col="dateOfAppeal">Date of Appeal</button>
            <button class="filter-chip" data-col="dateOfFinality">Date of Finality</button>
            <button class="filter-chip" data-col="winningParty">Winning Party</button>
            <button class="filter-chip" data-col="createdBy">Created By</button>
            <button class="filter-chip" data-col="updatedBy">Updated By</button>
          </div>
        </div>

        <!-- Sort Controls -->
        <div class="sort-controls">
          <span class="sort-label">Sort:</span>
          <div class="sort-dropdown-wrap">
            <button class="sort-icon-btn active-newest" id="sortIconBtn">⇅</button>
            <div class="sort-drop-menu" id="sortDropMenu">
              <button class="sort-drop-opt selected" id="sortNewestBtn">↓ Newest First</button>
              <button class="sort-drop-opt" id="sortOldestBtn">↑ Oldest First</button>
              <button class="sort-drop-opt" id="sortDateFilledAscBtn">↑ Date Filled (Oldest)</button>
              <button class="sort-drop-opt" id="sortDateFilledDescBtn">↓ Date Filled (Newest)</button>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Case No</th>
                <th>Nature of the Case</th>
                <th>Title / Tax Dec</th>
                <th>Belonging / Filing Party</th>
                <th>Opposing / Defending Party</th>
                <th>Location</th>
                <th>Date Filed</th>
                <th>Date of Decision</th>
                <th>MR Date Received</th>
                <th>MR Date Resolution</th>
                <th>Date of Appeal</th>
                <th>Date of Finality</th>
                <th>Winning Party</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Updated By</th>
                <th>Actions</th>
            </thead>
            <tbody id="caseTableBody"></tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-container" id="paginationContainer" style="display: none;">
          <div class="pagination-info">
            <span id="paginationInfo">Showing 0-0 of 0</span>
            <div class="items-per-page">
              <label for="itemsPerPage">Items per page:</label>
              <select id="itemsPerPage">
                <option value="5">5</option>
                <option value="10" selected>10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div class="pagination-controls" id="paginationControls"></div>
        </div>
      </div>

      <div class="modal" id="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit Case</h3>
            <button class="close cancel-btn" id="closeModal" type="button" role="button" tabindex="0" aria-label="Cancel edit">Cancel</button>
          </div>
          <div class="modal-body" id="modalBody"></div>
          <button class="save-btn" id="saveEditBtn">Save Changes</button>
        </div>
      </div>

      <!-- Notification modal -->
      <div class="notify-modal" id="notificationModal" aria-hidden="true">
        <div class="notify-box success" id="notifyBox">
          <div class="msg" id="notifyMsg">Success</div>
          <button class="ok" id="notifyOk">OK</button>
        </div>
      </div>

      <!-- Loading modal -->
      <div class="loading-modal" id="loadingModal" aria-hidden="true">
        <div class="loading-box">
          <div class="spinner" aria-hidden="true"></div>
          <div class="loading-text" id="loadingText">Processing...</div>
        </div>
      </div>

      <!-- Case Details Modal -->
      <div class="details-modal" id="caseDetailsModal">
        <div class="details-modal-content">
          <div class="details-modal-header">
            <h2 id="detailsModalCaseNo">Case Details</h2>
            <button class="details-modal-close" id="detailsModalClose">&times;</button>
          </div>
          <div class="details-modal-body" id="detailsModalBody">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>

      <!-- File Viewer Modal -->
      <div class="file-viewer-modal" id="fileViewerModal">
        <div class="file-viewer-content">
          <div class="file-viewer-header">
            <span class="file-viewer-title" id="fileViewerTitle">File</span>
            <div class="file-viewer-actions">
              <a class="file-viewer-btn open-btn" id="fileViewerOpenBtn" target="_blank" rel="noopener noreferrer">↗ Open</a>
              <a class="file-viewer-btn download-btn" id="fileViewerDownloadBtn" download>⬇ Download</a>
              <button class="file-viewer-btn close-btn" id="fileViewerClose">✕ Close</button>
            </div>
          </div>
          <div class="file-viewer-body" id="fileViewerBody">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>

      <!-- Map Modal -->
      <div class="map-modal" id="caseMapModal">
        <div class="map-modal-content">
          <div class="map-modal-header">
            <span class="map-modal-title">📍 <span id="caseMapTitle">Location</span></span>
            <button class="map-modal-close" id="caseMapClose">✕</button>
          </div>
          <div id="caseMapContainer"></div>
          <div class="map-location-badge">📍 <span id="caseMapBadge"></span></div>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("caseForm")
      .addEventListener("submit", e => this.addCase(e));

    // Init location autocomplete for add form
    this._initLocationAutocomplete(
      this.shadowRoot.getElementById("locationInput"),
      this.shadowRoot.getElementById("locationDropdown")
    );

    // Live duplicate validation for Case Number
    const caseNoInput = this.shadowRoot.getElementById("caseNo");
    if (caseNoInput) {
      caseNoInput.addEventListener("input", e => {
        this._checkCaseNoDuplicate(e.target.value);
      });
      caseNoInput.addEventListener("focus", () => {
        const hint = this.shadowRoot.getElementById("caseNoHint");
        if (hint) hint.style.display = "inline";
      });
      caseNoInput.addEventListener("blur", () => {
        const hint = this.shadowRoot.getElementById("caseNoHint");
        if (hint) hint.style.display = "none";
      });
    } 
    // Add interactive focus effects for party sections
    const belongingInput = this.shadowRoot.getElementById("belongingPartyName");
    const opposingInput = this.shadowRoot.getElementById("opposingPartyName");
    const belongingSection = this.shadowRoot.getElementById("belongingPartySection");
    const opposingSection = this.shadowRoot.getElementById("opposingPartySection");

    if (belongingInput && belongingSection) {
      belongingInput.addEventListener("focus", () => {
        belongingSection.classList.add("active");
      });
      belongingInput.addEventListener("blur", () => {
        belongingSection.classList.remove("active");
      });
    }

    if (opposingInput && opposingSection) {
      opposingInput.addEventListener("focus", () => {
        opposingSection.classList.add("active");
      });
      opposingInput.addEventListener("blur", () => {
        opposingSection.classList.remove("active");
      });
    }

    this.shadowRoot.getElementById("closeModal")
      .addEventListener("click", () => this.closeModal());

    // Details modal event handlers
    const detailsModal = this.shadowRoot.getElementById("caseDetailsModal");
    const detailsModalClose = this.shadowRoot.getElementById("detailsModalClose");
    
    if (detailsModalClose) {
      detailsModalClose.addEventListener("click", () => this.closeDetailsModal());
    }

    // Close details modal when clicking outside
    if (detailsModal) {
      detailsModal.addEventListener("click", (e) => {
        if (e.target === detailsModal) {
          this.closeDetailsModal();
        }
      });
    }

    // File viewer modal handlers
    const fileViewerClose = this.shadowRoot.getElementById("fileViewerClose");
    const fileViewerModal = this.shadowRoot.getElementById("fileViewerModal");
    if (fileViewerClose) {
      fileViewerClose.addEventListener("click", () => this._closeFileViewer());
    }
    if (fileViewerModal) {
      fileViewerModal.addEventListener("click", (e) => {
        if (e.target === fileViewerModal) this._closeFileViewer();
      });
    }
    // Close file viewer with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this._closeFileViewer();
    });

    // Map modal handlers
    const caseMapClose = this.shadowRoot.getElementById("caseMapClose");
    const caseMapModal = this.shadowRoot.getElementById("caseMapModal");
    if (caseMapClose) {
      caseMapClose.addEventListener("click", () => this._closeMapModal());
    }
    if (caseMapModal) {
      caseMapModal.addEventListener("click", (e) => {
        if (e.target === caseMapModal) this._closeMapModal();
      });
    }

    // Location map button (add form)
    const locationInput  = this.shadowRoot.getElementById("locationInput");
    const locationMapBtn = this.shadowRoot.getElementById("locationMapBtn");
    if (locationInput && locationMapBtn) {
      // Enable/disable based on whether a location is typed
      locationInput.addEventListener("input", () => {
        locationMapBtn.disabled = !locationInput.value.trim();
      });
      locationMapBtn.addEventListener("click", () => {
        const loc = locationInput.value.trim();
        if (loc) this._openMapModal(loc);
      });
    }

    // notification modal handlers
    const notifyOk = this.shadowRoot.getElementById("notifyOk");
    if (notifyOk) notifyOk.addEventListener("click", () => this._hideNotification());

    // search bar handlers
    const searchInput = this.shadowRoot.getElementById("searchInput");
    const searchClear = this.shadowRoot.getElementById("searchClear");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.filterCases(e.target.value));
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Escape") {
          e.target.value = "";
          this.filterCases("");
        }
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          this.filterCases("");
          searchInput.focus();
        }
      });
    }

    // Filter chip handlers
    const filterChips = this.shadowRoot.getElementById("filterChips");
    if (filterChips) {
      filterChips.addEventListener("click", (e) => {
        const chip = e.target.closest(".filter-chip");
        if (!chip) return;
        // Update active chip
        filterChips.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        // Update selected column
        this.searchColumn = chip.dataset.col;
        // Update placeholder and help text
        const label = chip.textContent.trim();
        const isDateField = ["dateFilled", "dateDecided", "mrDateReceived", "mrDateResolution", "dateOfAppeal", "dateOfFinality"].includes(this.searchColumn);
        if (searchInput) {
          searchInput.placeholder = this.searchColumn === "all"
            ? "Search cases..."
            : isDateField
              ? `Search by ${label} (MM-DD-YYYY or MM/DD/YYYY)...`
              : `Search by ${label}...`;
        }
        const searchHelp = this.shadowRoot.getElementById("searchHelp");
        if (searchHelp) {
          if (this.searchColumn === "all") {
            searchHelp.textContent = "Tip: enter text or dates to search. For date fields, use MM-DD-YYYY or MM/DD/YYYY (for example, 05-04-2026).";
          } else if (isDateField) {
            searchHelp.textContent = `Searching ${label}. Enter a date in MM-DD-YYYY or MM/DD/YYYY format, for example 05-04-2026.`;
          } else {
            searchHelp.textContent = `Searching ${label}. Type any text or keyword to filter results.`;
          }
        }
        // Re-run filter with current term
        this.currentPage = 1;
        const term = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, term);
      });
    }

    // Sort button handlers
    const sortNewestBtn = this.shadowRoot.getElementById("sortNewestBtn");
    const sortOldestBtn = this.shadowRoot.getElementById("sortOldestBtn");
    const sortIconBtn   = this.shadowRoot.getElementById("sortIconBtn");
    const sortDropMenu  = this.shadowRoot.getElementById("sortDropMenu");
    if (sortIconBtn && sortDropMenu) {
      sortIconBtn.addEventListener("click", e => { e.stopPropagation(); sortDropMenu.classList.toggle("open"); });
      this.shadowRoot.addEventListener("click", () => sortDropMenu.classList.remove("open"));
    }
    if (sortNewestBtn) sortNewestBtn.addEventListener("click", () => this.setSortOrder("newest"));
    if (sortOldestBtn) sortOldestBtn.addEventListener("click", () => this.setSortOrder("oldest"));

    const sortDateFilledAscBtn  = this.shadowRoot.getElementById("sortDateFilledAscBtn");
    const sortDateFilledDescBtn = this.shadowRoot.getElementById("sortDateFilledDescBtn");
    if (sortDateFilledAscBtn)  sortDateFilledAscBtn.addEventListener("click",  () => this.setSortOrder("dateFilled-asc"));
    if (sortDateFilledDescBtn) sortDateFilledDescBtn.addEventListener("click", () => this.setSortOrder("dateFilled-desc"));

    // Attachment file preview listeners (add form)
    const attachmentFields = [
      { fileId: "dateFilledFile",       previewId: "dateFilledPreview" },
      { fileId: "dateDecidedFile",      previewId: "dateDecidedPreview" },
      { fileId: "mrDateReceivedFile",   previewId: "mrDateReceivedPreview" },
      { fileId: "mrDateResolutionFile", previewId: "mrDateResolutionPreview" },
      { fileId: "dateOfAppealFile",     previewId: "dateOfAppealPreview" },
      { fileId: "dateOfFinalityFile",   previewId: "dateOfFinalityPreview" },
    ];
    attachmentFields.forEach(({ fileId, previewId }) => {
      const fileInput = this.shadowRoot.getElementById(fileId);
      const preview   = this.shadowRoot.getElementById(previewId);
      if (fileInput && preview) {
        fileInput.addEventListener("change", () => {
          this._renderFilePreview(fileInput, preview);
        });
      }
    });

    

    // pagination handlers
    const itemsPerPageSelect = this.shadowRoot.getElementById("itemsPerPage");
    if (itemsPerPageSelect) {
      itemsPerPageSelect.value = this.itemsPerPage.toString(); // Sync with current value
      itemsPerPageSelect.addEventListener("change", (e) => {
        this.itemsPerPage = parseInt(e.target.value);
        this.currentPage = 1; // Reset to first page
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
      });
    }
  }

  // ─── Attachment helpers ───────────────────────────────────────────────────

  /**
   * Renders file chips in a preview container for a given file input.
   * Chips show the filename and a remove (×) button.
   */
  _renderFilePreview(fileInput, previewEl) {
    previewEl.innerHTML = "";
    const files = Array.from(fileInput.files || []);
    files.forEach((file, idx) => {
      const chip = document.createElement("div");
      chip.className = "attachment-chip";
      chip.innerHTML = `
        <span title="${file.name}">📄 ${file.name}</span>
        <button class="remove-attach" type="button" aria-label="Remove ${file.name}">×</button>
      `;
      chip.querySelector(".remove-attach").addEventListener("click", () => {
        // Remove file from the input by rebuilding a DataTransfer
        const dt = new DataTransfer();
        Array.from(fileInput.files).forEach((f, i) => {
          if (i !== idx) dt.items.add(f);
        });
        fileInput.files = dt.files;
        this._renderFilePreview(fileInput, previewEl);
      });
      previewEl.appendChild(chip);
    });
  }

  /**
   * Returns HTML for existing saved attachments (links) in the edit modal.
   */
  _renderExistingAttachments(attachments) {
    if (!Array.isArray(attachments) || !attachments.length) return "";
    const links = attachments.map(a =>
      `<a class="attachment-link" href="${a.url}" target="_blank" rel="noopener noreferrer">📄 ${a.name}</a>`
    ).join("");
    return `<div class="existing-attachments">${links}</div>`;
  }

  /**
   * Uploads files from a file input to Cloudinary via unsigned upload preset
   * and returns an array of { name, url, publicId } objects.
   *
   * Files are organized under folder: cases/<caseNo>/<fieldKey>
   * Returns empty array (with console warning) if upload fails — case still saves.
   */
  async _uploadAttachments(fileInput, caseNo, fieldKey) {
    const files = Array.from(fileInput?.files || []);
    if (!files.length) return [];

    const results = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("folder", `cases/${caseNo}/${fieldKey}`);

        const response = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const msg = err.error?.message || `HTTP ${response.status}`;
          console.warn(`Cloudinary upload failed for "${file.name}": ${msg}`);
          // Surface the error so the caller can decide what to do
          throw new Error(`Cloudinary: ${msg}`);
        }

        const data = await response.json();
        results.push({
          name: file.name,
          url: data.secure_url,
          publicId: data.public_id,
        });
      } catch (err) {
        // Re-throw so addCase / saveEditBtn can catch and report it
        throw err;
      }
    }
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────

  getBelongingPartyRole() {
    const selected = this.shadowRoot.querySelector('input[name="belongingPartyRole"]:checked');
    return selected ? selected.value : null;
  }

  getOpposingPartyRole() {
    const selected = this.shadowRoot.querySelector('input[name="opposingPartyRole"]:checked');
    return selected ? selected.value : null;
  }

  setSortOrder(order) {
    this.sortOrder = order;
    this.currentPage = 1;
    const sr = this.shadowRoot;
    const btn  = sr.getElementById("sortIconBtn");
    const menu = sr.getElementById("sortDropMenu");
    if (btn) btn.className = `sort-icon-btn active-${order}`;
    sr.querySelectorAll(".sort-drop-opt").forEach(o => o.classList.remove("selected"));
    const selectedBtnId = {
      newest: "sortNewestBtn",
      oldest: "sortOldestBtn",
      "dateFilled-asc":  "sortDateFilledAscBtn",
      "dateFilled-desc": "sortDateFilledDescBtn",
    }[order] || "sortNewestBtn";
    sr.getElementById(selectedBtnId)?.classList.add("selected");
    if (menu) menu.classList.remove("open");
    const searchInput = sr.getElementById("searchInput");
    const searchTerm = searchInput ? searchInput.value : "";
    this._renderCases(this.allCases, searchTerm);
  }

  sortCases(cases) {
    // Create a copy to avoid mutating the original array
    const sorted = [...cases];
    
    sorted.sort((a, b) => {
      if (this.sortOrder === "dateFilled-asc" || this.sortOrder === "dateFilled-desc") {
        const dA = a.data.dateFilled ? new Date(a.data.dateFilled) : new Date(0);
        const dB = b.data.dateFilled ? new Date(b.data.dateFilled) : new Date(0);
        return this.sortOrder === "dateFilled-asc" ? dA - dB : dB - dA;
      }
      const dateA = a.data.createdAt?.toDate?.() || new Date(0);
      const dateB = b.data.createdAt?.toDate?.() || new Date(0);
      return this.sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  }

  async addCase(e) {
    e.preventDefault();

    const caseNo = this.shadowRoot.getElementById("caseNo").value;
    if (!caseNo) {
      this._showNotification("Case Number is required.");
      return;
    }

    // Check for duplicate case number
    const duplicate = this.allCases.some(c => c.data.caseNo === caseNo);
    if (duplicate) {
      this._showNotification("Case with this Case Number already exists.");
      return;
    }

    const belongingPartyName = this.shadowRoot.getElementById("belongingPartyName").value.trim();
    const opposingPartyName = this.shadowRoot.getElementById("opposingPartyName").value.trim();
    const belongingPartyRole = this.getBelongingPartyRole();
    const opposingPartyRole = this.getOpposingPartyRole();

    const belongingParty = belongingPartyName ? {
      name: belongingPartyName,
      role: belongingPartyRole
    } : null;

    const opposingParty = opposingPartyName ? {
      name: opposingPartyName,
      role: opposingPartyRole
    } : null;

    // Cabinet / Drawer validation
    const selectedCabId  = this.shadowRoot.getElementById("cabinetNo")?.value  || "";
    const selectedDrwId  = this.shadowRoot.getElementById("drawerNo")?.value   || "";
    if (selectedDrwId) {
      const drw   = Object.values(this._drawersByCabinet || {}).flat().find(d => d.id === selectedDrwId);
      const cap   = drw?.data?.capacity || 100;
      const count = (this._casesPerDrawer || {})[selectedDrwId] || 0;
      if (count >= cap) {
        this._showNotification(`This drawer is full (${count}/${cap}). Please select a different drawer.`);
        return;
      }
    }
    const cabObj = (this._cabinets || []).find(c => c.id === selectedCabId);
    const drwObj = Object.values(this._drawersByCabinet || {}).flat().find(d => d.id === selectedDrwId);

    const data = {
      caseNo,
      nature: this.shadowRoot.getElementById("nature").value,
      taxDec: this.shadowRoot.getElementById("taxDec").value,
      belongingParty: belongingPartyName ? belongingParty : null,
      opposingParty: opposingPartyName ? opposingParty : null,
      location: this.shadowRoot.getElementById("locationInput").value,
      dateFilled: this.shadowRoot.getElementById("dateFilled").value,
      mrDateReceived: this.shadowRoot.getElementById("mrDateReceived").value,
      mrDateResolution: this.shadowRoot.getElementById("mrDateResolution").value,
      dateOfAppeal: this.shadowRoot.getElementById("dateOfAppeal").value,
      winningParty: this.shadowRoot.getElementById("winningParty").value,
      dateOfFinality: this.shadowRoot.getElementById("dateOfFinality").value,
      dateDecided: this.shadowRoot.getElementById("dateDecided").value,
      status: this.shadowRoot.getElementById("status").value,
      cabinetId:   selectedCabId,
      cabinetName: cabObj?.data?.name || "",
      drawerId:    selectedDrwId,
      drawerLabel: drwObj ? (drwObj.data.label || `Drawer ${drwObj.data.drawerNo}`) : "",
      createdAt: serverTimestamp(),
      createdBy: (auth.currentUser && auth.currentUser.email) ? auth.currentUser.email : "",
    };

   
    

    try {
      // Show loading while uploading
      this._showLoading("Uploading attachments...");

      // Upload attachments for each date field
      const [
        dateFilledAttachments,
        dateDecidedAttachments,
        mrDateReceivedAttachments,
        mrDateResolutionAttachments,
        dateOfAppealAttachments,
        dateOfFinalityAttachments,
      ] = await Promise.all([
        this._uploadAttachments(this.shadowRoot.getElementById("dateFilledFile"),       caseNo, "dateFilled"),
        this._uploadAttachments(this.shadowRoot.getElementById("dateDecidedFile"),      caseNo, "dateDecided"),
        this._uploadAttachments(this.shadowRoot.getElementById("mrDateReceivedFile"),   caseNo, "mrDateReceived"),
        this._uploadAttachments(this.shadowRoot.getElementById("mrDateResolutionFile"), caseNo, "mrDateResolution"),
        this._uploadAttachments(this.shadowRoot.getElementById("dateOfAppealFile"),     caseNo, "dateOfAppeal"),
        this._uploadAttachments(this.shadowRoot.getElementById("dateOfFinalityFile"),   caseNo, "dateOfFinality"),
      ]);

      if (dateFilledAttachments.length)       data.dateFilledAttachments       = dateFilledAttachments;
      if (dateDecidedAttachments.length)      data.dateDecidedAttachments      = dateDecidedAttachments;
      if (mrDateReceivedAttachments.length)   data.mrDateReceivedAttachments   = mrDateReceivedAttachments;
      if (mrDateResolutionAttachments.length) data.mrDateResolutionAttachments = mrDateResolutionAttachments;
      if (dateOfAppealAttachments.length)     data.dateOfAppealAttachments     = dateOfAppealAttachments;
      if (dateOfFinalityAttachments.length)   data.dateOfFinalityAttachments   = dateOfFinalityAttachments;

      this._showLoading("Saving case...");
      await addDoc(collection(db, "cases"), data);
      this._hideLoading();

      this.shadowRoot.getElementById("caseForm").reset();
      // Reset radio buttons
      this.shadowRoot.querySelectorAll('#belongingPartySection input[type="radio"]').forEach(rb => rb.checked = false);
      this.shadowRoot.querySelectorAll('#opposingPartySection input[type="radio"]').forEach(rb => rb.checked = false);
      // Clear attachment previews
      ["dateFilledPreview","dateDecidedPreview","mrDateReceivedPreview",
       "mrDateResolutionPreview","dateOfAppealPreview","dateOfFinalityPreview"]
        .forEach(id => {
          const el = this.shadowRoot.getElementById(id);
          if (el) el.innerHTML = "";
        });
      await this.loadCases();
      await this.loadCabinets();
      window.dispatchEvent(new CustomEvent('cases-changed'));
      this._showNotification("Case added successfully.");
    } catch (err) {
      this._hideLoading();
      console.error("Add failed:", err);
      // Show a specific message so it's clear whether Cloudinary or Firestore failed
      const isCloudinary = err.message?.startsWith("Cloudinary:");
      this._showNotification(
        isCloudinary
          ? `File upload failed: ${err.message.replace("Cloudinary: ", "")}. Check your upload preset in Cloudinary.`
          : `Failed to save case: ${err.message || "Unknown error"}`
      );
    }
  }

  async loadCases() {
    const body = this.shadowRoot.getElementById("caseTableBody");
      body.innerHTML = `<tr><td colspan="14" class="loading">Loading cases...</td></tr>`;

    const snap = await getDocs(collection(db, "cases"));

    // Store all cases for filtering
    this.allCases = [];
    snap.forEach(d => {
      this.allCases.push({
        id: d.id,
        data: d.data()
      });
    });

    // Apply current search filter if any
    const searchInput = this.shadowRoot.getElementById("searchInput");
    const searchTerm = searchInput ? searchInput.value : "";
    this._renderCases(this.allCases, searchTerm);

    // Re-check duplicate case number against freshly loaded data
    const caseNoInput = this.shadowRoot.getElementById("caseNo");
    if (caseNoInput) {
      this._checkCaseNoDuplicate(caseNoInput.value);
    }
  }

  filterCases(searchTerm) {
    // Update clear button visibility
    const searchClear = this.shadowRoot.getElementById("searchClear");
    if (searchClear) {
      if (searchTerm.trim()) {
        searchClear.classList.add("visible");
      } else {
        searchClear.classList.remove("visible");
      }
    }

    // Reset to first page when filtering
    this.currentPage = 1;
    this._renderCases(this.allCases, searchTerm);
  }

  _checkCaseNoDuplicate(caseNo) {
    const errorEl = this.shadowRoot.getElementById("caseNoError");
    if (!errorEl) return false;

    const value = (caseNo || "").trim();
    if (!value) {
      errorEl.textContent = "";
      return false;
    }

    const isDuplicate = this.allCases.some(({ data }) =>
      (data.caseNo || "").toLowerCase() === value.toLowerCase()
    );

    errorEl.textContent = isDuplicate ? "This Case Number already exists." : "";
    return isDuplicate;
  }

  formatPartyDisplay(party) {
    if (!party || !party.name) return "-";
    // Handle both new format (role) and old format (roles array) for backward compatibility
    let role = "";
    if (party.role) {
      role = ` (${party.role})`;
    } else if (party.roles && Array.isArray(party.roles) && party.roles.length > 0) {
      role = ` (${party.roles[0]})`; // Use first role for backward compatibility
    }
    return `${party.name}${role}`;
  }

  /**
   * Formats a YYYY-MM-DD date string as MM/DD/YYYY.
   * Returns "-" for empty/invalid values.
   */
  _fmtDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  }

  _renderCases(cases, searchTerm = "") {
    const body = this.shadowRoot.getElementById("caseTableBody");
    if (!body) return;

    // Sort cases first
    let sortedCases = this.sortCases(cases);

    // Filter cases if search term exists
    let filteredCases = sortedCases;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const col  = this.searchColumn || "all";

      const formatDateQueryValue = (dateValue) => {
        if (!dateValue) return "";
        const formatted = this._fmtDate(dateValue);
        if (formatted === "-") return dateValue;
        const hyphenated = formatted.replace(/\//g, "-");
        return `${dateValue} ${formatted} ${hyphenated}`;
      };

      filteredCases = sortedCases.filter(({ data: c }) => {
        // Map column key → value extractor
        const fieldMap = {
          caseNo:          c.caseNo || "",
          nature:          c.nature || "",
          taxDec:          c.taxDec || "",
          belongingParty:  c.belongingParty?.name || "",
          opposingParty:   c.opposingParty?.name  || "",
          location:        c.location || "",
          dateFilled:      formatDateQueryValue(c.dateFilled),
          dateDecided:     formatDateQueryValue(c.dateDecided),
          mrDateReceived:  formatDateQueryValue(c.mrDateReceived),
          mrDateResolution:formatDateQueryValue(c.mrDateResolution),
          dateOfAppeal:    formatDateQueryValue(c.dateOfAppeal),
          dateOfFinality:  formatDateQueryValue(c.dateOfFinality),
          winningParty:    c.winningParty || "",
          createdBy:       c.createdBy || c.createdByEmail || "",
          updatedBy:       c.updatedBy || c.updatedByEmail || "",
        };

        if (col === "all") {
          return Object.values(fieldMap).some(v => v.toLowerCase().includes(term));
        }
        return (fieldMap[col] || "").toLowerCase().includes(term);
      });
    }

    const totalCases = filteredCases.length;
    const totalPages = Math.max(1, Math.ceil(totalCases / this.itemsPerPage));
    
    // Ensure current page is valid
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    if (totalCases === 0) {
      const col = this.searchColumn || "all";
      const colLabel = col === "all" ? "any field" : 
        this.shadowRoot.querySelector(`.filter-chip[data-col="${col}"]`)?.textContent?.trim() || col;
      const emptyMessage = searchTerm.trim() 
        ? `No cases found matching "${searchTerm}" in <strong>${colLabel}</strong>`
        : "No cases";
      body.innerHTML = `<tr><td colspan="17" class="empty">${emptyMessage}</td></tr>`;
      this._renderPagination(0, 0, 0);
      return;
    }

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, totalCases);
    const paginatedCases = filteredCases.slice(startIndex, endIndex);

    body.innerHTML = "";

    paginatedCases.forEach(({ id, data: c }) => {
      const row = document.createElement("tr");
      
      row.innerHTML = `
        <td>${c.caseNo || ""}</td>
        <td>${c.nature || ""}</td>
        <td>${c.taxDec || "-"}</td>
        <td>${this.formatPartyDisplay(c.belongingParty || {})}</td>
        <td>${this.formatPartyDisplay(c.opposingParty || {})}</td>
        <td>${c.location || "-"}</td>
        <td>${this._fmtDate(c.dateFilled)}</td>
        <td>${this._fmtDate(c.dateDecided)}</td>
        <td>${this._fmtDate(c.mrDateReceived)}</td>
        <td>${this._fmtDate(c.mrDateResolution)}</td>
        <td>${this._fmtDate(c.dateOfAppeal)}</td>
        <td>${this._fmtDate(c.dateOfFinality)}</td>
        <td>${c.winningParty || "-"}</td>
        <td><span class="status ${c.status || ""}">${c.status || ""}</span></td>
        <td>${c.createdBy || '-'}</td>
        <td>${c.updatedBy || '-'}</td>
        <td class="actions">
          <button class="edit-btn">Edit</button>
        </td>
      `;

      // Add tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "row-tooltip";
      tooltip.textContent = "Double click to view the case";
      row.appendChild(tooltip);

      row.querySelector(".edit-btn").onclick = () => this.editCase(c, id);
      row.addEventListener("dblclick", () => this.showCaseDetails(c));

      body.appendChild(row);
    });

    // Render pagination controls
    this._renderPagination(startIndex + 1, endIndex, totalCases, totalPages);
  }

  _renderPagination(start, end, total, totalPages = 1) {
    const container = this.shadowRoot.getElementById("paginationContainer");
    const info = this.shadowRoot.getElementById("paginationInfo");
    const controls = this.shadowRoot.getElementById("paginationControls");
    
    if (!container || !info || !controls) return;

    if (total === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    info.textContent = `Showing ${start}-${end} of ${total}`;

    // Clear previous controls
    controls.innerHTML = "";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
        // Scroll to top of table
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    controls.appendChild(prevBtn);

    // Page number buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.className = "pagination-btn";
      firstBtn.textContent = "1";
      firstBtn.addEventListener("click", () => {
        this.currentPage = 1;
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
        // Scroll to top of table
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      controls.appendChild(firstBtn);

      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.style.padding = "0 8px";
        ellipsis.style.color = "#666";
        controls.appendChild(ellipsis);
      }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn ${i === this.currentPage ? "active" : ""}`;
      pageBtn.textContent = i.toString();
      if (i !== this.currentPage) {
        pageBtn.addEventListener("click", () => {
          this.currentPage = i;
          const searchInput = this.shadowRoot.getElementById("searchInput");
          const searchTerm = searchInput ? searchInput.value : "";
          this._renderCases(this.allCases, searchTerm);
          const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
          if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      controls.appendChild(pageBtn);
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.style.padding = "0 8px";
        ellipsis.style.color = "#666";
        controls.appendChild(ellipsis);
      }

      const lastBtn = document.createElement("button");
      lastBtn.className = "pagination-btn";
      lastBtn.textContent = totalPages.toString();
      lastBtn.addEventListener("click", () => {
        this.currentPage = totalPages;
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      controls.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = this.currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (this.currentPage < totalPages) {
        this.currentPage++;
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    controls.appendChild(nextBtn);
  }

  editCase(c, id) {

    // Handle backward compatibility - if roles array exists, use first role
    const belongingParty = c.belongingParty ? {
      name: c.belongingParty.name || "",
      role: c.belongingParty.role || (c.belongingParty.roles && c.belongingParty.roles.length > 0 ? c.belongingParty.roles[0] : null)
    } : {};
    const opposingParty = c.opposingParty ? {
      name: c.opposingParty.name || "",
      role: c.opposingParty.role || (c.opposingParty.roles && c.opposingParty.roles.length > 0 ? c.opposingParty.roles[0] : null)
    } : {};

    this.shadowRoot.getElementById("modalBody").innerHTML = `
      <div class="field">
        <label for="eCaseNo">Case Number</label>
        <input id="eCaseNo" value="${c.caseNo || ""}" disabled style="opacity:0.6;cursor:not-allowed;" />
      </div>
      <div class="field">
        <label for="eNature">Nature of the Case</label>
        <textarea id="eNature" required>${c.nature || ""}</textarea>
      </div>
      <div class="field">
        <label for="eTaxDec">Title / Tax Declaration</label>
        <input id="eTaxDec" value="${c.taxDec || ""}" />
      </div>
      <div class="parties-container">
        <div class="party-section" id="eBelongingPartySection">
          <div class="party-header">
            <span class="party-icon">👤</span>
            <label>Belonging / Filing Party</label>
          </div>
          <input 
            type="text" 
            class="party-name-input" 
            id="eBelongingPartyName" 
            placeholder="Enter party name"
            value="${belongingParty.name || ""}"
          />
          <div class="party-roles">
            <div class="role-checkbox-group">
              <input type="radio" id="eBelongingPetitioner" name="eBelongingPartyRole" value="Petitioner" ${belongingParty.role === "Petitioner" ? "checked" : ""} />
              <label for="eBelongingPetitioner">Petitioner</label>
            </div>
            <div class="role-checkbox-group">
              <input type="radio" id="eBelongingComplainant" name="eBelongingPartyRole" value="Complainant" ${belongingParty.role === "Complainant" ? "checked" : ""} />
              <label for="eBelongingComplainant">Complainant</label>
            </div>
            <div class="role-checkbox-group">
              <input type="radio" id="eBelongingPlaintiff" name="eBelongingPartyRole" value="Plaintiff" ${belongingParty.role === "Plaintiff" ? "checked" : ""} />
              <label for="eBelongingPlaintiff">Plaintiff</label>
            </div>
          </div>
        </div>

        <div class="party-section" id="eOpposingPartySection">
          <div class="party-header">
            <span class="party-icon">⚖️</span>
            <label>Opposing / Defending Party</label>
          </div>
          <input 
            type="text" 
            class="party-name-input" 
            id="eOpposingPartyName" 
            placeholder="Enter party name"
            value="${opposingParty.name || ""}"
          />
          <div class="party-roles">
            <div class="role-checkbox-group">
              <input type="radio" id="eOpposingRespondent" name="eOpposingPartyRole" value="Respondent" ${opposingParty.role === "Respondent" ? "checked" : ""} />
              <label for="eOpposingRespondent">Respondent</label>
            </div>
            <div class="role-checkbox-group">
              <input type="radio" id="eOpposingDefendant" name="eOpposingPartyRole" value="Defendant" ${opposingParty.role === "Defendant" ? "checked" : ""} />
              <label for="eOpposingDefendant">Defendant</label>
            </div>
            <div class="role-checkbox-group">
              <input type="radio" id="eOpposingLandowner" name="eOpposingPartyRole" value="Landowner" ${opposingParty.role === "Landowner" ? "checked" : ""} />
              <label for="eOpposingLandowner">Landowner</label>
            </div>
          </div>
        </div>
      </div>
      <div class="field">
        <label for="eLocation">Location</label>
        <div class="location-wrap">
          <input id="eLocationInput" value="${c.location || ""}" placeholder="Type to search location..." autocomplete="off" />
          <div class="location-dropdown" id="eLocationDropdown"></div>
        </div>
        <button type="button" class="location-map-btn" id="eLocationMapBtn" ${c.location ? "" : "disabled"}>📍 View on Map</button>
      </div>

      <div class="field">
        <label for="eDateFilled">Date Filled</label>
        <input type="date" id="eDateFilled" value="${c.dateFilled || ""}" required />
        <div class="attachment-wrap">
          <label class="attachment-label">
            📎 Attach file
            <input type="file" id="eDateFilledFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
          </label>
          <div class="attachment-preview" id="eDateFilledPreview"></div>
          ${this._renderExistingAttachments(c.dateFilledAttachments)}
        </div>
      </div>

      <div class="field">
        <label for="eDateDecided">Date of Decision</label>
        <input type="date" id="eDateDecided" value="${c.dateDecided || ""}" />
        <div class="attachment-wrap">
          <label class="attachment-label">
            📎 Attach file
            <input type="file" id="eDateDecidedFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
          </label>
          <div class="attachment-preview" id="eDateDecidedPreview"></div>
          ${this._renderExistingAttachments(c.dateDecidedAttachments)}
        </div>
      </div>

      <div class="field">
        <label for="eMrDateReceived">MR Date Received</label>
        <input type="date" id="eMrDateReceived" value="${c.mrDateReceived || ""}" />
        <div class="attachment-wrap">
          <label class="attachment-label">
            📎 Attach file
            <input type="file" id="eMrDateReceivedFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
          </label>
          <div class="attachment-preview" id="eMrDateReceivedPreview"></div>
          ${this._renderExistingAttachments(c.mrDateReceivedAttachments)}
        </div>
      </div>

      <div class="field">
        <label for="eMrDateResolution">MR Date Resolution</label>
        <input type="date" id="eMrDateResolution" value="${c.mrDateResolution || ""}" />
        <div class="attachment-wrap">
          <label class="attachment-label">
            📎 Attach file
            <input type="file" id="eMrDateResolutionFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
          </label>
          <div class="attachment-preview" id="eMrDateResolutionPreview"></div>
          ${this._renderExistingAttachments(c.mrDateResolutionAttachments)}
        </div>
      </div>

      <div class="field">
        <label for="eDateOfAppeal">Date of Appeal</label>
        <input type="date" id="eDateOfAppeal" value="${c.dateOfAppeal || ""}" />
        <div class="attachment-wrap">
          <label class="attachment-label">
            📎 Attach file
            <input type="file" id="eDateOfAppealFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
          </label>
          <div class="attachment-preview" id="eDateOfAppealPreview"></div>
          ${this._renderExistingAttachments(c.dateOfAppealAttachments)}
        </div>
      </div>
      
      <div class="field">
        <label for="eDateOfFinality">Date of Finality/Entry of Judgment</label>
        <input type="date" id="eDateOfFinality" value="${c.dateOfFinality || ""}" />
        <div class="attachment-wrap">
          <label class="attachment-label">
            📎 Attach file
            <input type="file" id="eDateOfFinalityFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
          </label>
          <div class="attachment-preview" id="eDateOfFinalityPreview"></div>
          ${this._renderExistingAttachments(c.dateOfFinalityAttachments)}
        </div>
      </div>

      <div class="field">
        <label for="eWinningParty">Winning Party</label>
        <input id="eWinningParty" value="${c.winningParty || ""}" />
      </div>

      <div class="field">
        <label for="eCabinetNo">Cabinet No</label>
        <select id="eCabinetNo">
          <option value="">— Select Cabinet —</option>
        </select>
      </div>

      <div class="field">
        <label for="eDrawerNo">Drawer No</label>
        <select id="eDrawerNo" disabled>
          <option value="">— Select Drawer —</option>
        </select>
        <div id="eDrawerCapacityHint" class="field-hint" style="display:none;"></div>
      </div>
      
      <div class="field">
        <label for="eStatus">Status</label>
        <select id="eStatus" disabled>
          <option value="Pending" ${c.status==="Pending"?"selected":""}>Pending</option>
          <option value="Resolved" ${c.status==="Resolved"?"selected":""}>Resolved</option>
          <option value="Closed" ${c.status==="Closed"?"selected":""}>Closed</option>
        </select>
      </div>
    `;
    
    // ===============================
    // AUTO STATUS (EDIT MODAL ONLY)
    // ===============================

    // Populate cabinet/drawer selects with existing values
    this._populateEditCabinetDrawer(c.cabinetId || "", c.drawerId || "");

    const eStatus = this.shadowRoot.getElementById("eStatus");
    const eDateOfFinality = this.shadowRoot.getElementById("eDateOfFinality");
    const eDateDecided = this.shadowRoot.getElementById("eDateDecided");
    const eWinningParty = this.shadowRoot.getElementById("eWinningParty");

    eDateDecided.required = true; // Ensure Date of Decision is always required in edit modal

    const fields = {
      caseNo: this.shadowRoot.getElementById("eCaseNo"),
      nature: this.shadowRoot.getElementById("eNature"),
      dateFiled: this.shadowRoot.getElementById("eDateFilled"),
      dateOfAppeal: this.shadowRoot.getElementById("eDateOfAppeal"),
      dateDecided: this.shadowRoot.getElementById("eDateDecided"),
      mrDateReceived: this.shadowRoot.getElementById("eMrDateReceived"),
      mrDateResolution: this.shadowRoot.getElementById("eMrDateResolution"),
      dateOfFinality: this.shadowRoot.getElementById("eDateOfFinality")
    };

    const hasValue = (input) =>
      input && input.value && input.value.trim() !== "";

    const updateStatusUI = () => {
      // Basic fields for Pending status
      const hasBasicFields =
        hasValue(fields.caseNo) &&
        hasValue(fields.nature) &&
        hasValue(fields.dateFiled) &&
        hasValue(fields.dateOfAppeal);

      // Additional fields for Resolved status
      const hasResolvedFields =
        hasBasicFields &&
        hasValue(fields.dateDecided) &&
        hasValue(fields.mrDateReceived) &&
        hasValue(fields.mrDateResolution);

      // Additional field for Closed status
      const hasClosedFields =
        hasResolvedFields &&
        hasValue(fields.dateOfFinality);

      // Determine status based on completed fields
      if (hasClosedFields) {
        eStatus.value = "Closed";
        eDateOfFinality.disabled = false;
        eDateOfFinality.style.opacity = "1";
        eDateOfFinality.style.cursor = "text";
        eWinningParty.disabled = false;
        eWinningParty.style.opacity = "1";
        eWinningParty.style.cursor = "text";

      } else if (hasResolvedFields) {
        eStatus.value = "Resolved";
        eDateOfFinality.disabled = false;
        eDateOfFinality.style.opacity = "1";
        eDateOfFinality.style.cursor = "text";
        eWinningParty.disabled = false;
        eWinningParty.style.opacity = "1";
        eWinningParty.style.cursor = "text";
      } else {
        // Default to Pending if only basic fields or less
        eStatus.value = "Pending";
        eDateOfFinality.disabled = true;
        eDateOfFinality.style.opacity = "0.5";
        eDateOfFinality.style.cursor = "not-allowed";
        eWinningParty.disabled = true;
        eWinningParty.style.opacity = "0.5";
        eWinningParty.style.cursor = "not-allowed";
      }
    };

    // Run immediately when modal opens
    updateStatusUI();

    // Recalculate whenever any field changes
    Object.values(fields).forEach(input => {
      if (input) {
        input.addEventListener("input", updateStatusUI);
        input.addEventListener("change", updateStatusUI);
      }
    });
        


    // Add interactive focus effects for edit modal
    const eBelongingInput = this.shadowRoot.getElementById("eBelongingPartyName");
    const eOpposingInput = this.shadowRoot.getElementById("eOpposingPartyName");
    const eBelongingSection = this.shadowRoot.getElementById("eBelongingPartySection");
    const eOpposingSection = this.shadowRoot.getElementById("eOpposingPartySection");

    // Init location autocomplete for edit modal
    this._initLocationAutocomplete(
      this.shadowRoot.getElementById("eLocationInput"),
      this.shadowRoot.getElementById("eLocationDropdown")
    );

    // Edit modal location map button
    const eLocationInput  = this.shadowRoot.getElementById("eLocationInput");
    const eLocationMapBtn = this.shadowRoot.getElementById("eLocationMapBtn");
    if (eLocationInput && eLocationMapBtn) {
      eLocationInput.addEventListener("input", () => {
        eLocationMapBtn.disabled = !eLocationInput.value.trim();
      });
      eLocationMapBtn.addEventListener("click", () => {
        const loc = eLocationInput.value.trim();
        if (loc) this._openMapModal(loc);
      });
    }

    // Attachment file preview listeners (edit modal)
    const editAttachmentFields = [
      { fileId: "eDateFilledFile",       previewId: "eDateFilledPreview" },
      { fileId: "eDateDecidedFile",      previewId: "eDateDecidedPreview" },
      { fileId: "eMrDateReceivedFile",   previewId: "eMrDateReceivedPreview" },
      { fileId: "eMrDateResolutionFile", previewId: "eMrDateResolutionPreview" },
      { fileId: "eDateOfAppealFile",     previewId: "eDateOfAppealPreview" },
      { fileId: "eDateOfFinalityFile",   previewId: "eDateOfFinalityPreview" },
    ];
    editAttachmentFields.forEach(({ fileId, previewId }) => {
      const fileInput = this.shadowRoot.getElementById(fileId);
      const preview   = this.shadowRoot.getElementById(previewId);
      if (fileInput && preview) {
        fileInput.addEventListener("change", () => {
          this._renderFilePreview(fileInput, preview);
        });
      }
    });

    if (eBelongingInput && eBelongingSection) {
      eBelongingInput.addEventListener("focus", () => eBelongingSection.classList.add("active"));
      eBelongingInput.addEventListener("blur", () => eBelongingSection.classList.remove("active"));
    }
    if (eOpposingInput && eOpposingSection) {
      eOpposingInput.addEventListener("focus", () => eOpposingSection.classList.add("active"));
      eOpposingInput.addEventListener("blur", () => eOpposingSection.classList.remove("active"));
    }

    this.shadowRoot.getElementById("modal").style.display = "flex";

    this.shadowRoot.getElementById("saveEditBtn").onclick = async () => {
      try {
        const currentUser = (auth && auth.currentUser) ? auth.currentUser : null;
        
        const newCaseNo = this.shadowRoot.getElementById("eCaseNo").value;
        if (!newCaseNo) {
          this._showNotification("Case Number is required.");
          return;
        }

        // Check for duplicate case number (excluding current case)
        const duplicate = this.allCases.some(c => c.id !== id && c.data.caseNo === newCaseNo);
        if (duplicate) {
          this._showNotification("Case with this Case Number already exists.");
          return;
        }
        
        const belongingPartyName = this.shadowRoot.getElementById("eBelongingPartyName").value.trim();
        const opposingPartyName = this.shadowRoot.getElementById("eOpposingPartyName").value.trim();
        
        const belongingRole = this.shadowRoot.querySelector('input[name="eBelongingPartyRole"]:checked')?.value || null;
        const opposingRole = this.shadowRoot.querySelector('input[name="eOpposingPartyRole"]:checked')?.value || null;

        const belongingParty = belongingPartyName ? { name: belongingPartyName, role: belongingRole } : null;
        const opposingParty = opposingPartyName ? { name: opposingPartyName, role: opposingRole } : null;

        // Upload any new attachments and merge with existing ones
        const mergeAttachments = (existing, newUploads) => {
          const base = Array.isArray(existing) ? existing : [];
          return [...base, ...newUploads];
        };

        this._showLoading("Uploading attachments...");

        const [
          newDateFilledAtt,
          newDateDecidedAtt,
          newMrDateReceivedAtt,
          newMrDateResolutionAtt,
          newDateOfAppealAtt,
          newDateOfFinalityAtt,
        ] = await Promise.all([
          this._uploadAttachments(this.shadowRoot.getElementById("eDateFilledFile"),       newCaseNo, "dateFilled"),
          this._uploadAttachments(this.shadowRoot.getElementById("eDateDecidedFile"),      newCaseNo, "dateDecided"),
          this._uploadAttachments(this.shadowRoot.getElementById("eMrDateReceivedFile"),   newCaseNo, "mrDateReceived"),
          this._uploadAttachments(this.shadowRoot.getElementById("eMrDateResolutionFile"), newCaseNo, "mrDateResolution"),
          this._uploadAttachments(this.shadowRoot.getElementById("eDateOfAppealFile"),     newCaseNo, "dateOfAppeal"),
          this._uploadAttachments(this.shadowRoot.getElementById("eDateOfFinalityFile"),   newCaseNo, "dateOfFinality"),
        ]);

        // Find the existing case data for merging
        const existingCase = this.allCases.find(x => x.id === id)?.data || {};

        this._showLoading("Saving changes...");
        await updateDoc(doc(db, "cases", id), {
          caseNo: this.shadowRoot.getElementById("eCaseNo").value,
          nature: this.shadowRoot.getElementById("eNature").value,
          taxDec: this.shadowRoot.getElementById("eTaxDec").value,
          belongingParty,
          opposingParty,
          location: this.shadowRoot.getElementById("eLocationInput").value,
          dateFilled: this.shadowRoot.getElementById("eDateFilled").value,
          mrDateReceived: this.shadowRoot.getElementById("eMrDateReceived").value,
          mrDateResolution: this.shadowRoot.getElementById("eMrDateResolution").value,
          dateOfAppeal: this.shadowRoot.getElementById("eDateOfAppeal").value,
          winningParty: this.shadowRoot.getElementById("eWinningParty").value,
          dateOfFinality: this.shadowRoot.getElementById("eDateOfFinality").value,
          dateDecided: this.shadowRoot.getElementById("eDateDecided").value,
          status: this.shadowRoot.getElementById("eStatus").value,
          cabinetId:   this.shadowRoot.getElementById("eCabinetNo")?.value || "",
          cabinetName: (() => {
            const cid = this.shadowRoot.getElementById("eCabinetNo")?.value || "";
            return (this._cabinets || []).find(c => c.id === cid)?.data?.name || "";
          })(),
          drawerId:    this.shadowRoot.getElementById("eDrawerNo")?.value || "",
          drawerLabel: (() => {
            const did = this.shadowRoot.getElementById("eDrawerNo")?.value || "";
            return Object.values(this._drawersByCabinet || {}).flat()
              .find(d => d.id === did)?.data?.label || "";
          })(),
          dateFilledAttachments:       mergeAttachments(existingCase.dateFilledAttachments,       newDateFilledAtt),
          dateDecidedAttachments:      mergeAttachments(existingCase.dateDecidedAttachments,      newDateDecidedAtt),
          mrDateReceivedAttachments:   mergeAttachments(existingCase.mrDateReceivedAttachments,   newMrDateReceivedAtt),
          mrDateResolutionAttachments: mergeAttachments(existingCase.mrDateResolutionAttachments, newMrDateResolutionAtt),
          dateOfAppealAttachments:     mergeAttachments(existingCase.dateOfAppealAttachments,     newDateOfAppealAtt),
          dateOfFinalityAttachments:   mergeAttachments(existingCase.dateOfFinalityAttachments,   newDateOfFinalityAtt),
          updatedBy: currentUser ? currentUser.email : null,
          updatedByUid: currentUser ? currentUser.uid : null,
          updatedAt: serverTimestamp()
        });
        this._hideLoading();
        this.closeModal();
        await this.loadCases();
        await this.loadCabinets();
        window.dispatchEvent(new CustomEvent('cases-changed'));
        this._showNotification("Case updated successfully");
      } catch (err) {
        this._hideLoading();
        console.error("Update failed:", err);
        const isCloudinary = err.message?.startsWith("Cloudinary:");
        this._showNotification(
          isCloudinary
            ? `File upload failed: ${err.message.replace("Cloudinary: ", "")}. Check your upload preset in Cloudinary.`
            : `Update failed: ${err.message || "Unknown error"}`
        );
      } finally {
        this.shadowRoot.getElementById("saveEditBtn").onclick = null;
      }
    };

    // Ensure modal is scrollable and properly sized
    const modal = this.shadowRoot.getElementById("modal");
    const modalContent = this.shadowRoot.querySelector(".modal-content");
    if (modal) {
      modal.style.overflowY = "auto";
      modal.style.alignItems = "flex-start";
      modal.style.paddingTop = "20px";
      modal.style.paddingBottom = "20px";
    }
    if (modalContent) {
      modalContent.style.maxHeight = "90vh";
      modalContent.style.overflowY = "auto";
    }

    // Adjust the width of eBelongingPartyName and eOpposingPartyName inputs
    if (eBelongingInput) {
      eBelongingInput.style.width = "90%";
    }
    if (eOpposingInput) {
      eOpposingInput.style.width = "90%";
    }
  }


  _initLocationAutocomplete(input, dropdown) {
    if (!input || !dropdown) return;

    const LOCATIONS = [
      "Masbate City","Aroroy","Baleno","Balud","Batuan","Cataingan",
      "Cawayan","Claveria","Dimasalang","Esperanza","Mandaon","Milagros",
      "Mobo","Monreal","Placer","Pio V. Corpuz","Palanas","San Fernando",
      "San Jacinto","San Pascual","Uson"
    ];

    let activeIdx = -1;

    const show = (items, term) => {
      activeIdx = -1;
      if (!items.length) {
        dropdown.innerHTML = `<div class="loc-empty">No matches found</div>`;
      } else {
        dropdown.innerHTML = items.map((loc, i) => {
          const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
          const highlighted = term ? loc.replace(re, "<mark>$1</mark>") : loc;
          return `<div class="loc-opt" data-idx="${i}" data-val="${loc}">${highlighted}</div>`;
        }).join("");
        dropdown.querySelectorAll(".loc-opt").forEach(opt => {
          opt.addEventListener("mousedown", e => {
            e.preventDefault();
            input.value = opt.dataset.val;
            dropdown.classList.remove("open");
          });
        });
      }
      dropdown.classList.add("open");
    };

    const close = () => { dropdown.classList.remove("open"); activeIdx = -1; };

    input.addEventListener("input", () => {
      const term = input.value.trim();
      if (!term) { close(); return; }
      const matches = LOCATIONS.filter(l => l.toLowerCase().includes(term.toLowerCase()));
      show(matches, term);
    });

    input.addEventListener("focus", () => {
      const term = input.value.trim();
      const matches = term
        ? LOCATIONS.filter(l => l.toLowerCase().includes(term.toLowerCase()))
        : LOCATIONS;
      show(matches, term);
    });

    input.addEventListener("keydown", e => {
      const opts = [...dropdown.querySelectorAll(".loc-opt")];
      if (!opts.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, opts.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
      } else if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        input.value = opts[activeIdx].dataset.val;
        close();
        return;
      } else if (e.key === "Escape") {
        close(); return;
      }
      opts.forEach((o, i) => o.classList.toggle("active", i === activeIdx));
      if (activeIdx >= 0) opts[activeIdx].scrollIntoView({ block: "nearest" });
    });

    document.addEventListener("click", e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) close();
    });
  }

  closeModal() {
    const m = this.shadowRoot.getElementById("modal");
    if (m) m.style.display = "none";
  }

  showCaseDetails(caseData) {
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    const modalCaseNo = this.shadowRoot.getElementById("detailsModalCaseNo");
    const modalBody = this.shadowRoot.getElementById("detailsModalBody");

    if (!modal || !modalBody) return;

    // Set header
    modalCaseNo.textContent = `Case #${caseData.caseNo || "N/A"}`;

    // Helper: render attachment cards with a View button
    const renderAttachmentCards = (attachments) => {
      if (!Array.isArray(attachments) || !attachments.length) return "";

      const cards = attachments.map(a => {
        const ext     = (a.name || "").split(".").pop().toLowerCase();
        const isImage = ["jpg","jpeg","png","gif","webp","svg"].includes(ext);
        const isPdf   = ext === "pdf";
        const isDoc   = ["doc","docx"].includes(ext);

        let icon = "📄";
        if (isPdf)   icon = "📕";
        if (isDoc)   icon = "📘";

        const preview = isImage
          ? `<img src="${a.url}" alt="${a.name}" loading="lazy" />`
          : `<span class="attach-icon">${icon}</span>`;

        // Encode url/name safely for data attributes
        const safeUrl  = encodeURIComponent(a.url);
        const safeName = encodeURIComponent(a.name);

        return `
          <div class="attach-card">
            ${preview}
            <span class="attach-name" title="${a.name}">${a.name}</span>
            <span class="attach-type">${ext}</span>
            <button
              class="attach-view-btn"
              data-url="${safeUrl}"
              data-name="${safeName}"
              data-ext="${ext}"
              type="button"
            >👁 View</button>
          </div>`;
      }).join("");

      return `<div class="detail-attachments">${cards}</div>`;
    };

    // Create detail fields
    const details = [
      { label: "Case No",           value: caseData.caseNo   || "N/A" },
      { label: "Nature of the Case",value: caseData.nature   || "N/A", fullWidth: true },
      { label: "Title / Tax Dec",   value: caseData.taxDec   || "N/A" },
      {
        label: "Belonging / Filing Party",
        value: caseData.belongingParty
          ? `${caseData.belongingParty.name} (${caseData.belongingParty.role || caseData.belongingParty.roles?.join(", ") || "N/A"})`
          : "N/A",
        fullWidth: true
      },
      {
        label: "Opposing / Defending Party",
        value: caseData.opposingParty
          ? `${caseData.opposingParty.name} (${caseData.opposingParty.role || caseData.opposingParty.roles?.join(", ") || "N/A"})`
          : "N/A",
        fullWidth: true
      },
      { label: "Location",          value: caseData.location || "N/A", isLocation: true },
      { label: "Date Filed",        value: this._fmtDate(caseData.dateFilled || caseData.dateFiled), attachments: caseData.dateFilledAttachments },
      { label: "Date of Decision",  value: this._fmtDate(caseData.dateDecided),      attachments: caseData.dateDecidedAttachments },
      { label: "MR Date Received",  value: this._fmtDate(caseData.mrDateReceived),   attachments: caseData.mrDateReceivedAttachments },
      { label: "MR Date Resolution",value: this._fmtDate(caseData.mrDateResolution), attachments: caseData.mrDateResolutionAttachments },
      { label: "Date of Appeal",    value: this._fmtDate(caseData.dateOfAppeal),     attachments: caseData.dateOfAppealAttachments },
      { label: "Date of Finality",  value: this._fmtDate(caseData.dateOfFinality),   attachments: caseData.dateOfFinalityAttachments },
      { label: "Winning Party",     value: caseData.winningParty || "N/A" },
      { label: "Status",            value: caseData.status   || "N/A" },
      { label: "Created By",        value: caseData.createdBy || caseData.createdByEmail || "N/A" },
      { label: "Updated By",        value: caseData.updatedBy || caseData.updatedByEmail || "N/A" },
    ];

    // Populate modal body
    modalBody.innerHTML = details.map(detail => `
      <div class="detail-group ${detail.fullWidth ? "detail-full-width" : ""}">
        <div class="detail-label">${detail.label}</div>
        <div class="detail-value">
          ${detail.value}
          ${detail.isLocation && detail.value !== "N/A"
            ? `<br><button class="location-map-btn detail-map-btn" data-loc="${detail.value}" type="button">📍 View on Map</button>`
            : ""}
          ${detail.attachments ? renderAttachmentCards(detail.attachments) : ""}
        </div>
      </div>
    `).join("");

    // Delegate button clicks inside the modal body
    modalBody.addEventListener("click", (e) => {
      // Attachment view button
      const attachBtn = e.target.closest(".attach-view-btn");
      if (attachBtn) {
        const url  = decodeURIComponent(attachBtn.dataset.url);
        const name = decodeURIComponent(attachBtn.dataset.name);
        const ext  = attachBtn.dataset.ext;
        this._openFileViewer(url, name, ext);
        return;
      }
      // Map button inside details modal
      const mapBtn = e.target.closest(".detail-map-btn");
      if (mapBtn) {
        this._openMapModal(mapBtn.dataset.loc);
      }
    });

    // Show modal
    modal.classList.add("active");
  }

  closeDetailsModal() {
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  _openFileViewer(url, name, ext) {
    const modal       = this.shadowRoot.getElementById("fileViewerModal");
    const titleEl     = this.shadowRoot.getElementById("fileViewerTitle");
    const bodyEl      = this.shadowRoot.getElementById("fileViewerBody");
    const openBtn     = this.shadowRoot.getElementById("fileViewerOpenBtn");
    const downloadBtn = this.shadowRoot.getElementById("fileViewerDownloadBtn");
    if (!modal || !bodyEl) return;

    const isImage = ["jpg","jpeg","png","gif","webp","svg"].includes(ext);
    const isPdf   = ext === "pdf";
    const isDoc   = ["doc","docx"].includes(ext);

    // Set header info
    titleEl.textContent = name;
    openBtn.href     = url;
    downloadBtn.href = url;
    downloadBtn.setAttribute("download", name);

    // Build viewer content
    if (isImage) {
      bodyEl.innerHTML = `<img src="${url}" alt="${name}" />`;
    } else if (isPdf) {
      // Embed PDF directly — works in all modern browsers
      bodyEl.innerHTML = `<iframe src="${url}" title="${name}"></iframe>`;
    } else if (isDoc) {
      // Word docs can't be rendered natively; offer Google Docs preview
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      bodyEl.innerHTML = `<iframe src="${googleDocsUrl}" title="${name}"></iframe>`;
    } else {
      // Unsupported type — show download prompt
      bodyEl.innerHTML = `
        <div class="file-viewer-unsupported">
          <div class="unsupported-icon">📄</div>
          <p class="unsupported-name">${name}</p>
          <p>This file type (<strong>.${ext}</strong>) cannot be previewed in the browser.</p>
          <p>Use the <strong>Download</strong> or <strong>Open</strong> buttons above.</p>
        </div>`;
    }

    modal.classList.add("active");
  }

  _closeFileViewer() {
    const modal  = this.shadowRoot.getElementById("fileViewerModal");
    const bodyEl = this.shadowRoot.getElementById("fileViewerBody");
    if (modal)  modal.classList.remove("active");
    // Clear iframe/img to stop any ongoing load
    if (bodyEl) bodyEl.innerHTML = "";
  }

  _showNotification(message = "Done") {
    const modal = this.shadowRoot.getElementById("notificationModal");
    const msg = this.shadowRoot.getElementById("notifyMsg");
    if (!modal || !msg) return;
    msg.textContent = message;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    clearTimeout(this._notificationTimer);
    this._notificationTimer = setTimeout(() => this._hideNotification(), 2500);
  }

  _hideNotification() {
    const modal = this.shadowRoot.getElementById("notificationModal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    clearTimeout(this._notificationTimer);
  }

  _showLoading(text = "Processing...") {
    const modal = this.shadowRoot.getElementById("loadingModal");
    const label = this.shadowRoot.getElementById("loadingText");
    if (!modal) return;
    if (label) label.textContent = text;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }

  _hideLoading() {
    const modal = this.shadowRoot.getElementById("loadingModal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  // ─── Leaflet Map helpers ──────────────────────────────────────────────────

  /**
   * Ensures Leaflet CSS is injected into the shadow root (needed because
   * Shadow DOM isolates stylesheets) and Leaflet JS is loaded globally.
   * Returns a Promise that resolves when both are ready.
   */
  _ensureLeaflet() {
    return new Promise((resolve, reject) => {
      // 1. Inject Leaflet CSS into shadow root if not already present
      const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      if (!this.shadowRoot.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = LEAFLET_CSS;
        this.shadowRoot.appendChild(link);
      }

      // 2. Load Leaflet JS globally if not already loaded
      if (window.L) {
        resolve();
        return;
      }

      const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
      if (existing) {
        // Script tag exists but may still be loading
        existing.addEventListener("load",  resolve);
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = LEAFLET_JS;
      script.onload  = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Opens the map modal and geocodes the given location string using
   * Nominatim (OpenStreetMap), then drops a marker on the result.
   */
  async _openMapModal(locationStr) {
    if (!locationStr) return;

    const modal     = this.shadowRoot.getElementById("caseMapModal");
    const titleEl   = this.shadowRoot.getElementById("caseMapTitle");
    const badgeEl   = this.shadowRoot.getElementById("caseMapBadge");
    const container = this.shadowRoot.getElementById("caseMapContainer");

    if (!modal || !container) return;

    // Update title / badge
    if (titleEl) titleEl.textContent = locationStr;
    if (badgeEl) badgeEl.textContent = locationStr;

    // Show modal first so the container has dimensions
    modal.classList.add("active");

    try {
      await this._ensureLeaflet();
    } catch (err) {
      console.error("Failed to load Leaflet:", err);
      container.innerHTML = `<div style="padding:20px;text-align:center;color:#c00;">
        Failed to load map library. Check your internet connection.
      </div>`;
      return;
    }

    const L = window.L;

    // Destroy previous map instance if any
    if (this._leafletMap) {
      this._leafletMap.remove();
      this._leafletMap = null;
    }

    // Clear container and reset height (Leaflet needs a clean div)
    container.innerHTML = "";
    container.style.height = "420px";

    // Default center: Philippines
    const DEFAULT_LAT = 12.8797;
    const DEFAULT_LNG = 121.7740;
    const DEFAULT_ZOOM = 6;

    // Initialize map
    const map = L.map(container, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });
    this._leafletMap = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Geocode using Nominatim
    const query = encodeURIComponent(`${locationStr}, Masbate, Philippines`);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

    try {
      const res  = await fetch(nominatimUrl, {
        headers: { "Accept-Language": "en" }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latlng = [parseFloat(lat), parseFloat(lon)];

        map.setView(latlng, 13);

        // Custom green marker icon
        const greenIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:32px;height:32px;
            background:#0c6d38;
            border:3px solid white;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
          "></div>`,
          iconSize:   [32, 32],
          iconAnchor: [16, 32],
          popupAnchor:[0, -36],
        });

        L.marker(latlng, { icon: greenIcon })
          .addTo(map)
          .bindPopup(`<strong>${locationStr}</strong><br><small>${display_name}</small>`)
          .openPopup();

        if (badgeEl) badgeEl.textContent = display_name || locationStr;
      } else {
        // Location not found — show Philippines overview with a note
        map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
        container.insertAdjacentHTML("afterend", "");
        if (badgeEl) badgeEl.textContent = `"${locationStr}" — location not found on map`;
      }
    } catch (err) {
      console.warn("Geocoding failed:", err);
      // Still show the map, just without a pin
      map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
      if (badgeEl) badgeEl.textContent = `${locationStr} (geocoding unavailable)`;
    }

    // Force Leaflet to recalculate size after modal is visible
    setTimeout(() => map.invalidateSize(), 100);
  }

  _closeMapModal() {
    const modal = this.shadowRoot.getElementById("caseMapModal");
    if (modal) modal.classList.remove("active");

    // Destroy map to free memory
    if (this._leafletMap) {
      this._leafletMap.remove();
      this._leafletMap = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

}


customElements.define("case-manage", CaseManage);
