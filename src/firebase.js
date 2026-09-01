import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ganti nilai di bawah ini dengan firebaseConfig dari Firebase Console Anda
const firebaseConfig = {

  apiKey: "AIzaSyDMzvt5aojX81ZobVmlKSR58QRy9GWTT1g",

  authDomain: "warung-dasafa.firebaseapp.com",

  projectId: "warung-dasafa",

  storageBucket: "warung-dasafa.firebasestorage.app",

  messagingSenderId: "380712358680",

  appId: "1:380712358680:web:46a776fb6512ccdc4a846d",

  measurementId: "G-XEVJVZNDK4"

};



const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);