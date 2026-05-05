import { getActivityLogs } from "../scripts/adminAuth.js";
import { sanitizeHTML } from "../scripts/security.js";

class ActivityLogs extends HTMLElement {
  constructor() {
    super();
    this.allLogs = [];
  }

  async connectedCallback() {
    this.render();
    await this.loadActivityLogs();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = `
      <div class="activity-logs">
        <div class="logs-header">
          <h2>Activity Logs</h2>
          <button id="refreshLogsBtn" class="btn btn-secondary" title="Refresh">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>

        <!-- Filters -->
        <div class="logs-filters">
          <select id="filterAction" class="form-control">
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="user_created">User Created</option>
            <option value="user_modified">User Modified</option>
            <option value="role_changed">Role Changed</option>
            <option value="status_changed">Status Changed</option>
            <option value="user_deleted">User Deleted</option>
            <option value="signup_approved">Signup Approved</option>
            <option value="signup_rejected">Signup Rejected</option>
            <option value="account_suspended">Account Suspended</option>
            <option value="account_reactivated">Account Reactivated</option>
          </select>
          <input type="text" id="searchLogs" placeholder="Search by user or admin..." class="form-control">
          <input type="date" id="filterDate" class="form-control" title="Filter by date">
        </div>

        <!-- Logs Table -->
        <div class="table-responsive">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Admin</th>
                <th>Target User</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="logsTableBody">
              <tr><td colspan="5" class="text-center">Loading activity logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async loadActivityLogs() {
    try {
      const logs = await getActivityLogs({ limit: 500 });
      this.allLogs = logs;
      this.displayLogs(logs);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      this.showError("Failed to load activity logs");
    }
  }

  displayLogs(logs) {
    const tbody = this.querySelector("#logsTableBody");

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No activity logs found</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => `
      <tr class="log-row log-${log.action}">
        <td class="timestamp">${this.formatDate(log.timestamp)}</td>
        <td><span class="badge badge-action">${this.formatAction(log.action)}</span></td>
        <td>${log.adminId ? sanitizeHTML(log.adminId.substring(0, 8)) : "—"}</td>
        <td>${log.targetUserId ? sanitizeHTML(log.targetUserId.substring(0, 8)) : "—"}</td>
        <td class="details">
          <details>
            <summary>View</summary>
            <pre>${JSON.stringify(log.details || {}, null, 2)}</pre>
          </details>
        </td>
      </tr>
    `).join("");
  }

  setupEventListeners() {
    // Refresh button
    this.querySelector("#refreshLogsBtn").addEventListener("click", async () => {
      await this.loadActivityLogs();
    });

    // Filter and search
    this.querySelector("#filterAction").addEventListener("change", () => this.filterLogs());
    this.querySelector("#searchLogs").addEventListener("input", () => this.filterLogs());
    this.querySelector("#filterDate").addEventListener("change", () => this.filterLogs());
  }

  filterLogs() {
    const actionFilter = this.querySelector("#filterAction").value;
    const searchTerm = this.querySelector("#searchLogs").value.toLowerCase();
    const dateFilter = this.querySelector("#filterDate").value;

    const filtered = this.allLogs.filter(log => {
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesSearch = !searchTerm ||
        (log.adminId && log.adminId.includes(searchTerm)) ||
        (log.targetUserId && log.targetUserId.includes(searchTerm)) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm));

      let matchesDate = true;
      if (dateFilter) {
        try {
          const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
          const filterDate = new Date(dateFilter);
          matchesDate = date.toDateString() === filterDate.toDateString();
        } catch {
          matchesDate = false;
        }
      }

      return matchesAction && matchesSearch && matchesDate;
    });

    this.displayLogs(filtered);
  }

  formatDate(timestamp) {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  }

  formatAction(action) {
    const actionMap = {
      login: "Login",
      user_created: "User Created",
      user_modified: "User Modified",
      role_changed: "Role Changed",
      status_changed: "Status Changed",
      user_deleted: "User Deleted",
      signup_approved: "Signup Approved",
      signup_rejected: "Signup Rejected",
      account_suspended: "Account Suspended",
      account_reactivated: "Account Reactivated"
    };
    return actionMap[action] || action;
  }

  showError(message) {
    alert(`❌ Error: ${message}`);
  }
}

customElements.define("activity-logs", ActivityLogs);
