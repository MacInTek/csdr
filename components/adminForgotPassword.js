import { auth, db } from "../scripts/firebaseConfig.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

class AdminForgotPassword extends HTMLElement {
  constructor() {
    super();
    this._users = [];
    this._selectedEmail = "";
    this._activeIdx = -1;
  }

  connectedCallback() {
    this.innerHTML = `
      <div id="afpOverlay" class="afp-overlay hidden">
        <div class="afp-modal">
          <div class="afp-header">
            <h3><i class="fas fa-key"></i> Reset Password</h3>
            <button class="afp-close" id="afpClose" aria-label="Close">&times;</button>
          </div>
          <div class="afp-body">
            <p class="afp-desc">Search for a user and we'll send them a password reset link.</p>
            <div class="afp-alert hidden" id="afpAlert"></div>
            <label>User Email
              <div class="afp-search-wrap">
                <span class="afp-search-icon">🔍</span>
                <input
                  id="afpSearch"
                  class="afp-search-input"
                  placeholder="Type to search users..."
                  autocomplete="off"
                  aria-autocomplete="list"
                  aria-controls="afpDropdown"
                />
                <button class="afp-clear-btn hidden" id="afpClear" type="button" aria-label="Clear">×</button>
              </div>
              <div class="afp-dropdown hidden" id="afpDropdown" role="listbox"></div>
            </label>
            <div class="afp-selected hidden" id="afpSelected">
              <span class="afp-selected-label">Sending to:</span>
              <span class="afp-selected-email" id="afpSelectedEmail"></span>
            </div>
          </div>
          <div class="afp-footer">
            <button class="afp-btn-cancel" id="afpCancel">Cancel</button>
            <button class="afp-btn-submit" id="afpSubmit" disabled>
              <i class="fas fa-paper-plane"></i> Send Reset Link
            </button>
          </div>
        </div>
      </div>

      <style>
        .afp-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .afp-overlay.hidden { display: none; }

        .afp-modal {
          background: #fff;
          border-radius: 14px;
          width: 100%; max-width: 420px;
          box-shadow: 0 8px 32px rgba(0,0,0,.18);
          overflow: visible;
          animation: afpSlideIn .2s ease;
        }
        @keyframes afpSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        .afp-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px 14px;
          border-bottom: 1px solid #eee;
        }
        .afp-header h3 { margin: 0; font-size: 17px; color: #0c6d38; }
        .afp-close {
          background: none; border: none; font-size: 22px;
          cursor: pointer; color: #888; line-height: 1;
        }
        .afp-close:hover { color: #333; }

        .afp-body {
          padding: 20px 22px;
          display: flex; flex-direction: column; gap: 14px;
          overflow: visible;
        }

        .afp-desc { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }

        .afp-body label {
          display: flex; flex-direction: column; gap: 6px;
          font-size: 13px; font-weight: 600; color: #444;
          position: relative;
        }

        /* Search input */
        .afp-search-wrap {
          position: relative;
          display: flex; align-items: center;
        }
        .afp-search-icon {
          position: absolute; left: 11px;
          font-size: 15px; pointer-events: none; color: #888;
        }
        .afp-search-input {
          width: 100%;
          padding: 9px 36px 9px 34px;
          border: 1px solid #ccc; border-radius: 8px;
          font-size: 14px; outline: none;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .afp-search-input:focus {
          border-color: #0c6d38;
          box-shadow: 0 0 0 2px rgba(12,109,56,.12);
        }
        .afp-clear-btn {
          position: absolute; right: 8px;
          background: none; border: none;
          font-size: 18px; color: #999; cursor: pointer;
          padding: 2px 6px; border-radius: 4px;
          transition: color .15s, background .15s;
        }
        .afp-clear-btn:hover { color: #333; background: rgba(0,0,0,.05); }
        .afp-clear-btn.hidden { display: none; }

        /* Dropdown */
        .afp-dropdown {
          position: absolute;
          top: calc(100% + 4px); left: 0; right: 0;
          background: #fff;
          border: 1px solid #ddd; border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.13);
          z-index: 10000;
          max-height: 220px; overflow-y: auto;
        }
        .afp-dropdown.hidden { display: none; }

        .afp-opt {
          display: flex; flex-direction: column; gap: 1px;
          padding: 9px 14px;
          cursor: pointer;
          transition: background .12s;
          border-bottom: 1px solid #f5f5f5;
        }
        .afp-opt:last-child { border-bottom: none; }
        .afp-opt:hover, .afp-opt.active {
          background: #f0f9f4;
        }
        .afp-opt-email {
          font-size: 13px; font-weight: 600; color: #1a1a1a;
        }
        .afp-opt-email mark { background: none; color: #0c6d38; font-weight: 700; }
        .afp-opt-name {
          font-size: 11px; color: #888;
        }
        .afp-opt-name mark { background: none; color: #0c6d38; font-weight: 700; }
        .afp-empty {
          padding: 12px 14px; font-size: 13px; color: #999; text-align: center;
        }

        /* Selected pill */
        .afp-selected {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px;
          background: #eafaf1; border-radius: 8px;
          border: 1px solid #b2dfcc;
        }
        .afp-selected.hidden { display: none; }
        .afp-selected-label { font-size: 12px; color: #555; font-weight: 600; }
        .afp-selected-email { font-size: 13px; color: #0c6d38; font-weight: 700; }

        .afp-alert { padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; }
        .afp-alert.hidden { display: none; }
        .afp-alert.error   { background: #fdecea; color: #c0392b; }
        .afp-alert.success { background: #eafaf1; color: #0c6d38; }

        .afp-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 22px;
          border-top: 1px solid #eee;
        }
        .afp-btn-cancel {
          padding: 8px 18px; border-radius: 8px;
          border: 1px solid #ccc; background: #fff;
          cursor: pointer; font-size: 14px;
        }
        .afp-btn-cancel:hover { background: #f5f5f5; }
        .afp-btn-submit {
          padding: 8px 18px; border-radius: 8px;
          border: none; background: #0c6d38; color: #fff;
          cursor: pointer; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 6px;
          transition: background .2s;
        }
        .afp-btn-submit:hover:not(:disabled) { background: #0a5a2f; }
        .afp-btn-submit:disabled { background: #aaa; cursor: not-allowed; }
      </style>
    `;

    this._bindEvents();
  }

