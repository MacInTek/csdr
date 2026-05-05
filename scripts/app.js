import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Resolve auth state once — no re-fire loops
const user = await new Promise((resolve) => {
  const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
});

const loading = document.getElementById("app-loading");
const root    = document.getElementById("app-root");

// Not logged in or email not verified
if (!user || !user.emailVerified) {
  if (user && !user.emailVerified) await signOut(auth);
  window.location.href = "login_page.html";
} else {
  // Fetch user doc from Firestore
  let role = "personnel";
  let needsProfile = false;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      role = d.role || "personnel";
      // New user if username or position is missing/empty
      needsProfile = !d.username || !d.position;
    } else {
      needsProfile = true; // doc doesn't exist yet
    }
  } catch (err) {
    console.error("Failed to fetch role:", err);
  }

  loading.style.display = "none";

  if (role === "admin") {
    await import("../components/adminApp.js");
    const adminEl = document.createElement("admin-app");
    if (needsProfile) adminEl.setAttribute("require-profile", "true");
    root.appendChild(adminEl);
  } else {
    await import("../components/personnelApp.js");
    const el = document.createElement("personnel-app");
    if (needsProfile) el.setAttribute("require-profile", "true");
    root.appendChild(el);
  }
}
