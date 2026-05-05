import { auth, db } from "../scripts/firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Load sub-components
import "./dashboard.js";
import "./caseManage.js";
import "./viewCases.js";
import "./profile.js";
import "./profileSetup.js";
import "./personnelInventory.js";

class PersonnelApp extends HTMLElement {
  connectedCallback() {
    this._buildShell();
    this._loadUser();
    this._bindNav();

    // If new user (no username/position set), force profile panel open
    if (this.hasAttribute("require-profile")) {
      requestAnimationFrame(() => {
        const panels = ["panelDashboard", "panelCaseManage", "panelViewCases", "panelInventory"];
        panels.forEach(id => this.querySelector(`#${id}`)?.classList.add("hidden"));
        ["btnDashboard", "btnCaseManage", "btnViewCases", "btnInventory"].forEach(id =>
          this.querySelector(`#${id}`)?.classList.remove("active")
        );
        // Show setup profile for new users, hide regular profile
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
    // Inject home_page CSS globally (outside shadow DOM so child components inherit layout)
    if (!document.getElementById("home-page-css")) {
      const link = document.createElement("link");
      link.id = "home-page-css";
      link.rel = "stylesheet";
      link.href = "css/home_page.css";
      document.head.appendChild(link);
    }
    document.title = "CSDR - Case Status & Digitalized Records";

    this.innerHTML = `
      <div class="container">
        <div class="navbar">
          <div class="logo">
            <a href="app.html">
              <img src="assets/logo/CSLTIV-logo.png" alt="CSLTIV Logo" style="width:40px;margin-left:8px;">CSDR
            </a>
          </div>
          <div class="user-menu">
            <div class="user-profile" id="userProfileToggle">
              <img id="userPhoto" alt="Profile" class="user-avatar" src="assets/profiles/NoPhoto.png">
              <div class="user-info">
                <span id="userNameDisplay1" class="user-name">User</span>
              </div>
              <i class="fas fa-chevron-down"></i>
            </div>

            <div class="profile-dropdown" id="profileDropdown">
              <div class="dropdown-header">
                <img id="userPhoto2" alt="Profile" class="dropdown-avatar" src="assets/profiles/NoPhoto.png">
                <div class="dropdown-info">
                  <p id="userNameDisplay2" class="dropdown-name">Username</p>
                  <p id="userPositionDisplay" class="dropdown-position">No Position</p>
                  <p id="userEmailDisplay" class="dropdown-email">@example.com</p>
                  
                </div>
              </div>
              <hr>
              <a class="dropdown-item" id="profile-link" style="cursor:pointer;">
                <i class="fas fa-user"></i> My Profile
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
              <i class="fas fa-home"></i><span>Dashboard</span>
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
            <dashboard-component id="panelDashboard"></dashboard-component>
            <case-manage         id="panelCaseManage"  class="hidden"></case-manage>
            <view-cases          id="panelViewCases"   class="hidden"></view-cases>
            <personnel-inventory id="panelInventory"   class="hidden"></personnel-inventory>
            <profile-component   id="panelProfile"     class="hidden"></profile-component>
            <profile-setup       id="panelProfileSetup" class="hidden"></profile-setup>
          </div>
        </div>
      </div>
    `;
  }

  async _loadUser() {
    const user = auth.currentUser;
    if (!user) { window.location.href = "login_page.html"; return; }

    let username = (user.displayName || "").trim();
    if (!username && user.email) {
      const cleanedEmail = user.email.trim();
      if (cleanedEmail.toLowerCase().endsWith("@gmail.com")) {
        username = cleanedEmail.slice(0, -"@gmail.com".length);
      } else {
        username = cleanedEmail;
      }
    }
    if (!username) username = "User";
    let position = "No Position";
    let photoURL = user.photoURL || null;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.username) username = d.username;
        if (d.position) position = d.position;
        if (d.photoURL) photoURL = d.photoURL;
      }
    } catch (e) { console.error(e); }

    const avatar = photoURL || "assets/profiles/NoPhoto.png";
    this.querySelector("#userNameDisplay1").textContent = username;
    this.querySelector("#userNameDisplay2").textContent = username;
    this.querySelector("#userEmailDisplay").textContent = user.email;
    this.querySelector("#userPositionDisplay").textContent = position;
    this.querySelector("#userPhoto").src  = avatar;
    this.querySelector("#userPhoto2").src = avatar;

    // Listen for profile updates from profile component
    document.addEventListener("profile-updated", (e) => {
      if (e.detail?.username) {
        this.querySelector("#userNameDisplay1").textContent = e.detail.username;
        this.querySelector("#userNameDisplay2").textContent = e.detail.username;
      }
      if (e.detail?.position) {
        this.querySelector("#userPositionDisplay").textContent = e.detail.position;
      }
      if (e.detail?.photoURL) {
        this.querySelector("#userPhoto").src  = e.detail.photoURL;
        this.querySelector("#userPhoto2").src = e.detail.photoURL;
      }
      // Remove the require-profile restriction once profile is saved
      this.removeAttribute("require-profile");
      this.querySelector("#profile-required-banner")?.remove();

      // Redirect to dashboard panel after profile is saved
      const panelIds = ["panelDashboard", "panelCaseManage", "panelViewCases", "panelInventory", "panelProfile", "panelProfileSetup"];
      const buttonIds = ["btnDashboard", "btnCaseManage", "btnViewCases", "btnInventory"];

      panelIds.forEach(id => {
        const panel = this.querySelector(`#${id}`);
        if (!panel) return;
        if (id === "panelDashboard") panel.classList.remove("hidden");
        else panel.classList.add("hidden");
      });

      buttonIds.forEach(id => {
        const btn = this.querySelector(`#${id}`);
        if (!btn) return;
        if (id === "btnDashboard") btn.classList.add("active");
        else btn.classList.remove("active");
      });

      this.querySelector("#panelProfileSetup")?.classList.add("hidden");
    });
  }

  _bindNav() {
    const panels = {
      btnDashboard:  "panelDashboard",
      btnCaseManage: "panelCaseManage",
      btnViewCases:  "panelViewCases",
      btnInventory:  "panelInventory",
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
      // Also hide profile panels
      this.querySelector("#panelProfile")?.classList.add("hidden");
      this.querySelector("#panelProfileSetup")?.classList.add("hidden");
      this.querySelector("#sidebar")?.classList.remove("active");
    };

    Object.keys(panels).forEach(btnId => {
      this.querySelector(`#${btnId}`)?.addEventListener("click", () => showPanel(btnId));
    });

    // Profile link
    this.querySelector("#profile-link")?.addEventListener("click", () => {
      if (this.hasAttribute("require-profile")) return; // already on setup
      Object.values(panels).forEach(id => this.querySelector(`#${id}`)?.classList.add("hidden"));
      Object.keys(panels).forEach(id => this.querySelector(`#${id}`)?.classList.remove("active"));
      this.querySelector("#panelProfile")?.classList.remove("hidden");
      this.querySelector("#panelProfileSetup")?.classList.add("hidden");
      this.querySelector("#sidebar")?.classList.remove("active");
    });

    // Logout
    this.querySelector("#logoutBtn")?.addEventListener("click", () => {
      signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = "login_page.html";
      });
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

customElements.define("personnel-app", PersonnelApp);
