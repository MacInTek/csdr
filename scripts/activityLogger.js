import { auth, db } from "./firebaseConfig.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/**
 * Activity Logger - Audit trail for admin actions and user activities
 */

/**
 * Log a login attempt
 * @param {string} userId - User ID
 * @param {boolean} success - Whether login was successful
 * @param {string} reason - Reason if failed (e.g., "email_not_verified", "account_pending")
 */
export async function logLogin(userId, success = true, reason = null) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      userId: userId,
      action: "login",
      success: success,
      reason: reason,
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging login:", error);
  }
}

/**
 * Log user creation by admin
 * @param {string} adminId - Admin user ID
 * @param {string} newUserId - New user ID
 * @param {Object} userDetails - User details (email, etc.)
 * @param {string} method - How user was created ("approval", "direct_creation")
 */
export async function logUserCreation(adminId, newUserId, userDetails = {}, method = "approval") {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "user_created",
      targetUserId: newUserId,
      details: {
        email: userDetails.email || null,
        method: method
      },
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging user creation:", error);
  }
}

/**
 * Log user profile modification
 * @param {string} adminId - Admin user ID who made the change
 * @param {string} targetUserId - User ID that was modified
 * @param {Object} changes - Object describing what changed
 */
export async function logUserModified(adminId, targetUserId, changes = {}) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "user_modified",
      targetUserId: targetUserId,
      details: changes,
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging user modification:", error);
  }
}

/**
 * Log role change
 * @param {string} adminId - Admin user ID who made the change
 * @param {string} targetUserId - User whose role was changed
 * @param {string} oldRole - Previous role
 * @param {string} newRole - New role
 */
export async function logRoleChange(adminId, targetUserId, oldRole, newRole) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "role_changed",
      targetUserId: targetUserId,
      details: {
        oldRole: oldRole,
        newRole: newRole
      },
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging role change:", error);
  }
}

/**
 * Log status change (pending -> active, active -> inactive, etc.)
 * @param {string} adminId - Admin user ID
 * @param {string} targetUserId - User whose status changed
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
export async function logStatusChange(adminId, targetUserId, oldStatus, newStatus) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "status_changed",
      targetUserId: targetUserId,
      details: {
        oldStatus: oldStatus,
        newStatus: newStatus
      },
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging status change:", error);
  }
}

/**
 * Log user deletion
 * @param {string} adminId - Admin user ID who deleted the user
 * @param {string} targetUserId - User ID that was deleted
 * @param {string} email - Email of deleted user
 */
export async function logUserDeleted(adminId, targetUserId, email = null) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "user_deleted",
      targetUserId: targetUserId,
      details: {
        email: email
      },
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging user deletion:", error);
  }
}

/**
 * Log account suspension
 * @param {string} adminId - Admin user ID
 * @param {string} targetUserId - User suspended
 * @param {string} reason - Reason for suspension
 */
export async function logAccountSuspension(adminId, targetUserId, reason = null) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "account_suspended",
      targetUserId: targetUserId,
      details: {
        reason: reason
      },
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging account suspension:", error);
  }
}

/**
 * Log account reactivation
 * @param {string} adminId - Admin user ID
 * @param {string} targetUserId - User reactivated
 */
export async function logAccountReactivation(adminId, targetUserId) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminId: adminId,
      action: "account_reactivated",
      targetUserId: targetUserId,
      details: {},
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging account reactivation:", error);
  }
}

/**
 * Helper: Get user agent string
 */
function getUserAgent() {
  return navigator.userAgent || "Unknown";
}

/**
 * Helper: Get client IP (limited - requires backend support)
 * Note: This returns a placeholder. Real IP detection requires backend.
 */
async function getClientIP() {
  try {
    // For client-side, we can't reliably get IP
    // This would require a backend API call
    return "unknown";
  } catch (error) {
    return "unknown";
  }
}

/**
 * Generic action logger
 * @param {string} action - Action type
 * @param {Object} metadata - Additional metadata to log
 */
export async function logAction(action, metadata = {}) {
  try {
    await addDoc(collection(db, "activity_logs"), {
      action: action,
      details: metadata,
      timestamp: serverTimestamp(),
      userAgent: getUserAgent(),
      ip: await getClientIP()
    });
  } catch (error) {
    console.error("Error logging action:", error);
  }
}
