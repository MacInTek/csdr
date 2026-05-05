import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/**
 * Protects routes by checking authentication state
 * @param {string} pageType - Type of page: "auth" (login/signup), "protected" (needs login)
 * @param {string} redirectUrl - URL to redirect to if protection is triggered
 * @param {boolean} requireEmailVerification - Whether to check email verification (default: true)
 */
export function protectRoute(pageType, redirectUrl, requireEmailVerification = true) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (pageType === "auth") {
        // If user is logged in and trying to access login/signup, redirect based on role
        if (user && user.emailVerified) {
          console.log("User is already logged in. Redirecting...");
          window.location.href = "app.html";
        } else if (user && !user.emailVerified) {
          // User exists but email not verified - sign them out
          await auth.signOut();
        }
      } else if (pageType === "protected") {
        // If user is NOT logged in and trying to access protected page, redirect to login
        if (!user) {
          console.log("User is not logged in. Redirecting to login...");
          window.location.href = redirectUrl || "login_page.html";
        } else if (requireEmailVerification && !user.emailVerified) {
          // User is logged in but email not verified
          console.log("Email not verified. Redirecting to login...");
          alert("⚠ Please verify your email before accessing this page.");
          await auth.signOut();
          window.location.href = redirectUrl || "login_page.html";
        }
      }
      resolve(user);
    });
  });
}

/**
 * Protect admin routes - only admins with active status can access
 * @param {string} adminRedirectUrl - URL to redirect if not admin
 * @returns {Promise<boolean>} - true if user is admin, false otherwise
 */
export function protectAdminRoute(adminRedirectUrl = "app.html") {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in
        console.log("User is not logged in. Redirecting to login...");
        window.location.href = "login_page.html";
        resolve(false);
        return;
      }

      if (!user.emailVerified) {
        // Email not verified
        console.log("Email not verified. Redirecting to login...");
        await auth.signOut();
        window.location.href = "login_page.html";
        resolve(false);
        return;
      }

      // Check user role and status in Firestore
      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);

        if (!snap.exists()) {
          console.log("User document not found. Redirecting...");
          window.location.href = adminRedirectUrl;
          resolve(false);
          return;
        }

        const userData = snap.data();
        const isAdmin = userData.role === "admin";
        const isActive = userData.status === "active";

        if (!isAdmin || !isActive) {
          console.log(`User is not admin or account is not active. Redirecting...`);
          window.location.href = adminRedirectUrl;
          resolve(false);
          return;
        }

        // User is admin and active
        resolve(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        window.location.href = adminRedirectUrl;
        resolve(false);
      }
    });
  });
}

/**
 * Check if user is logged in (synchronous check based on localStorage)
 * @returns {boolean} - true if user has login data in localStorage
 */
export function isUserLoggedIn() {
  return !!localStorage.getItem("loggedUser");
}

/**
 * Logout user and redirect
 * @param {string} redirectUrl - URL to redirect after logout
 */
export async function logoutUser(redirectUrl = "login_page.html") {
  try {
    await auth.signOut();
    localStorage.removeItem("loggedUser");
    localStorage.removeItem("loggedUsername");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole"); // NEW: Remove role
    window.location.href = redirectUrl;
  } catch (error) {
    console.error("Logout error:", error);
  }
}
