import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDKSQKuECqz5HTdrNhgiyT3DYo0RDbkwng",
  authDomain: "crackitoko.firebaseapp.com",
  projectId: "crackitoko",
  storageBucket: "crackitoko.firebasestorage.app",
  messagingSenderId: "366293347656",
  appId: "1:366293347656:web:5aeebd4a35fa812afe577d",
  measurementId: "G-4360LK9XN6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);