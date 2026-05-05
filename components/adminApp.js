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
                <span><i class="fas fa-moon"></i> Dark Mode</span>
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

    // Dark mode toggle
    const darkToggle = this.querySelector("#darkModeToggle");
    const applyDark = (on) => {
      document.body.classList.toggle("dark-mode", on);
      localStorage.setItem("darkMode", on ? "1" : "0");
      if (darkToggle) darkToggle.checked = on;
    };
    // Restore saved preference
    applyDark(localStorage.getItem("darkMode") === "1");
    darkToggle?.addEventListener("change", () => applyDark(darkToggle.checked));

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
