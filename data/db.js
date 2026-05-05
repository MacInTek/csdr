
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

// Your Firebase project configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBtC1en8dJodBek7MgXEYZwtq0Ci5CJ0Jg",
  authDomain: "csltiv.firebaseapp.com",
  databaseURL: "https://csltiv-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "csltiv",
  storageBucket: "csltiv.firebasestorage.app",
  messagingSenderId: "742195537367",
  appId: "1:742195537367:web:ae19b00b244e47ebb99792",
  measurementId: "G-YGJRZSCVCH"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
const database = getDatabase(app);

export { database, ref, set, onValue };