  async open() {
    this._selectedEmail = "";
    this._activeIdx = -1;

    const search   = this.querySelector("#afpSearch");
    const dropdown = this.querySelector("#afpDropdown");
    const selected = this.querySelector("#afpSelected");
    const clearBtn = this.querySelector("#afpClear");
    const submitBtn = this.querySelector("#afpSubmit");

    search.value = "";
    dropdown.classList.add("hidden");
    selected.classList.add("hidden");
    clearBtn.classList.add("hidden");
    submitBtn.disabled = true;
    this.querySelector("#afpAlert").className = "afp-alert hidden";
    this.querySelector("#afpSubmit").innerHTML = `<i class="fas fa-paper-plane"></i> Send Reset Link`;
    this.querySelector("#afpOverlay").classList.remove("hidden");

    // Load users
    dropdown.innerHTML = `<div class="afp-empty">Loading users...</div>`;
    dropdown.classList.remove("hidden");
    try {
      const snap = await getDocs(collection(db, "users"));
      this._users = snap.docs
        .map(d => d.data())
        .filter(u => u.email)
        .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
      this._renderDropdown(""); // show all
    } catch (err) {
      console.error("Failed to load users:", err);
      dropdown.innerHTML = `<div class="afp-empty">Failed to load users.</div>`;
    }

    setTimeout(() => search.focus(), 100);
  }

  close() {
    this.querySelector("#afpOverlay").classList.add("hidden");
    this.querySelector("#afpDropdown").classList.add("hidden");
  }

