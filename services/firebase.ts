import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCB3PUJdra3nGbO4aOQafPkt9McK7ZS8MM",
  authDomain: "bookmol.firebaseapp.com",
  projectId: "bookmol",
  storageBucket: "bookmol.firebasestorage.app",
  messagingSenderId: "535941543062",
  appId: "1:535941543062:web:3cb6d9b076ee0b77f0feb7",
  measurementId: "G-CPFQN3Z78X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, analytics };
