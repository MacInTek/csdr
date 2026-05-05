import { db } from "../scripts/firebaseConfig.js";
import {
  collection, doc, onSnapshot, updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class AdminUserManage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.users = [];
    this.sortDirection = "desc";
    this._editingUserId = null;
    this._editingUserPosition = "";
  }

  connectedCallback() {
    this.render();
    this._subscribe();
  }

  disconnectedCallback() {
    if (this._unsubscribe) this._unsubscribe();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: "Segoe UI", Arial, sans-serif; }

        .card {
          background: #fff;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.07);
        }

        h2 { color: #0c6d38; margin-bottom: 16px; font-size: 20px; }

        .filter-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-bar select, .filter-bar input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 14px;
        }

        .filter-bar input { flex: 1; min-width: 180px; }

        .users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }

        .user-card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          border-left: 4px solid #0c6d38;
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          gap: 14px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .user-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.11); }
        .user-card.role-admin { border-left-color: #6c5ce7; }

        .avatar {
          width: 52px; height: 52px; border-radius: 50%;
          background: #e8f5e8; display: flex; align-items: center;
          justify-content: center; font-size: 20px; color: #0c6d38;
          font-weight: 700; overflow: hidden; flex-shrink: 0;
        }
        .user-card.role-admin .avatar { background: #f0ebff; color: #6c5ce7; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .user-info { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }

        .user-name {
          font-size: 14px; font-weight: 700; color: #1a1a1a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-email {
          font-size: 11px; color: #7f8c8d;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-position {
          font-size: 11px; color: #0c6d38; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }

        .badge { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
        .role-admin-badge     { background: #f0ebff; color: #6c5ce7; }
        .role-personnel-badge { background: #e8f5e8; color: #0c6d38; }

        .user-joined { font-size: 10px; color: #bbb; }

        .user-count-pill {
          display: inline-block; margin-left: 14px; padding: 4px 10px;
          border-radius: 999px; background: #ebf8f1; color: #0c6d38;
          border: 1px solid #b1e6c3; font-size: 12px; cursor: pointer;
          user-select: none; transition: background .2s, transform .2s;
        }
        .user-count-pill:hover { background: #d9f0e6; transform: translateY(-1px); }
        .user-count-pill.active { background: #0c6d38; color: #fff; border-color: #0a5a2f; }

        .user-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }
        .edit-btn {
          padding: 8px 12px;
          border: 1.5px solid #0c6d38;
          border-radius: 10px;
          background: #fff;
          color: #0c6d38;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all .18s;
        }
        .edit-btn:hover {
          background: #0c6d38;
          color: #fff;
        }

        .modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.45);
          z-index: 1000;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .modal.active { display: flex; }
        .modal-content {
          width: min(480px, 100%);
          background: #fff;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0,0,0,.18);
          max-height: 90vh;
          overflow: auto;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }
        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #0c6d38;
        }
        .modal-close {
          background: transparent;
          border: none;
          color: #444;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
          padding: 4px;
        }
        .modal-body label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: #333;
          font-weight: 600;
        }
        .modal-body input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #ccc;
          border-radius: 12px;
          font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .modal-body input:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 2px rgba(12,109,56,.12);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }
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

        .empty { grid-column: 1 / -1; text-align: center; padding: 40px; color: #777; }
        ${darkModeCSS}
      </style>

      <div class="card">
        <h2>👥 User Profiles <span id="userCount" class="user-count-pill">(0)</span></h2>
        <div class="filter-bar">
          <input type="text" id="searchInput" placeholder="Search by username or email..." />
          <select id="roleFilter">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="personnel">Personnel</option>
          </select>
        </div>

        <div class="modal" id="editModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Edit Position</h3>
              <button class="modal-close" id="editModalClose" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
              <div style="margin-bottom:12px;color:#444;font-size:14px;">Update the position for <strong id="editUserName">user</strong>.</div>
              <label for="editPositionInput">Position</label>
              <input type="text" id="editPositionInput" placeholder="Enter new position" />
            </div>
            <div class="modal-actions">
              <button class="cancel-btn" id="cancelEditBtn" type="button">Cancel</button>
              <button class="save-btn" id="savePositionBtn" type="button">Save</button>
            </div>
          </div>
        </div>

        <div class="users-grid" id="usersGrid">
          <div class="empty">Loading users...</div>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("searchInput").addEventListener("input",  () => this._applyFilters());
    this.shadowRoot.getElementById("roleFilter").addEventListener("change",  () => this._applyFilters());

    const usersGrid = this.shadowRoot.getElementById("usersGrid");
    if (usersGrid) {
      usersGrid.addEventListener("click", (event) => {
        const button = event.target.closest(".edit-btn");
        if (!button) return;
        const userId = button.dataset.id;
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        this._openEditModal(user);
      });
    }

    const editModal = this.shadowRoot.getElementById("editModal");
    if (editModal) {
      editModal.addEventListener("click", (event) => {
        if (event.target === editModal) this._closeEditModal();
      });
    }

    const saveButton = this.shadowRoot.getElementById("savePositionBtn");
    const cancelButton = this.shadowRoot.getElementById("cancelEditBtn");
    const closeButton = this.shadowRoot.getElementById("editModalClose");
    if (saveButton) saveButton.addEventListener("click", () => this._savePositionUpdate());
    if (cancelButton) cancelButton.addEventListener("click", () => this._closeEditModal());
    if (closeButton) closeButton.addEventListener("click", () => this._closeEditModal());
    this._unsubscribe = onSnapshot(
      collection(db, "users"),
      (snap) => {
        this.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this._applyFilters();
      },
      (err) => {
        console.error("Failed to listen to users:", err);
        this.shadowRoot.getElementById("usersGrid").innerHTML = `<div class="empty">Failed to load users.</div>`;
      }
    );
  }

  _applyFilters() {
    const search = this.shadowRoot.getElementById("searchInput").value.toLowerCase();
    const role   = this.shadowRoot.getElementById("roleFilter").value;

    const filtered = this.users
      .filter(u => {
        const matchSearch = (u.username || "").toLowerCase().includes(search) ||
                            (u.email || "").toLowerCase().includes(search);
        const matchRole   = role === "all" || (u.role || "personnel") === role;
        return matchSearch && matchRole;
      })
      .sort((a, b) => {
        const dA = a.createdAt?.toDate?.() || new Date(0);
        const dB = b.createdAt?.toDate?.() || new Date(0);
        return this.sortDirection === "asc" ? dA - dB : dB - dA;
      });

    const adminCount     = filtered.filter(u => (u.role || "personnel") === "admin").length;
    const personnelCount = filtered.filter(u => (u.role || "personnel") === "personnel").length;

    const pill = this.shadowRoot.getElementById("userCount");
    if (pill) {
      pill.textContent = role === "all"
        ? `${filtered.length} total (${adminCount} admin, ${personnelCount} personnel)`
        : `${filtered.length} ${role}`;
    }

    this._renderCards(filtered);
  }

  _renderCards(users) {
    const grid = this.shadowRoot.getElementById("usersGrid");
    if (!users.length) {
      grid.innerHTML = `<div class="empty">No users found.</div>`;
      return;
    }

    grid.innerHTML = users.map(u => {
      const role     = u.role || "personnel";
      const initials = this._getInitials(u.username);
      const avatar   = u.photoURL
        ? `<img src="${u.photoURL}" alt="${u.username || "user"}" />`
        : initials;

      return `
        <div class="user-card ${role === "admin" ? "role-admin" : ""}" data-id="${u.id}">
          <div class="avatar">${avatar}</div>
          <div class="user-info">
            <div class="user-name">${u.username || "—"}</div>
            <div class="user-email">${u.email || "—"}</div>
            ${u.position ? `<div class="user-position">${u.position}</div>` : `<div class="user-position" style="color:#999;">No position set</div>`}
            <div class="user-meta">
              <span class="badge role-${role}-badge">${role}</span>
              ${u.createdAt ? `<span class="user-joined">${this._timeAgo(u.createdAt)}</span>` : ""}
            </div>
          </div>
          <div class="user-actions">
            <button class="edit-btn" data-id="${u.id}" type="button">Edit Position</button>
          </div>
        </div>
      `;
    }).join("");
  }

  _openEditModal(user) {
    this._editingUserId = user.id;
    this._editingUserPosition = user.position || "";
    const modal = this.shadowRoot.getElementById("editModal");
    const nameEl = this.shadowRoot.getElementById("editUserName");
    const positionInput = this.shadowRoot.getElementById("editPositionInput");
    if (nameEl) nameEl.textContent = user.username || "user";
    if (positionInput) positionInput.value = this._editingUserPosition;
    if (modal) modal.classList.add("active");
    positionInput?.focus();
  }

  _closeEditModal() {
    this._editingUserId = null;
    this._editingUserPosition = "";
    const modal = this.shadowRoot.getElementById("editModal");
    if (modal) modal.classList.remove("active");
  }

  async _savePositionUpdate() {
    const positionInput = this.shadowRoot.getElementById("editPositionInput");
    if (!positionInput || !this._editingUserId) return;

    const newPosition = positionInput.value.trim();
    if (!newPosition) {
      positionInput.focus();
      return;
    }

    try {
      await updateDoc(doc(db, "users", this._editingUserId), { position: newPosition });
      const user = this.users.find(u => u.id === this._editingUserId);
      if (user) {
        user.position = newPosition;
      }
      this._applyFilters();
      this._closeEditModal();
    } catch (error) {
      console.error("Failed to update user position:", error);
      this._closeEditModal();
    }
  }

  _getInitials(name) {
    if (!name) return "?";
    return name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  }

  _timeAgo(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60)    return `${secs}s ago`;
    if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}hr ago`;
    if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
    return date.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });
  }
}

customElements.define("admin-user-manage", AdminUserManage);
