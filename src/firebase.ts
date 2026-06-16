import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "mikismind-6b4a9",
  appId: "1:1040293280642:web:fc4b5110c126d36815ed9b",
  storageBucket: "mikismind-6b4a9.firebasestorage.app",
  apiKey: "AIzaSyCTRd0CIwL2GGxg3U21CR7kl0Zowv31ZVQ",
  authDomain: "mikismind-6b4a9.firebaseapp.com",
  messagingSenderId: "1040293280642",
  measurementId: "G-YFD4W5QLXY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Guarantee local storage persistence for browser & standalone shortcuts
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Firebase auth persistence configuration failed:", err);
});
