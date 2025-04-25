import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // NEW

const firebaseConfig = {
  apiKey: "AIzaSyAmRNk6GRnjdaN3cIU5vnMJ1J4fGiAFEm0",
  authDomain: "timesync-ai.firebaseapp.com",
  projectId: "timesync-ai",
  storageBucket: "timesync-ai.firebasestorage.app",
  messagingSenderId: "141961044493",
  appId: "1:141961044493:web:85481c36c4a3f02609eb44",
  measurementId: "G-ZH5KPD2EP9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app); // NEW
export { auth, db }; // NOW exporting both