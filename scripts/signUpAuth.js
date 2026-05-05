import { auth, db } from "./firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// =====================
// Password Validator
// =====================
function validatePassword(password) {
  if (password.length < 8) {
    return "Password must be at least 6 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one symbol.";
  }
  return null; // valid
}

// =====================
// Form Submit
// =====================
const submitBtn = document.getElementById("submit-btn");
const loginValidDiv = document.getElementById("login-valid");



submitBtn.addEventListener("click", function (e) {
  e.preventDefault();
  
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  

  loginValidDiv.style.display = "none";

  // 1️⃣ Empty fields check
  if (!email || !password || !confirmPassword ) {
    showError("Please fill in all fields.");
    return;
  }

  // 2️⃣ Password match check
  if (password !== confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  // 3️⃣ Password strength check
  const passwordError = validatePassword(password);
  if (passwordError) {
    showError(passwordError);
    return;
  }

  // 4️⃣ Firebase Signup
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      // Save user doc with default role
      try {
        await setDoc(doc(db, "users", user.uid), {
          email: email,
          role: "personnel",
          status: "active",
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Error saving user doc:", err.message);
      }

      // Sign out immediately — user must verify email before logging in
      await signOut(auth);

      showSuccessModal();
    })
    .catch((error) => {
      if (error.code === "auth/email-already-in-use") {
        showError("Email already exists. Please login instead.");
      } else if (error.code === "auth/invalid-email") {
        showError("Invalid email address.");
      } else if (error.code === "auth/weak-password") {
        showError("Password is too weak. Please use a stronger password.");
      } else {
        showError("Something went wrong. Try again.");
      }
      console.error(error);
    });
});

// =====================
// Helpers
// =====================
function showError(message) {
  loginValidDiv.innerText = "⚠ " + message;
  loginValidDiv.style.display = "block";
}

// Hide error on focus
["email", "password", "confirm-password"].forEach((id) => {
  document.getElementById(id).addEventListener("focus", () => {
    loginValidDiv.style.display = "none";
  });
});

// =====================
// Success Modal
// =====================
function showSuccessModal() {
  const modal = document.getElementById("successModal");
  const okBtn = document.getElementById("modalOkBtn");

  const modalTitle = modal.querySelector(".modal-title");
  const modalMessage = modal.querySelector(".modal-message");

  if (modalTitle) {
    modalTitle.textContent = "Account Created!";
  }
  if (modalMessage) {
    modalMessage.textContent = "A verification email has been sent to your inbox. Please check your email and click the verification link before logging in.";
  }

  modal.classList.add("show");

  okBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    window.location.href = "../login_page.html";
  });
}
