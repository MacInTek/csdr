import { db } from "../scripts/firebaseConfig.js";
import {
  initializeApp, deleteApp, getApps,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Secondary app name — used to create accounts without touching the admin session
const SECONDARY_APP_NAME = "adminCreateAccountSecondary";

class AdminCreateAccount extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <!-- Modal Overlay -->
      <div id="acaOverlay" class="aca-overlay hidden">
        <div class="aca-modal">
          <div class="aca-header">
            <h3><i class="fas fa-user-plus"></i> Create Account</h3>
            <button class="aca-close" id="acaClose" aria-label="Close">&times;</button>
          </div>

          <div class="aca-body">
            <div class="aca-alert hidden" id="acaAlert"></div>

            <label>Email
              <input type="email" id="acaEmail" placeholder="user@example.com" autocomplete="off" />
            </label>

            <label>Password
              <div class="aca-pw-wrap">
                <input type="password" id="acaPassword" placeholder="Min 8 chars, A-Z, 0-9, symbol" />
                <button type="button" class="aca-eye" id="acaEye1" aria-label="Toggle password">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </label>

            <label>Confirm Password
              <div class="aca-pw-wrap">
                <input type="password" id="acaConfirm" placeholder="Re-enter password" />
                <button type="button" class="aca-eye" id="acaEye2" aria-label="Toggle confirm">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </label>

            <label>Role
              <select id="acaRole">
                <option value="personnel">Personnel</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>

          <div class="aca-footer">
            <button class="aca-btn-cancel" id="acaCancel">Cancel</button>
            <button class="aca-btn-submit" id="acaSubmit">
              <i class="fas fa-user-plus"></i> Create
            </button>
          </div>
        </div>
      </div>

      <style>
        .aca-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .aca-overlay.hidden { display: none; }

        .aca-modal {
          background: #fff;
          border-radius: 14px;
          width: 100%; max-width: 420px;
          box-shadow: 0 8px 32px rgba(0,0,0,.18);
          overflow: hidden;
          animation: acaSlideIn .2s ease;
        }
        @keyframes acaSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        .aca-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px 14px;
          border-bottom: 1px solid #eee;
        }
        .aca-header h3 { margin: 0; font-size: 17px; color: #0c6d38; }
        .aca-close {
          background: none; border: none; font-size: 22px;
          cursor: pointer; color: #888; line-height: 1;
        }
        .aca-close:hover { color: #333; }

        .aca-body {
          padding: 20px 22px;
          display: flex; flex-direction: column; gap: 14px;
        }

        .aca-body label {
          display: flex; flex-direction: column; gap: 5px;
          font-size: 13px; font-weight: 600; color: #444;
        }

        .aca-body input,
        .aca-body select {
          padding: 9px 12px;
          border: 1px solid #ccc; border-radius: 8px;
          font-size: 14px; outline: none;
          transition: border-color .2s;
        }
        .aca-body input:focus,
        .aca-body select:focus { border-color: #0c6d38; }

        .aca-pw-wrap { position: relative; }
        .aca-pw-wrap input { width: 100%; box-sizing: border-box; padding-right: 38px; }
        .aca-eye {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #888; font-size: 14px;
        }
        .aca-eye:hover { color: #333; }

        .aca-alert {
          padding: 9px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 600;
        }
        .aca-alert.hidden { display: none; }
        .aca-alert.error   { background: #fdecea; color: #c0392b; }
        .aca-alert.success { background: #eafaf1; color: #0c6d38; }

        .aca-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 22px;
          border-top: 1px solid #eee;
        }

        .aca-btn-cancel {
          padding: 8px 18px; border-radius: 8px;
          border: 1px solid #ccc; background: #fff;
          cursor: pointer; font-size: 14px;
        }
        .aca-btn-cancel:hover { background: #f5f5f5; }

        .aca-btn-submit {
          padding: 8px 18px; border-radius: 8px;
          border: none; background: #0c6d38; color: #fff;
          cursor: pointer; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 6px;
          transition: background .2s;
        }
        .aca-btn-submit:hover   { background: #0a5a2f; }
        .aca-btn-submit:disabled { background: #aaa; cursor: not-allowed; }
      </style>
    `;

    this._bindEvents();
  }

  open() {
    this._reset();
    this.querySelector("#acaOverlay").classList.remove("hidden");
  }

  close() {
    this.querySelector("#acaOverlay").classList.add("hidden");
  }

  _reset() {
    ["#acaEmail","#acaPassword","#acaConfirm"].forEach(s => this.querySelector(s).value = "");
    this.querySelector("#acaRole").value = "personnel";
    this._hideAlert();
    this.querySelector("#acaSubmit").disabled = false;
  }

  _bindEvents() {
    this.querySelector("#acaClose").addEventListener("click",  () => this.close());
    this.querySelector("#acaCancel").addEventListener("click", () => this.close());

    // Close on overlay click
    this.querySelector("#acaOverlay").addEventListener("click", (e) => {
      if (e.target === this.querySelector("#acaOverlay")) this.close();
    });

    // Toggle password visibility
    this.querySelector("#acaEye1").addEventListener("click", () => this._togglePw("#acaPassword", "#acaEye1"));
    this.querySelector("#acaEye2").addEventListener("click", () => this._togglePw("#acaConfirm",  "#acaEye2"));

    this.querySelector("#acaSubmit").addEventListener("click", () => this._submit());
  }

  _togglePw(inputSel, btnSel) {
    const input = this.querySelector(inputSel);
    const icon  = this.querySelector(`${btnSel} i`);
    if (input.type === "password") {
      input.type = "text";
      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  }

  _showAlert(msg, type = "error") {
    const el = this.querySelector("#acaAlert");
    el.textContent = msg;
    el.className = `aca-alert ${type}`;
  }

  _hideAlert() {
    this.querySelector("#acaAlert").className = "aca-alert hidden";
  }

  _validate(email, password, confirm) {
    if (!email || !password || !confirm) return "Please fill in all fields.";
    if (password !== confirm) return "Passwords do not match.";
    if (password.length < 8)  return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password needs at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password needs at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password needs at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password needs at least one symbol.";
    return null;
  }

  async _submit() {
    const email    = this.querySelector("#acaEmail").value.trim();
    const password = this.querySelector("#acaPassword").value;
    const confirm  = this.querySelector("#acaConfirm").value;
    const role     = this.querySelector("#acaRole").value;

    const err = this._validate(email, password, confirm);
    if (err) { this._showAlert("⚠ " + err); return; }

    const btn = this.querySelector("#acaSubmit");
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating...`;

    let secondaryApp = null;
    try {
      // Use a secondary Firebase app so the admin's auth session is untouched
      const { firebaseConfig } = await import("../scripts/firebaseConfig.js");

      // Reuse existing secondary app if it wasn't cleaned up, otherwise create fresh
      const existing = getApps().find(a => a.name === SECONDARY_APP_NAME);
      secondaryApp = existing || initializeApp(firebaseConfig, SECONDARY_APP_NAME);

      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = cred.user;

      await sendEmailVerification(newUser);

      await setDoc(doc(db, "users", newUser.uid), {
        email,
        role,
        status: "active",
        createdAt: serverTimestamp(),
      });

      // Sign out of secondary app and clean it up — admin session untouched
      await fbSignOut(secondaryAuth);
      await deleteApp(secondaryApp);
      secondaryApp = null;

      this._showAlert(`✅ Account created! Verification email sent to ${email}.`, "success");
      document.dispatchEvent(new CustomEvent("admin-account-created", { detail: { email, role } }));
      window.dispatchEvent(new CustomEvent('users-changed'));

      setTimeout(() => {
        this.close();
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-user-plus"></i> Create`;
      }, 2500);
    } catch (e) {
      // Clean up secondary app on error too
      if (secondaryApp) { await deleteApp(secondaryApp).catch(() => {}); }

      const msgs = {
        "auth/email-already-in-use": "Email is already in use.",
        "auth/invalid-email":        "Invalid email address.",
        "auth/weak-password":        "Password is too weak.",
      };
      this._showAlert("⚠ " + (msgs[e.code] || "Something went wrong. Try again."));
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-user-plus"></i> Create`;
    }
  }
}

customElements.define("admin-create-account", AdminCreateAccount);
