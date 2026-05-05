import { db } from "../scripts/firebaseConfig.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

class AdminDashboard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="welcome-section">
        <h1>👋 Welcome, <span id="dashWelcomeName">Admin</span></h1>
        <p>Here's an overview of the cases current status and users.</p>
      </div>
      <div class="admin-stats-grid">
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-users"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatTotalUsers">—</span>
            <span class="stat-label">Total Users</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-users-cog"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatAdmins">—</span>
            <span class="stat-label">Admin Users</span>
          </div>
        </div>
        <div class="stat-card resolved-card">
          <div class="stat-icon"><i class="fas fa-user-tie"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatPersonnel">—</span>
            <span class="stat-label">Personnel</span>
          </div>
        </div>
      </div>

      <div class="admin-stats-grid-row2">
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-folder-open"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatTotalCases">—</span>
            <span class="stat-label">Total Cases</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:#f39c12;"><i class="fas fa-hourglass-half"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatPending">—</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:#0c6d38;"><i class="fas fa-check-circle"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatResolved">—</span>
            <span class="stat-label">Resolved</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:#e74c3c;"><i class="fas fa-times-circle"></i></div>
          <div class="stat-info">
            <span class="stat-number" id="dashStatClosed">—</span>
            <span class="stat-label">Closed</span>
          </div>
        </div>
      </div>

      <style>
        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        .admin-stats-grid-row2 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        .stat-card {
          padding: 14px 16px;
          gap: 12px;
          border-radius: 12px;
        }
        .stat-icon  { font-size: 22px; width: 36px; }
        .stat-number { font-size: 22px; }
        .stat-label  { font-size: 11px; }

        @media(max-width:1100px) {
          .admin-stats-grid      { grid-template-columns: repeat(3, 1fr); }
          .admin-stats-grid-row2 { grid-template-columns: repeat(4, 1fr); }
        }
        @media(max-width:900px) {
          .admin-stats-grid      { grid-template-columns: repeat(2, 1fr); }
          .admin-stats-grid-row2 { grid-template-columns: repeat(2, 1fr); }
        }
        @media(max-width:600px) {
          .admin-stats-grid      { grid-template-columns: repeat(2, 1fr); gap:8px; }
          .admin-stats-grid-row2 { grid-template-columns: repeat(2, 1fr); gap:8px; }
          .stat-card   { padding:10px 12px; gap:8px; }
          .stat-icon   { font-size:18px; width:28px; }
          .stat-number { font-size:18px; }
          .stat-label  { font-size:10px; }
        }
        @media(max-width:380px) {
          .admin-stats-grid      { grid-template-columns: 1fr; }
          .admin-stats-grid-row2 { grid-template-columns: 1fr; }
        }
      </style>
    `;

    this._setupListeners();
  }

  disconnectedCallback() {
    if (this._unsubUsers) this._unsubUsers();
    if (this._unsubCases) this._unsubCases();
  }

  setWelcomeName(name) {
    const el = this.querySelector("#dashWelcomeName");
    if (el) el.textContent = name;
  }

  _setupListeners() {
    // Users — live stat cards
    this._unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const users     = snap.docs.map(d => d.data());
      const admins    = users.filter(u => (u.role || "").toLowerCase() === "admin");
      const personnel = users.filter(u => (u.role || "").toLowerCase() !== "admin");
      this.querySelector("#dashStatTotalUsers").textContent = users.length;
      this.querySelector("#dashStatAdmins").textContent     = admins.length;
      this.querySelector("#dashStatPersonnel").textContent  = personnel.length;
    });

    // Cases — live stat cards
    this._unsubCases = onSnapshot(collection(db, "cases"), (snap) => {
      const cases    = snap.docs.map(d => d.data());
      const pending  = cases.filter(c => (c.status || "").toLowerCase() === "pending").length;
      const resolved = cases.filter(c => (c.status || "").toLowerCase() === "resolved").length;
      const closed   = cases.filter(c => (c.status || "").toLowerCase() === "closed").length;
      this.querySelector("#dashStatTotalCases").textContent = cases.length;
      this.querySelector("#dashStatPending").textContent    = pending;
      this.querySelector("#dashStatResolved").textContent   = resolved;
      this.querySelector("#dashStatClosed").textContent     = closed;
    });
  }
}

customElements.define("admin-dashboard", AdminDashboard);
