import { auth, db } from "./firebaseConfig.js";
import { signInWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { logLogin } from "./activityLogger.js";


document.addEventListener('DOMContentLoaded', () => {

    // try both ids to match HTML
  const submitBtn = document.getElementById('submit-btn') || document.getElementById('submit-btn');
  if (!submitBtn) {
    console.warn('login button not found (expected id "login-btn" or "submit-btn")');
    return;
  }

  submitBtn.addEventListener('click', async function(e) {
    e.preventDefault();

    //input validation
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginValidDiv = document.getElementById('login-valid');


    if (!email || !password) {
      loginValidDiv.innerText = "⚠ Please fill in all fields.";
      loginValidDiv.style.display = "block";
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        await logLogin(user.uid, false, "email_not_verified");
        loginValidDiv.style.display = "none";

        // Show modal instead of alert and confirm
        showVerificationModal(user);

        // Sign out the user
        await auth.signOut();
        return;
      }

      // Check if user exists in Firestore
      let userData = null;
      let status = "pending"; // Default status
      let role = "personnel"; // Default role

      try {
        const userDocRef = doc(db, "users", user.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          userData = snap.data();
          status = userData.status || "pending";
          role = userData.role || "personnel";

          // Update lastLogin timestamp
          await updateDoc(userDocRef, { lastLogin: new Date() });
        } else {
          // User not in Firestore yet - check if account is pending
          status = "pending";
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        status = "pending";
      }

      // Check if account is inactive
      if (status === "inactive") {
        await logLogin(user.uid, false, "account_inactive");
        loginValidDiv.innerText = "❌ Your account has been suspended. Please contact an administrator.";
        loginValidDiv.style.display = "block";
        await auth.signOut();
        return;
      }

      // Account is active - proceed with login
      const username = userData?.username || user.email;

      // Store email and username locally
      localStorage.setItem("loggedUser", JSON.stringify(user.email));
      localStorage.setItem("loggedUsername", JSON.stringify(username));
      localStorage.setItem("userRole", JSON.stringify(role)); // NEW: Store role

      // Log successful login
      await logLogin(user.uid, true);

      // Redirect to app — role-based routing handled by app.js
      if (role === "admin" || role === "personnel") {
        window.location.href = "app.html";
      } else {
        window.location.href = "app.html";
      }
    } catch (error) {
      await logLogin(email, false, "invalid_credentials");
      if (error.code === "auth/invalid-credential") {
        loginValidDiv.innerText = "❌ Incorrect email or password.";
      } else if (error.code === "auth/user-not-found") {
        loginValidDiv.innerText = "❌ No account found with this email.";
      } else if (error.code === "auth/wrong-password") {
        loginValidDiv.innerText = "❌ Incorrect password.";
      } else {
        loginValidDiv.innerText = "❌ Login failed. Please try again.";
      }
      loginValidDiv.style.display = "block";
      console.error("Login error:", error);
    }
  });
});

document.getElementById("email").addEventListener("focus", () => {
    document.getElementById("login-valid").style.display = "none";
});

document.getElementById("password").addEventListener("focus", () => {
    document.getElementById("login-valid").style.display = "none";
});



// =====================
// Email Verification Modal
// =====================
function showVerificationModal(user) {
  const modal = document.getElementById("verificationModal");
  const resendBtn = document.getElementById("resendBtn");
  const closeBtn = document.getElementById("modalCloseBtn");
  const modalMessage = document.getElementById("modalMessage");
  
  modal.classList.add("show");
  
  // Resend verification email
  resendBtn.addEventListener("click", async () => {
    resendBtn.disabled = true;
    resendBtn.textContent = "Sending...";
    
    try {
      await sendEmailVerification(user);
      modalMessage.textContent = "✅ Verification email sent! Please check your inbox and spam folder.";
      modalMessage.style.color = "var(--primary-green)";
      resendBtn.textContent = "Email Sent!";
      
      setTimeout(() => {
        modal.classList.remove("show");
      }, 2000);
    } catch (err) {
      modalMessage.textContent = "❌ Error sending verification email. Please try again later.";
      modalMessage.style.color = "#e74c3c";
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend Email";
    }
  });
  
  // Close modal
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });
}





