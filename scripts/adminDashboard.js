import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { logoutUser } from "./routeProtection.js";

/**
 * Admin Dashboard Main Script
 * Handles navigation, user setup, and component management
 */

let currentSection = "dashboard";

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  // Check auth state
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login_page.html";
      return;
    }

    // Load admin user info
    await loadAdminInfo(user.uid);

    // Setup navigation
    setupNavigation();

    // Setup logout button
    setupLogoutButton();
  });
});

/**
 * Load admin information and display in navbar
 */
async function loadAdminInfo(userId) {
  try {
    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const userData = snap.data();
      const userName = userData.profileData?.firstName ||
        userData.username ||
        userData.email ||
        "Admin";

      document.getElementById("userName").textContent = userName;
    }
  } catch (error) {
    console.error("Error loading admin info:", error);
  }
}

/**
 * Setup sidebar navigation
 */
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      navigateToSection(section);

      // Update active state
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Handle navigation from components (e.g., quick actions)
  const statsComponent = document.getElementById("statsComponent");
  if (statsComponent) {
    statsComponent.addEventListener("navigate", (e) => {
      const section = e.detail.section;
      const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
      if (navItem) {
        navItem.click();
      }
    });
  }
}

/**
 * Navigate to a specific section
 */
function navigateToSection(section) {
  currentSection = section;

  // Hide all sections
  const sections = document.querySelectorAll(".section");
  sections.forEach(sec => sec.classList.remove("active"));

  // Show selected section
  const selectedSection = document.getElementById(`${section}-section`);
  if (selectedSection) {
    selectedSection.classList.add("active");
  }
}

/**
 * Setup logout button
 */
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to logout?")) {
        await logoutUser("login_page.html");
      }
    });
  }
}
