import { getAdminStats } from "../scripts/adminAuth.js";

class AdminStats extends HTMLElement {
  async connectedCallback() {
    this.render();
    await this.loadStats();
    this.setupRefresh();
  }

  render() {
    this.innerHTML = `
      <div class="admin-stats">
        <div class="stats-header">
          <h2>Dashboard Overview</h2>
          <button id="refreshStatsBtn" class="btn btn-secondary" title="Refresh">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>

        <!-- Stats Cards -->
        <div id="statsContainer" class="stats-grid">
          <div class="stat-card loading">
            <div class="stat-value">—</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card loading">
            <div class="stat-value">—</div>
            <div class="stat-label">Admins</div>
          </div>
          <div class="stat-card loading">
            <div class="stat-value">—</div>
            <div class="stat-label">Personnel</div>
          </div>
          <div class="stat-card loading">
            <div class="stat-value">—</div>
            <div class="stat-label">Active Users</div>
          </div>
          <div class="stat-card loading">
            <div class="stat-value">—</div>
            <div class="stat-label">Inactive Users</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <h3>Quick Actions</h3>
          <div class="actions-grid">
            <button class="action-card" id="viewPersonnelBtn">
              <i class="fas fa-users"></i>
              <span>Manage Personnel</span>
            </button>
            <button class="action-card" id="viewLogsBtn">
              <i class="fas fa-list"></i>
              <span>Activity Logs</span>
            </button>
          </div>
        </div>

        <!-- Summary Info -->
        <div class="summary-info">
          <p class="last-updated">Last updated: <span id="lastUpdated">—</span></p>
        </div>
      </div>
    `;
  }

  async loadStats() {
    try {
      const stats = await getAdminStats();

      const cards = this.querySelectorAll(".stat-card");
      cards[0].querySelector(".stat-value").textContent = stats.totalUsers;
      cards[1].querySelector(".stat-value").textContent = stats.admins;
      cards[2].querySelector(".stat-value").textContent = stats.personnel;
      cards[3].querySelector(".stat-value").textContent = stats.activeUsers;
      cards[4].querySelector(".stat-value").textContent = stats.inactiveUsers;

      // Update classes to remove loading state
      cards.forEach(card => card.classList.remove("loading"));

      // Update last updated time
      const now = new Date();
      this.querySelector("#lastUpdated").textContent = now.toLocaleTimeString();
    } catch (error) {
      console.error("Error loading statistics:", error);
      this.showError("Failed to load statistics");
    }
  }

  setupRefresh() {
    this.querySelector("#refreshStatsBtn").addEventListener("click", async () => {
      await this.loadStats();
    });

    // Setup quick action buttons (they'll trigger navigation in parent component)
    this.querySelector("#viewPersonnelBtn").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("navigate", { detail: { section: "personnel" } }));
    });

    this.querySelector("#viewLogsBtn").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("navigate", { detail: { section: "logs" } }));
    });
  }

  showError(message) {
    console.error(`Error: ${message}`);
  }
}

customElements.define("admin-stats", AdminStats);
