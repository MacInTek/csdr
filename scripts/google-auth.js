// import { auth } from "./firebaseConfig.js";
// import { 
//   GoogleAuthProvider, 
//   signInWithPopup, 
//   signInWithRedirect,
//   getRedirectResult
// } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// const provider = new GoogleAuthProvider();

// const loginBtn = document.getElementById("google-btn");

// // Detect mobile browser
// function isMobile() {
//   return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
// }

// loginBtn.addEventListener("click", async () => {
//   try {
//     if (isMobile()) {
//       console.log("Using redirect for mobile");
//       await signInWithRedirect(auth, provider);
//       return; // page will redirect to Google
//     }

//     // Desktop popup login
//     const result = await signInWithPopup(auth, provider);
//     console.log("Signed in:", result.user);
//     alert(`Welcome ${result.user.displayName}!`);
//     window.location.href = "./home_page.html";
//   } catch (error) {
//     console.error("Login error:", error);
//   }
// });







