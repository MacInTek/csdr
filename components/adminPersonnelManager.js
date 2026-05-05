import {
  getAllUsers,
  getUser,
  updateUserProfile,
  changeUserRole,
  changeUserStatus,
  deleteUser
} from "../scripts/adminAuth.js";
import { sanitizeHTML, sanitizeInput } from "../scripts/security.js";

class AdminPersonnelManager extends HTMLElement {
  constructor() {
    super();
  }

  async connectedCallback() {
    this.render();
    await this.loadUsers();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = `
      <div class="admin-personnel-manager">
        <div class="manager-header">
          <h2>Manage Personnel</h2>
          <button id="addPersonnelBtn" class="btn btn-primary">+ Add Personnel</button>
        </div>

        <!-- Search and Filter -->
        <div class="manager-controls">
          <input type="text" id="searchPersonnel" placeholder="Search by username or email..." class="form-control">
          <select id="filterRole" class="form-control">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="personnel">Personnel</option>
          </select>
          <select id="filterStatus" class="form-control">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <!-- Personnel Table -->
        <div class="table-responsive">
          <table class="personnel-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Position</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="personnelTableBody">
              <tr><td colspan="6" class="text-center">Loading personnel...</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Edit Modal -->
        <div class="modal-overlay" id="editModal">
          <div class="modal-content edit-modal">
            <div class="modal-header">
              <h3>Edit Personnel</h3>
              <button class="close-btn" id="closeEditModal">&times;</button>
            </div>
            <div class="modal-body">
              <form id="editForm">
                <div class="form-group">
                  <label>Email:</label>
                  <input type="email" id="editEmail" disabled class="form-control">
                </div>
                <div class="form-group">
                  <label>Full Name:</label>
                  <input type="text" id="editName" placeholder="First and Last Name" class="form-control">
                </div>
                <div class="form-group">
                  <label>Position:</label>
                  <input type="text" id="editPosition" placeholder="e.g., Manager" class="form-control">
                </div>
                <div class="form-group">
                  <label>Department:</label>
                  <input type="text" id="editDepartment" placeholder="e.g., Sales" class="form-control">
                </div>
                <div class="form-group">
                  <label>Phone:</label>
                  <input type="tel" id="editPhone" placeholder="Phone number" class="form-control">
                </div>
                <div class="form-group">
                  <label>Role:</label>
                  <select id="editRole" class="form-control">
                    <option value="personnel">Personnel</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Status:</label>
                  <select id="editStatus" class="form-control">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
              <button class="btn btn-warning" id="deleteBtn">Delete User</button>
              <button class="btn btn-primary" id="saveEditBtn">Save Changes</button>
            </div>
          </div>
        </div>

        <!-- Confirmation Modal -->
        <div class="modal-overlay" id="confirmModal">
          <div class="modal-content">
            <p id="confirmMessage"></p>
            <div class="modal-buttons">
              <button class="modal-btn modal-btn-secondary" id="confirmCancelBtn">Cancel</button>
              <button class="modal-btn modal-btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadUsers() {
    try {
      const users = await getAllUsers();
      this.users = users;
      this.displayUsers(users);
    } catch (error) {
      console.error("Error loading users:", error);
      this.showError("Failed to load personnel data");
    }
  }

  displayUsers(users) {
    const tbody = this.querySelector("#personnelTableBody");

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No personnel found</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${sanitizeHTML(user.email)}</td>
        <td>${sanitizeHTML(user.profileData?.firstName || user.username || "N/A")}</td>
        <td><span class="badge badge-${user.role}">${user.role}</span></td>
        <td><span class="badge badge-${user.status}">${user.status}</span></td>
        <td>${sanitizeHTML(user.profileData?.position || "—")}</td>
        <td>
          <button class="btn-edit" data-id="${user.id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-delete" data-id="${user.id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");

    // Add event listeners to action buttons
    this.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", (e) => this.openEditModal(e.target.closest("button").dataset.id));
    });

    this.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", (e) => this.openDeleteConfirm(e.target.closest("button").dataset.id));
    });
  }

  async openEditModal(userId) {
    try {
      const user = await getUser(userId);
      this.currentEditUserId = userId;

      const modal = this.querySelector("#editModal");
      this.querySelector("#editEmail").value = user.email;
      this.querySelector("#editName").value = user.profileData?.firstName || "";
      this.querySelector("#editPosition").value = user.profileData?.position || "";
      this.querySelector("#editDepartment").value = user.profileData?.department || "";
      this.querySelector("#editPhone").value = user.profileData?.phone || "";
      this.querySelector("#editRole").value = user.role;
      this.querySelector("#editStatus").value = user.status || "active";

      modal.classList.add("show");
    } catch (error) {
      this.showError("Failed to load user details");
    }
  }

  async saveChanges() {
    try {
      const updates = {
        profileData: {
          firstName: sanitizeInput(this.querySelector("#editName").value),
          position: sanitizeInput(this.querySelector("#editPosition").value),
          department: sanitizeInput(this.querySelector("#editDepartment").value),
          phone: sanitizeInput(this.querySelector("#editPhone").value)
        },
        role: this.querySelector("#editRole").value,
        status: this.querySelector("#editStatus").value
      };

      await updateUserProfile(this.currentEditUserId, updates);

      // If role or status changed, also update those separately to trigger logging
      const newRole = this.querySelector("#editRole").value;
      const newStatus = this.querySelector("#editStatus").value;

      await this.loadUsers();
      this.querySelector("#editModal").classList.remove("show");
      this.showSuccess("Personnel updated successfully");
    } catch (error) {
      this.showError(error.message || "Failed to update personnel");
    }
  }

  openDeleteConfirm(userId) {
    this.currentDeleteUserId = userId;
    const modal = this.querySelector("#confirmModal");
    const message = this.querySelector("#confirmMessage");
    message.textContent = "Are you sure you want to delete this personnel? This action cannot be undone.";
    modal.classList.add("show");
  }

  async confirmDelete() {
    try {
      await deleteUser(this.currentDeleteUserId);
      await this.loadUsers();
      this.querySelector("#confirmModal").classList.remove("show");
      this.showSuccess("Personnel deleted successfully");
    } catch (error) {
      this.showError(error.message || "Failed to delete personnel");
    }
  }

  setupEventListeners() {
    // Close buttons
    this.querySelector("#closeEditModal").addEventListener("click", () => {
      this.querySelector("#editModal").classList.remove("show");
    });

    this.querySelector("#cancelEditBtn").addEventListener("click", () => {
      this.querySelector("#editModal").classList.remove("show");
    });

    // Save changes
    this.querySelector("#saveEditBtn").addEventListener("click", () => this.saveChanges());

    // Delete button in modal
    this.querySelector("#deleteBtn").addEventListener("click", () => {
      this.querySelector("#editModal").classList.remove("show");
      this.openDeleteConfirm(this.currentEditUserId);
    });

    // Confirm delete
    this.querySelector("#confirmDeleteBtn").addEventListener("click", () => this.confirmDelete());
    this.querySelector("#confirmCancelBtn").addEventListener("click", () => {
      this.querySelector("#confirmModal").classList.remove("show");
    });

    // Search and filter
    this.querySelector("#searchPersonnel").addEventListener("input", (e) => this.filterUsers());
    this.querySelector("#filterRole").addEventListener("change", () => this.filterUsers());
    this.querySelector("#filterStatus").addEventListener("change", () => this.filterUsers());

    // Close modals on overlay click
    this.querySelector("#editModal").addEventListener("click", (e) => {
      if (e.target.id === "editModal") {
        this.querySelector("#editModal").classList.remove("show");
      }
    });
  }

  filterUsers() {
    const search = this.querySelector("#searchPersonnel").value.toLowerCase();
    const roleFilter = this.querySelector("#filterRole").value;
    const statusFilter = this.querySelector("#filterStatus").value;

    const filtered = this.users.filter(user => {
      const matchesSearch = !search ||
        user.email.toLowerCase().includes(search) ||
        user.profileData?.firstName?.toLowerCase().includes(search);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });

    this.displayUsers(filtered);
  }

  showError(message) {
    alert(`❌ Error: ${message}`);
  }

  showSuccess(message) {
    console.log(`✅ ${message}`);
  }
}

customElements.define("admin-personnel-manager", AdminPersonnelManager);
