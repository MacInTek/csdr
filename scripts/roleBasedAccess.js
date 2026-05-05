import { auth, db } from "./firebaseConfig.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/**
 * Role-Based Access Control (RBAC) Utilities
 * Check user roles and permissions
 */

/**
 * Get current user's role from Firestore
 * @returns {Promise<string|null>} - "admin", "personnel", or null if not found
 */
export async function getUserRole() {
  if (!auth.currentUser) return null;

  try {
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return snap.data().role || "personnel"; // default to personnel if no role specified
    }
    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

/**
 * Get current user's status
 * @returns {Promise<string|null>} - "pending", "active", or "inactive"
 */
export async function getUserStatus() {
  if (!auth.currentUser) return null;

  try {
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return snap.data().status || "active"; // default to active if no status specified
    }
    return null;
  } catch (error) {
    console.error("Error fetching user status:", error);
    return null;
  }
}

/**
 * Get full user data including role and status
 * @returns {Promise<Object|null>} - User document data
 */
export async function getUserData() {
  if (!auth.currentUser) return null;

  try {
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>}
 */
export async function isAdmin() {
  const role = await getUserRole();
  return role === "admin";
}

/**
 * Check if current user is personnel (non-admin)
 * @returns {Promise<boolean>}
 */
export async function isPersonnel() {
  const role = await getUserRole();
  return role === "personnel";
}

/**
 * Check if current user's account is active
 * @returns {Promise<boolean>}
 */
export async function isAccountActive() {
  const status = await getUserStatus();
  return status === "active";
}

/**
 * Check if current user can access admin features
 * @returns {Promise<boolean>}
 */
export async function canAccessAdmin() {
  const isUserAdmin = await isAdmin();
  const isActive = await isAccountActive();
  return isUserAdmin && isActive;
}

/**
 * Check if current user can access personnel management
 * @returns {Promise<boolean>}
 */
export async function canManagePersonnel() {
  return await canAccessAdmin();
}

/**
 * Check if current user can view activity logs
 * @returns {Promise<boolean>}
 */
export async function canViewActivityLogs() {
  return await canAccessAdmin();
}

/**
 * Check if current user can manage roles
 * @returns {Promise<boolean>}
 */
export async function canManageRoles() {
  return await canAccessAdmin();
}

/**
 * Check if current user can delete users
 * @returns {Promise<boolean>}
 */
export async function canDeleteUsers() {
  return await canAccessAdmin();
}

/**
 * Verify user has required permission
 * Throws error if not authorized
 * @param {Function} checkFunction - async function that returns boolean
 * @param {string} action - action name for error message
 */
export async function requirePermission(checkFunction, action = "perform this action") {
  const hasPermission = await checkFunction();
  if (!hasPermission) {
    throw new Error(`Unauthorized: You do not have permission to ${action}`);
  }
}
