import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database"; // Correct import for Realtime Database
import { getStorage } from "firebase/storage";


// const firebaseConfig = {
//     apiKey: "AIzaSyDVR7DvWepRUcMXGsDQbm9_gJIxAVxXKkE",
//     authDomain: "task-game-65770.firebaseapp.com",
//     databaseURL: "https://task-game-65770-default-rtdb.europe-west1.firebasedatabase.app",
//     projectId: "task-game-65770",
//     storageBucket: "task-game-65770.firebasestorage.app",
//     messagingSenderId: "673738120791",
//     appId: "1:673738120791:web:b8c85fb9b36a2ca7528d12"
//   };

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app); // Initialize Firebase Storage

export { auth, database,storage };
