import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBJub9tBuP1QLJE3emSdFfLMNAroa_iOGM",
  authDomain: "sehatmitra-ai.firebaseapp.com",
  projectId: "sehatmitra-ai",
  storageBucket: "sehatmitra-ai.firebasestorage.app",
  messagingSenderId: "922815956180",
  appId: "1:922815956180:web:fedddad92599eb0f242741",
  measurementId: "G-34BL63C55F"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

