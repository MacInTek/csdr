const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Delete a user from Firebase Auth and Firestore
 * Only admins can delete other users
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to delete users.'
      );
    }

    const { userId } = data;

    // Validate userId parameter
    if (!userId || typeof userId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId parameter is required and must be a string.'
      );
    }

    // Verify that the caller is an admin
    const callerDoc = await admin
      .firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();

    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Caller user document not found in Firestore.'
      );
    }

    const callerData = callerDoc.data();
    if (callerData.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can delete users.'
      );
    }

    // Prevent admin from deleting themselves
    if (context.auth.uid === userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You cannot delete your own admin account.'
      );
    }

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(userId);
    console.log(`Deleted auth user: ${userId}`);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(userId).delete();
    console.log(`Deleted Firestore user document: ${userId}`);

    // Log the deletion activity
    await admin.firestore().collection('activity_logs').doc().set({
      action: 'user_deleted',
      adminId: context.auth.uid,
      targetUserId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: `Admin deleted user account`
    });

    return {
      success: true,
      message: `User ${userId} has been successfully deleted.`,
      deletedUserId: userId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error deleting user:', error);

    // Return appropriate error response
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found in Firebase Authentication.'
      );
    }

    if (error.code === 'permission-denied') {
      throw new functions.https.HttpsError(
        'permission-denied',
        error.message
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to delete user: ${error.message}`
    );
  }
});
