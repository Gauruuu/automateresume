import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBibXQt3X4dW-sXWKjNXNxxlOMQ0iJbQt0",
  authDomain: "automate-resume-821a6.firebaseapp.com",
  projectId: "automate-resume-821a6",
  storageBucket: "automate-resume-821a6.firebasestorage.app",
  messagingSenderId: "218358762768",
  appId: "1:218358762768:web:04015be4edc1abaef6e995",
  measurementId: "G-EXZGPCZL3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Simple Google Login function
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
  }
};

// Logout function
export const logout = () => signOut(auth);