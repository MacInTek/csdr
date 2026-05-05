import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getDatabase } from 
"https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";


export const firebaseConfig = {
  apiKey: "AIzaSyBtC1en8dJodBek7MgXEYZwtq0Ci5CJ0Jg",
  authDomain: "csltiv.firebaseapp.com",
  databaseURL: "https://csltiv-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "csltiv",
  storageBucket: "csltiv.firebasestorage.app",
  messagingSenderId: "742195537367",
  appId: "1:742195537367:web:ae19b00b244e47ebb99792",
  measurementId: "G-YGJRZSCVCH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

