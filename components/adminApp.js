import { auth, db } from "../scripts/firebaseConfig.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Load sub-components
import "./adminUserManage.js";
import "./adminCaseManage.js";
import "./adminViewCases.js";
import "./adminProfile.js";
import "./adminCreateAccount.js";
import "./adminForgotPassword.js";
import "./adminDashboard.js";
import "./profileSetup.js";
import "./adminInventory.js";

class AdminApp extends HTMLElement {
  connectedCallback() {
    this._buildShell();
    this._bindNav();
    onAuthStateChanged(auth, (user) => {
      if (!user) { window.location.href = "login_page.html"; return; }
      this._loadUser(user);
    });

    // If new admin (no username/position), force profile setup
    if (this.hasAttribute("require-profile")) {
      requestAnimationFrame(() => {
        ["panelDashboard","panelUserManage","panelCaseManage","panelViewCases","panelInventory"].forEach(id =>
          this.querySelector(`#${id}`)?.classList.add("hidden")
        );
        ["btnDashboard","btnUserManage","btnCaseManage","btnViewCases","btnInventory"].forEach(id =>
          this.querySelector(`#${id}`)?.classList.remove("active")
        );
        this.querySelector("#panelProfile")?.classList.add("hidden");
        this.querySelector("#panelProfileSetup")?.classList.remove("hidden");

        const banner = document.createElement("div");
        banner.id = "profile-required-banner";
        banner.style.cssText = "background:#fff3cd;color:#856404;border:1px solid #ffc107;border-radius:8px;padding:12px 16px;margin:0 20px 0 20px;font-size:13px;font-weight:600;";
        banner.textContent = "👋 Welcome! Please complete your profile before continuing.";
        this.querySelector("#panelProfileSetup")?.before(banner);
      });
    }
  }

