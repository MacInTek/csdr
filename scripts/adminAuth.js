import { auth, db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";
import {
  logUserCreation,
  logRoleChange,
  logStatusChange,
  logUserDeleted,
  logAccountSuspension,
  logAccountReactivation
} from "./activityLogger.js";
import { canManagePersonnel, requirePermission } from "./roleBasedAccess.js";

/**
 * Admin Authentication & Personnel Management
 */

/**
 * Get all users (admins and personnel)
 * @returns {Promise<Array>} - Array of user objects
 */
export async function getAllUsers() {
  await requirePermission(canManagePersonnel, "view all users");

  try {
    const q = query(collection(db, "users"), where("role", "in", ["admin", "personnel"]));
    const querySnapshot = await getDocs(q);

    const users = [];
    querySnapshot.forEach((docSnapshot) => {
      users.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

/**
 * Get a specific user
 * @param {string} userId - User ID to fetch
 */
export async function getUser(userId) {
  await requirePermission(canManagePersonnel, "view user details");

  try {
    const userDocRef = doc(db, "users", userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      return {
        id: snap.id,
        ...snap.data()
      };
    }

    throw new Error("User not found");
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID to update
 * @param {Object} updates - Fields to update
 */
export async function updateUserProfile(userId, updates = {}) {
  await requirePermission(canManagePersonnel, "edit user profile");

  try {
    const userDocRef = doc(db, "users", userId);
    const existingUser = await getDoc(userDocRef);

    if (!existingUser.exists()) {
      throw new Error("User not found");
    }

    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    await updateDoc(userDocRef, updateData);

    // Log the modification
    await logUserModified(auth.currentUser.uid, userId, updates);

    return {
      success: true,
      message: "User profile updated successfully"
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Change user role
 * @param {string} userId - User ID
 * @param {string} newRole - New role ("admin" or "personnel")
 */
export async function changeUserRole(userId, newRole) {
  await requirePermission(canManagePersonnel, "change user roles");

  try {
    if (!["admin", "personnel"].includes(newRole)) {
      throw new Error("Invalid role. Must be 'admin' or 'personnel'");
    }

    const userDocRef = doc(db, "users", userId);
    const existingUser = await getDoc(userDocRef);

    if (!existingUser.exists()) {
      throw new Error("User not found");
    }

    const oldRole = existingUser.data().role;

    if (oldRole === newRole) {
      throw new Error("User already has this role");
    }

    // Cannot demote last admin
    if (oldRole === "admin" && newRole === "personnel") {
      const admins = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      if (admins.size === 1) {
        throw new Error("Cannot demote the last admin");
      }
    }

    await updateDoc(userDocRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });

    // Log the role change
    await logRoleChange(auth.currentUser.uid, userId, oldRole, newRole);

    return {
      success: true,
      message: `User role changed from ${oldRole} to ${newRole}`
    };
  } catch (error) {
    console.error("Error changing user role:", error);
    throw error;
  }
}

/**
 * Change user status
 * @param {string} userId - User ID
 * @param {string} newStatus - New status ("active" or "inactive")
 */
export async function changeUserStatus(userId, newStatus) {
  await requirePermission(canManagePersonnel, "change user status");

  try {
    if (!["active", "inactive"].includes(newStatus)) {
      throw new Error("Invalid status. Must be 'active' or 'inactive'");
    }

    const userDocRef = doc(db, "users", userId);
    const existingUser = await getDoc(userDocRef);

    if (!existingUser.exists()) {
      throw new Error("User not found");
    }

    const oldStatus = existingUser.data().status || "active";

    if (oldStatus === newStatus) {
      throw new Error("User already has this status");
    }

    await updateDoc(userDocRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    // Log the status change
    await logStatusChange(auth.currentUser.uid, userId, oldStatus, newStatus);

    // Log suspension or reactivation
    if (newStatus === "inactive") {
      await logAccountSuspension(auth.currentUser.uid, userId);
    } else if (newStatus === "active") {
      await logAccountReactivation(auth.currentUser.uid, userId);
    }

    return {
      success: true,
      message: `User status changed to ${newStatus}`
    };
  } catch (error) {
    console.error("Error changing user status:", error);
    throw error;
  }
}

/**
 * Suspend user account
 * @param {string} userId - User ID to suspend
 * @param {string} reason - Reason for suspension
 */
export async function suspendUser(userId, reason = null) {
  return await changeUserStatus(userId, "inactive");
}

/**
 * Reactivate user account
 * @param {string} userId - User ID to reactivate
 */
export async function reactivateUser(userId) {
  return await changeUserStatus(userId, "active");
}

/**
 * Delete user account
 * @param {string} userId - User ID to delete
 */
export async function deleteUser(userId) {
  await requirePermission(canManagePersonnel, "delete user accounts");

  try {
    if (userId === auth.currentUser.uid) {
      throw new Error("Cannot delete your own account");
    }

    // Call Cloud Function to delete user from both Auth and Firestore
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    
    const result = await deleteUserFunction({ userId });
    
    console.log("User deleted successfully:", result.data);
    
    return {
      success: true,
      message: "User deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Get activity logs with filtering
 * @param {Object} filters - Filter options {actionType, userId, dateFrom, dateTo, limit}
 */
export async function getActivityLogs(filters = {}) {
  await requirePermission(canManagePersonnel, "view activity logs");

  try {
    let q = collection(db, "activity_logs");

    // Build query based on filters
    const constraints = [];

    if (filters.actionType) {
      constraints.push(where("action", "==", filters.actionType));
    }

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);

    const logs = [];
    querySnapshot.forEach((docSnapshot) => {
      logs.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit if specified
    const limit = filters.limit || 100;
    return logs.slice(0, limit);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    throw error;
  }
}

/**
 * Get admin statistics
 * @returns {Promise<Object>} - Statistics object
 */
export async function getAdminStats() {
  await requirePermission(canManagePersonnel, "view statistics");

  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const adminCount = usersSnapshot.docs.filter(
      (doc) => doc.data().role === "admin"
    ).length;
    const personnelCount = usersSnapshot.docs.filter(
      (doc) => doc.data().role === "personnel" || doc.data().role === ""
    ).length;
    const activeCount = usersSnapshot.docs.filter(
      (doc) => doc.data().status === "active"
    ).length;
    const inactiveCount = usersSnapshot.docs.filter(
      (doc) => doc.data().status === "inactive"
    ).length;

    return {
      totalUsers: usersSnapshot.size,
      admins: adminCount,
      personnel: personnelCount,
      activeUsers: activeCount,
      inactiveUsers: inactiveCount,
      timestamp: new Date()
    };
  } catch (error) {
    console.error("Error fetching statistics:", error);
    throw error;
  }
}
