import { db } from "../scripts/firebaseConfig.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class DashboardComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.loadCounts();
    // Auto-refresh: listen for custom events from case-manage or view-cases
    window.addEventListener('cases-changed', () => this.loadCounts());
    // Optionally, use polling as a fallback (uncomment if needed)
    // this._dashboardInterval = setInterval(() => this.loadCounts(), 10000);
  }
  disconnectedCallback() {
    window.removeEventListener('cases-changed', () => this.loadCounts());
    // if (this._dashboardInterval) clearInterval(this._dashboardInterval);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: #f4f6f9;
          min-height: 100vh;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .main-content {
          padding: 24px;
          animation: fadeIn 0.6s ease-in-out;
        }

        .content {
          max-width: 1200px;
          margin: auto;
        }

        .welcome-section {
          text-align: center;
          margin-bottom: 32px;
        }
        
        
        
       

        .welcome-section h1 {
          font-size: 2.2rem;
          color: #0c6d38;
          margin-bottom: 8px;
        }

        .welcome-section p {
          color: #555;
          font-size: 1.1rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .card {
          background: #ffffff;
          border-radius: 14px;
          padding: 22px;
          text-align: center;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
          transform: translateY(-6px);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
        }

        .card-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          background: rgba(12, 109, 56, 0.12);
          color: #0c6d38;
        }

        .card h3 {
          font-size: 1.1rem;
          margin-bottom: 6px;
          color: #333;
        }

        .card-number {
          font-size: 2.1rem;
          font-weight: bold;
          color: #0c6d38;
        }

        .progress {
          height: 6px;
          background: #e0e0e0;
          border-radius: 6px;
          overflow: hidden;
          margin-top: 12px;
        }

        .progress span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #0c6d38, #22c55e);
          width: 0%;
          transition: width 600ms ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 600px) {
          .welcome-section h1 {
            font-size: 1.8rem;
          }
        }
        ${darkModeCSS}
      </style>

      <div class="main-content">
        <div class="content">

          <div class="welcome-section">
            <h1>Case Status and Digitalized Records</h1>
            <p>Manage cases, progress, and team activity</p>
          </div>

          <div class="dashboard-grid">

            <div class="card" id="cardTotal" title="Total cases">
              <div class="card-icon">📁</div>
              <h3>Total Cases</h3>
              <div class="card-number" id="totalCount">0</div>
              <div class="progress"><span id="totalProgress" style="width:100%"></span></div>
            </div>

            <div class="card" id="cardPending" title="Pending cases">
              <div class="card-icon">⏳</div>
              <h3>Pending Cases</h3>
              <div class="card-number" id="pendingCount">0</div>
              <div class="progress"><span id="pendingProgress" style="width:0%"></span></div>
            </div>

            <div class="card" id="cardResolved" title="Resolved cases">
              <div class="card-icon">✅</div>
              <h3>Resolved Cases</h3>
              <div class="card-number" id="resolvedCount">0</div>
              <div class="progress"><span id="resolvedProgress" style="width:0%"></span></div>
            </div>

            <div class="card" id="cardClosed" title="Closed cases">
              <div class="card-icon">🔒</div>
              <h3>Closed Cases</h3>
              <div class="card-number" id="closedCount">0</div>
              <div class="progress"><span id="closedProgress" style="width:0%"></span></div>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  async loadCounts() {
    try {
      const casesCol = collection(db, "cases");

      // fetch total and statuses in parallel
      const [allSnap, pendingSnap, resolvedSnap, closedSnap] = await Promise.all([
        getDocs(casesCol),
        getDocs(query(casesCol, where("status", "==", "Pending"))),
        getDocs(query(casesCol, where("status", "==", "Resolved"))),
        getDocs(query(casesCol, where("status", "==", "Closed")))
      ]);

      const total = allSnap.size || 0;
      const pending = pendingSnap.size || 0;
      const resolved = resolvedSnap.size || 0;
      const closed = closedSnap.size || 0;

      // update DOM
      const setText = (id, val) => {
        const el = this.shadowRoot.getElementById(id);
        if (el) el.textContent = String(val);
      };
      setText("totalCount", total);
      setText("pendingCount", pending);
      setText("resolvedCount", resolved);
      setText("closedCount", closed);

      // update progress widths safely (percent of total)
      const percent = (n) => (total === 0 ? 0 : Math.round((n / total) * 100));
      const setWidth = (id, pct) => {
        const el = this.shadowRoot.getElementById(id);
        if (el) el.style.width = pct + "%";
      };
      setWidth("pendingProgress", percent(pending));
      setWidth("resolvedProgress", percent(resolved));
      setWidth("closedProgress", percent(closed));
      // total progress remains full
      setWidth("totalProgress", total > 0 ? 100 : 0);
    } catch (err) {
      console.error("Failed to load dashboard counts:", err);
    }
    // attach click handlers for quick navigation to View Cases
    try {
      const toViewCases = async (status) => {
        // Navigate via the parent personnel-app component
        const personnelApp = document.querySelector("personnel-app");
        const dashboardComponent = personnelApp?.querySelector("#panelDashboard");
        const caseManage         = personnelApp?.querySelector("#panelCaseManage");
        const viewCasesComponent = personnelApp?.querySelector("#panelViewCases");
        const profileComponent   = personnelApp?.querySelector("#panelProfile");

        if (viewCasesComponent) viewCasesComponent.classList.remove("hidden");
        if (dashboardComponent) dashboardComponent.classList.add("hidden");
        if (caseManage) caseManage.classList.add("hidden");
        if (profileComponent) profileComponent.classList.add("hidden");

        // Highlight View Cases in sidebar
        const personnelApp2 = document.querySelector("personnel-app");
        const sidebarItems = personnelApp2?.querySelectorAll(".sidebar-item") || [];
        sidebarItems.forEach(item => item.classList.remove("active"));
        const viewCasesBtn = personnelApp2?.querySelector("#btnViewCases");
        if (viewCasesBtn) viewCasesBtn.classList.add("active");

          if (viewCasesComponent && typeof viewCasesComponent.loadCases === "function") {
          await viewCasesComponent.loadCases();
          // set the status dropdown in view-cases UI if present, then apply filter
          try {
            const sf = viewCasesComponent.shadowRoot && viewCasesComponent.shadowRoot.getElementById("statusFilter");
            if (sf) sf.value = status || "all";
          } catch (e) {
            /* ignore */
          }
          if (status && typeof viewCasesComponent.filterByStatus === "function") {
            // viewCases.filterByStatus expects 'all'|'pending'|'resolved'|'closed'
            await viewCasesComponent.filterByStatus(status);
          }
          viewCasesComponent.scrollIntoView({ behavior: "smooth" });
        }
      };

      const el = (id) => this.shadowRoot.getElementById(id);
      const total = el("cardTotal");
      const pending = el("cardPending");
      const resolved = el("cardResolved");
      const closed = el("cardClosed");

      if (total) total.addEventListener("click", () => toViewCases("all"));
      if (pending) pending.addEventListener("click", () => toViewCases("pending"));
      if (resolved) resolved.addEventListener("click", () => toViewCases("resolved"));
      if (closed) closed.addEventListener("click", () => toViewCases("closed"));
    } catch (e) {
      console.warn("Failed to attach dashboard card handlers:", e);
    }
  }
}

customElements.define("dashboard-component", DashboardComponent);