  _buildShell() {
    if (!document.getElementById("home-page-css")) {
      const link = document.createElement("link");
      link.id = "home-page-css";
      link.rel = "stylesheet";
      link.href = "css/home_page.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("admin-css")) {
      const link = document.createElement("link");
      link.id = "admin-css";
      link.rel = "stylesheet";
      link.href = "css/admin_dashboard.css";
      document.head.appendChild(link);
    }
    document.title = "Admin | CSDR";

    this.innerHTML = `
      <div class="container">
        <div class="navbar">
          <div class="logo">
            <a href="app.html">
              <img src="assets/logo/CSLTIV-logo.png" alt="CSLTVS Logo" style="width:40px;margin-left:8px;">
              CSDR <span class="admin-badge">Admin</span>
            </a>
          </div>
          <div class="user-menu">
            <div class="user-profile" id="userProfileToggle">
              <img id="userPhoto" alt="Profile" class="user-avatar" src="assets/profiles/NoPhoto.png">
              <div class="user-info">
                <span id="userNameDisplay1" class="user-name">Admin</span>
              </div>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="profile-dropdown" id="profileDropdown">
              <div class="dropdown-header">
                <img id="userPhoto2" alt="Profile" class="dropdown-avatar" src="assets/profiles/NoPhoto.png">
                <div class="dropdown-info">
                  <p id="userNameDisplay2" class="dropdown-name">Admin</p>
                  <p id="userPositionDisplay" class="dropdown-position">Administrator</p>
                  <p id="userEmailDisplay" class="dropdown-email">@example.com</p>
                </div>
              </div>
              <hr>
              <a class="dropdown-item" id="profileLink" style="cursor:pointer;">
                <i class="fas fa-user-circle"></i> My Profile
              </a>
              <a class="dropdown-item" id="createAccountLink" style="cursor:pointer;">
                <i class="fas fa-user-plus"></i> Add Account
              </a>
              <a class="dropdown-item" id="forgotPasswordLink" style="cursor:pointer;">
                <i class="fas fa-key"></i> Reset User Password
              </a>
              <hr>
              <a class="dropdown-item" id="contactDevLink" style="cursor:pointer;">
                <i class="fas fa-envelope"></i> Contact Developer
              </a>
              <hr>
              <div class="dark-mode-toggle">
                <span><i id="darkModeIcon" class="fas fa-moon"></i> <span id="darkModeLabel">Dark Mode</span></span>
                <label class="toggle-switch" aria-label="Toggle dark mode">
                  <input type="checkbox" id="darkModeToggle">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <hr>
              <button id="logoutBtn" class="dropdown-item logout-item">
                <i class="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
          <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="Toggle navigation">
            <i class="fas fa-bars"></i>
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="main-content">
          <div class="sidebar" id="sidebar">
            <div class="sidebar-item active" id="btnDashboard">
              <i class="fas fa-tachometer-alt"></i><span>Dashboard</span>
            </div>
            <div class="sidebar-item" id="btnUserManage">
              <i class="fas fa-users-cog"></i><span>User Profiles</span>
            </div>
            <div class="sidebar-item" id="btnCaseManage">
              <i class="fas fa-file-alt"></i><span>Case Management</span>
            </div>
            <div class="sidebar-item" id="btnViewCases">
              <i class="fas fa-folder-open"></i><span>View Cases</span>
            </div>
            <div class="sidebar-item" id="btnInventory">
              <i class="fas fa-archive"></i><span>Inventory</span>
            </div>
          </div>

          <div class="content" id="app">
            <!-- Dashboard Panel -->
            <div id="panelDashboard">
              <admin-dashboard id="adminDashboard"></admin-dashboard>
            </div>

            <div id="panelUserManage" class="hidden">
              <admin-user-manage></admin-user-manage>
            </div>
            <div id="panelCaseManage" class="hidden">
              <admin-case-manage></admin-case-manage>
            </div>
            <div id="panelViewCases" class="hidden">
              <admin-view-cases></admin-view-cases>
            </div>
            <div id="panelInventory" class="hidden">
              <admin-inventory></admin-inventory>
            </div>
            <div id="panelProfile" class="hidden">
              <admin-profile></admin-profile>
            </div>
            <div id="panelProfileSetup" class="hidden">
              <profile-setup></profile-setup>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Account Modal -->
      <admin-create-account id="createAccountModal"></admin-create-account>

      <!-- Forgot Password Modal -->
      <admin-forgot-password id="forgotPasswordModal"></admin-forgot-password>

      <!-- Contact Developer Modal -->
      <div id="contactDevModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;align-items:center;justify-content:center;">
        <div style="background:var(--bg-card,#fff);border-radius:16px;padding:28px 24px;width:90%;max-width:500px;box-shadow:0 20px 60px rgba(0,0,0,.25);position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="margin:0;color:#0c6d38;font-size:18px;display:flex;align-items:center;gap:8px;">
              <i class="fas fa-envelope"></i> Contact Developer
            </h3>
            <button id="contactDevClose" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--text-secondary,#666);line-height:1;padding:4px 8px;border-radius:6px;" aria-label="Close">&times;</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:13px;font-weight:600;color:var(--text-primary,#444);">Subject</label>
              <input id="contactDevSubject" type="text" maxlength="200"
                placeholder="e.g. Bug report, Feature request..."
                style="padding:10px 12px;border-radius:8px;border:1px solid var(--border-color,#ccc);font-size:14px;outline:none;transition:border-color .2s;background:var(--bg-input,#fff);color:var(--text-primary,#333);"
                onfocus="this.style.borderColor='#0c6d38'" onblur="this.style.borderColor=''" />
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;">
              <label style="font-size:13px;font-weight:600;color:var(--text-primary,#444);">Message</label>
              <textarea id="contactDevMessage" rows="6" maxlength="5000"
                placeholder="Describe your issue or request in detail..."
                style="padding:10px 12px;border-radius:8px;border:1px solid var(--border-color,#ccc);font-size:14px;resize:vertical;min-height:120px;outline:none;transition:border-color .2s;font-family:inherit;background:var(--bg-input,#fff);color:var(--text-primary,#333);"
                onfocus="this.style.borderColor='#0c6d38'" onblur="this.style.borderColor=''"></textarea>
              <span id="contactDevCharCount" style="font-size:11px;color:var(--text-muted,#999);text-align:right;">0 / 5000</span>
            </div>
            <div id="contactDevStatus" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;"></div>
            <button id="contactDevSend"
              style="background:linear-gradient(180deg,#0c6d38,#095a2e);color:white;border:none;border-radius:8px;padding:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 2px 6px rgba(12,109,56,.2);">
              <i class="fas fa-paper-plane"></i> Send Message
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async _loadUser(user) {
    let username = user.displayName || user.email || "Admin";
    let position = "Administrator";

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.username) username = d.username;
        if (d.position) position = d.position;
      }
    } catch (e) { console.error(e); }

    this.querySelector("#userNameDisplay1").textContent = username;
    this.querySelector("#userNameDisplay2").textContent = username;
    this.querySelector("#welcomeName")?.textContent && (this.querySelector("#welcomeName").textContent = username);
    this.querySelector("#userEmailDisplay").textContent = user.email;
    this.querySelector("#userPositionDisplay").textContent = position;
    const avatar = user.photoURL || "assets/profiles/NoPhoto.png";
    this.querySelector("#userPhoto").src  = avatar;
    this.querySelector("#userPhoto2").src = avatar;

    // Pass name to dashboard component
    this.querySelector("#adminDashboard")?.setWelcomeName(username);
  }

  _bindNav() {
    const panels = {
      btnDashboard:  "panelDashboard",
      btnUserManage: "panelUserManage",
      btnCaseManage: "panelCaseManage",
      btnViewCases:  "panelViewCases",
      btnInventory:  "panelInventory",
      btnProfile:    "panelProfile",
    };

    const showPanel = (activeBtn) => {
      // Block navigation until profile is completed
      if (this.hasAttribute("require-profile")) return;

      Object.entries(panels).forEach(([btnId, panelId]) => {
        const btn   = this.querySelector(`#${btnId}`);
        const panel = this.querySelector(`#${panelId}`);
        if (btnId === activeBtn) {
          btn?.classList.add("active");
          panel?.classList.remove("hidden");
        } else {
          btn?.classList.remove("active");
          panel?.classList.add("hidden");
        }
      });
      this.querySelector("#sidebar")?.classList.remove("active");
    };

    Object.keys(panels).forEach(btnId => {
      this.querySelector(`#${btnId}`)?.addEventListener("click", () => showPanel(btnId));
    });

    // Logout
    this.querySelector("#logoutBtn")?.addEventListener("click", () => {
      signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = "login_page.html";
      });
    });

    // Profile dropdown link → navigate to profile panel
    this.querySelector("#profileLink")?.addEventListener("click", () => {
      if (this.hasAttribute("require-profile")) return;
      showPanel("btnProfile");
      this.querySelector("#userProfileToggle")?.classList.remove("active");
      this.querySelector("#profileDropdown")?.classList.remove("active");
    });

    // Create Account link → open modal
    this.querySelector("#createAccountLink")?.addEventListener("click", () => {
      if (this.hasAttribute("require-profile")) return;
      this.querySelector("#createAccountModal")?.open();
      this.querySelector("#userProfileToggle")?.classList.remove("active");
      this.querySelector("#profileDropdown")?.classList.remove("active");
    });

    // Reset User Password link → open modal
    this.querySelector("#forgotPasswordLink")?.addEventListener("click", () => {
      if (this.hasAttribute("require-profile")) return;
      this.querySelector("#forgotPasswordModal")?.open();
      this.querySelector("#userProfileToggle")?.classList.remove("active");
      this.querySelector("#profileDropdown")?.classList.remove("active");
    });

    // ── Contact Developer ────────────────────────────────────────────────────
    const DEV_EMAIL = "csltvsdar@gmail.com";

    const contactDevModal   = this.querySelector("#contactDevModal");
    const contactDevClose   = this.querySelector("#contactDevClose");
    const contactDevSubject = this.querySelector("#contactDevSubject");
    const contactDevMessage = this.querySelector("#contactDevMessage");
    const contactDevCount   = this.querySelector("#contactDevCharCount");
    const contactDevStatus  = this.querySelector("#contactDevStatus");
    const contactDevSend    = this.querySelector("#contactDevSend");

    const openContactModal = () => {
      // Reset form state
      if (contactDevSubject) contactDevSubject.value = "";
      if (contactDevMessage) contactDevMessage.value = "";
      if (contactDevCount)   contactDevCount.textContent = "0 / 5000";
      if (contactDevStatus)  { contactDevStatus.style.display = "none"; contactDevStatus.textContent = ""; }
      if (contactDevModal)   contactDevModal.style.display = "flex";
      // Close the profile dropdown
      this.querySelector("#userProfileToggle")?.classList.remove("active");
      this.querySelector("#profileDropdown")?.classList.remove("active");
      requestAnimationFrame(() => contactDevSubject?.focus());
    };

    const closeContactModal = () => {
      if (contactDevModal) contactDevModal.style.display = "none";
    };

    // Open via dropdown link
    this.querySelector("#contactDevLink")?.addEventListener("click", () => {
      if (this.hasAttribute("require-profile")) return;
      openContactModal();
    });

    // Close button
    contactDevClose?.addEventListener("click", closeContactModal);

    // Close on backdrop click
    contactDevModal?.addEventListener("click", (e) => {
      if (e.target === contactDevModal) closeContactModal();
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && contactDevModal?.style.display === "flex") closeContactModal();
    });

    // Character counter for message textarea
    contactDevMessage?.addEventListener("input", () => {
      const len = contactDevMessage.value.length;
      if (contactDevCount) {
        contactDevCount.textContent = `${len} / 5000`;
        contactDevCount.style.color = len > 4500 ? "#dc3545" : len > 4000 ? "#fd7e14" : "var(--text-muted,#999)";
      }
    });

    // Send — opens Gmail compose via mailto:
    contactDevSend?.addEventListener("click", () => {
      const subject = (contactDevSubject?.value || "").trim();
      const body    = (contactDevMessage?.value || "").trim();

      if (!subject) {
        contactDevSubject?.focus();
        showContactStatus("⚠️ Please enter a subject.", "#856404", "#fff3cd");
        return;
      }
      if (!body) {
        contactDevMessage?.focus();
        showContactStatus("⚠️ Please enter a message.", "#856404", "#fff3cd");
        return;
      }

      // Build mailto URI — Gmail will open with To, Subject, Body pre-filled
      const mailto = `mailto:${DEV_EMAIL}`
        + `?subject=${encodeURIComponent(subject)}`
        + `&body=${encodeURIComponent(body)}`;

      // Open in a new tab so the app stays open
      const link = document.createElement("a");
      link.href   = mailto;
      link.target = "_blank";
      link.rel    = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showContactStatus("✅ Your email client has been opened with the message pre-filled. Send it from there.", "#155724", "#d4edda");

      // Auto-close after 3 s
      setTimeout(closeContactModal, 3000);
    });

    function showContactStatus(msg, color, bg) {
      if (!contactDevStatus) return;
      contactDevStatus.textContent = msg;
      contactDevStatus.style.color      = color;
      contactDevStatus.style.background = bg;
      contactDevStatus.style.display    = "block";
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Refresh stats after a new account is created
    document.addEventListener("admin-account-created", () => {
      this.querySelector("#adminDashboard")?._loadStats();
    });

    // Sync navbar name/position when profile is saved
    document.addEventListener("profile-updated", (e) => {
      if (e.detail?.username) {
        this.querySelector("#userNameDisplay1").textContent = e.detail.username;
        this.querySelector("#userNameDisplay2").textContent = e.detail.username;
        this.querySelector("#welcomeName")?.textContent && (this.querySelector("#welcomeName").textContent = e.detail.username);
      }
      if (e.detail?.position) {
        this.querySelector("#userPositionDisplay").textContent = e.detail.position;
      }
      if (e.detail?.photoURL) {
        this.querySelector("#userPhoto").src  = e.detail.photoURL;
        this.querySelector("#userPhoto2").src = e.detail.photoURL;
      }

      // If this was triggered by profile setup, remove restriction and go to dashboard
      if (this.hasAttribute("require-profile")) {
        this.removeAttribute("require-profile");
        this.querySelector("#profile-required-banner")?.remove();

        ["panelUserManage","panelCaseManage","panelViewCases","panelInventory","panelProfile","panelProfileSetup"].forEach(id =>
          this.querySelector(`#${id}`)?.classList.add("hidden")
        );
        this.querySelector("#panelDashboard")?.classList.remove("hidden");

        ["btnUserManage","btnCaseManage","btnViewCases","btnInventory"].forEach(id =>
          this.querySelector(`#${id}`)?.classList.remove("active")
        );
        this.querySelector("#btnDashboard")?.classList.add("active");
      }
    });

    // Mobile menu — animated burger ↔ X with overlay
    const mobileToggle = this.querySelector("#mobileMenuToggle");
    const sidebar      = this.querySelector("#sidebar");

    // Create overlay element
    const overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,0)",
      "z-index:98",
      "transition:background 0.3s ease",
      "cursor:pointer",
    ].join(";");
    this.querySelector(".container")?.appendChild(overlay);

    const openSidebar = () => {
      sidebar?.classList.add("active");
      mobileToggle?.classList.add("open");
      overlay.style.display = "block";
      requestAnimationFrame(() => {
        overlay.style.background = "rgba(0,0,0,0.45)";
      });
    };

    const closeSidebar = () => {
      sidebar?.classList.remove("active");
      mobileToggle?.classList.remove("open");
      overlay.style.background = "rgba(0,0,0,0)";
      setTimeout(() => { overlay.style.display = "none"; }, 300);
    };

    mobileToggle?.addEventListener("click", () => {
      sidebar?.classList.contains("active") ? closeSidebar() : openSidebar();
    });

    // Close when tapping the overlay
    overlay.addEventListener("click", closeSidebar);

    // Close sidebar when a nav item is tapped on mobile
    sidebar?.querySelectorAll(".sidebar-item").forEach(item => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 768) closeSidebar();
      });
    });

    // ── Dark mode toggle (Brave-safe: localStorage may be blocked on mobile) ──
    const darkToggle = this.querySelector("#darkModeToggle");

    // Safe storage helpers — Brave blocks localStorage in some mobile contexts
    const _dmRead  = () => { try { return localStorage.getItem("darkMode"); } catch { return null; } };
    const _dmWrite = (v) => { try { localStorage.setItem("darkMode", v); } catch { /* blocked */ } };

    const darkModeIcon  = this.querySelector("#darkModeIcon");
    const darkModeLabel = this.querySelector("#darkModeLabel");
    const applyDark = (on) => {
      document.body.classList.toggle("dark-mode", on);
      _dmWrite(on ? "1" : "0");
      if (darkToggle) darkToggle.checked = on;
      if (darkModeIcon)  darkModeIcon.className  = on ? "fas fa-sun"   : "fas fa-moon";
      if (darkModeLabel) darkModeLabel.textContent = on ? "Light Mode" : "Dark Mode";
    };

    // Restore saved preference; fall back to OS preference if storage is unavailable
    const _dmSaved = _dmRead();
    applyDark(_dmSaved !== null
      ? _dmSaved === "1"
      : (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false)
    );

    // On mobile (Brave), a tap on the toggle label fires a document click that
    // closes the dropdown BEFORE the checkbox change event fires, so we must
    // stop that propagation on the toggle's parent label and the checkbox itself.
    const darkToggleLabel = darkToggle?.closest("label") ?? darkToggle?.parentElement;
    darkToggleLabel?.addEventListener("click",      (e) => e.stopPropagation());
    darkToggleLabel?.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
    darkToggle?.addEventListener("touchend",        (e) => e.stopPropagation(), { passive: true });

    // Use both "change" and a "click" fallback for Brave mobile where change
    // sometimes doesn't fire reliably on the checkbox inside a shadow-like context.
    darkToggle?.addEventListener("change", () => applyDark(darkToggle.checked));
    darkToggle?.addEventListener("click",  () => {
      // "click" fires before "change" on some mobile browsers — read the NEW
      // intended state by inverting the current body class, not darkToggle.checked
      // (which may not have updated yet at this point in the event order).
      // We guard with a small flag so we don't double-apply when both events fire.
      if (darkToggle._clickHandled) { darkToggle._clickHandled = false; return; }
      darkToggle._clickHandled = true;
      applyDark(!document.body.classList.contains("dark-mode"));
      setTimeout(() => { darkToggle._clickHandled = false; }, 50);
    });
    // ─────────────────────────────────────────────────────────────────────────

    // Profile dropdown
    const toggle   = this.querySelector("#userProfileToggle");
    const dropdown = this.querySelector("#profileDropdown");
    toggle?.addEventListener("click", () => {
      toggle.classList.toggle("active");
      dropdown.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-menu")) {
        toggle?.classList.remove("active");
        dropdown?.classList.remove("active");
      }
    });
  }
}

customElements.define("admin-app", AdminApp);