  _bindEvents() {
    this.querySelector("#afpClose").addEventListener("click",  () => this.close());
    this.querySelector("#afpCancel").addEventListener("click", () => this.close());
    this.querySelector("#afpOverlay").addEventListener("click", e => {
      if (e.target === this.querySelector("#afpOverlay")) this.close();
    });
    this.querySelector("#afpSubmit").addEventListener("click", () => this._submit());

    const search   = this.querySelector("#afpSearch");
    const clearBtn = this.querySelector("#afpClear");

    search.addEventListener("focus", () => {
      this._renderDropdown(search.value.trim());
      this.querySelector("#afpDropdown").classList.remove("hidden");
    });

    search.addEventListener("input", () => {
      const term = search.value.trim();
      clearBtn.classList.toggle("hidden", !term);
      this._renderDropdown(term);
      this.querySelector("#afpDropdown").classList.remove("hidden");
      // Clear selection if user edits
      if (this._selectedEmail) {
        this._selectedEmail = "";
        this.querySelector("#afpSelected").classList.add("hidden");
        this.querySelector("#afpSubmit").disabled = true;
      }
    });

    search.addEventListener("keydown", e => {
      const opts = [...this.querySelectorAll(".afp-opt")];
      if (!opts.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._activeIdx = Math.min(this._activeIdx + 1, opts.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._activeIdx = Math.max(this._activeIdx - 1, 0);
      } else if (e.key === "Enter" && this._activeIdx >= 0) {
        e.preventDefault();
        this._selectUser(opts[this._activeIdx].dataset.email, opts[this._activeIdx].dataset.name);
        return;
      } else if (e.key === "Escape") {
        this.querySelector("#afpDropdown").classList.add("hidden");
        return;
      }
      opts.forEach((o, i) => o.classList.toggle("active", i === this._activeIdx));
      if (this._activeIdx >= 0) opts[this._activeIdx].scrollIntoView({ block: "nearest" });
    });

    clearBtn.addEventListener("click", () => {
      search.value = "";
      clearBtn.classList.add("hidden");
      this._selectedEmail = "";
      this.querySelector("#afpSelected").classList.add("hidden");
      this.querySelector("#afpSubmit").disabled = true;
      this._renderDropdown("");
      this.querySelector("#afpDropdown").classList.remove("hidden");
      search.focus();
    });

    // Close dropdown on outside click
    document.addEventListener("click", e => {
      if (!this.querySelector("#afpOverlay").contains(e.target)) return;
      if (!e.target.closest("label")) {
        this.querySelector("#afpDropdown").classList.add("hidden");
      }
    });
  }

  _highlight(text, term) {
    if (!term) return text;
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(re, "<mark>$1</mark>");
  }

  _renderDropdown(term) {
    const dropdown = this.querySelector("#afpDropdown");
    this._activeIdx = -1;

    const filtered = term
      ? this._users.filter(u =>
          (u.email || "").toLowerCase().includes(term.toLowerCase()) ||
          (u.username || "").toLowerCase().includes(term.toLowerCase())
        )
      : this._users;

    if (!filtered.length) {
      dropdown.innerHTML = `<div class="afp-empty">No users found.</div>`;
      return;
    }

    dropdown.innerHTML = filtered.map((u, i) => `
      <div class="afp-opt" data-email="${u.email}" data-name="${u.username || ""}" role="option">
        <span class="afp-opt-email">${this._highlight(u.email, term)}</span>
        ${u.username ? `<span class="afp-opt-name">${this._highlight(u.username, term)}</span>` : ""}
      </div>
    `).join("");

    dropdown.querySelectorAll(".afp-opt").forEach(opt => {
      opt.addEventListener("mousedown", e => {
        e.preventDefault();
        this._selectUser(opt.dataset.email, opt.dataset.name);
      });
    });
  }

  _selectUser(email, name) {
    this._selectedEmail = email;
    this._activeIdx = -1;

    const search = this.querySelector("#afpSearch");
    search.value = email;
    this.querySelector("#afpClear").classList.remove("hidden");
    this.querySelector("#afpDropdown").classList.add("hidden");

    const selectedEl = this.querySelector("#afpSelected");
    this.querySelector("#afpSelectedEmail").textContent = name ? `${email} (${name})` : email;
    selectedEl.classList.remove("hidden");

    this.querySelector("#afpSubmit").disabled = false;
    this.querySelector("#afpAlert").className = "afp-alert hidden";
  }

  _showAlert(msg, type = "error") {
    const el = this.querySelector("#afpAlert");
    el.textContent = msg;
    el.className = `afp-alert ${type}`;
  }

  async _submit() {
    const email = this._selectedEmail;
    if (!email) { this._showAlert("⚠ Please select a user."); return; }

    const btn = this.querySelector("#afpSubmit");
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending...`;

    try {
      await sendPasswordResetEmail(auth, email);
      this._showAlert(`✅ Reset link sent to ${email}.`, "success");
      setTimeout(() => this.close(), 2500);
    } catch (e) {
      const msgs = {
        "auth/user-not-found":    "No account found with that email.",
        "auth/invalid-email":     "Invalid email address.",
        "auth/too-many-requests": "Too many requests. Please try again later.",
      };
      this._showAlert("⚠ " + (msgs[e.code] || "Failed to send reset email. Try again."));
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> Send Reset Link`;
    }
  }
}

customElements.define("admin-forgot-password", AdminForgotPassword);
