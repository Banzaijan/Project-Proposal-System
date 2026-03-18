import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDitk04fzJ3fISPUbYckHvEQUzG6bGy8JY",
  authDomain:        "project-proposal-system.firebaseapp.com",
  projectId:         "project-proposal-system",
  storageBucket:     "project-proposal-system.firebasestorage.app",
  messagingSenderId: "243318928571",
  appId:             "1:243318928571:web:6634aab13e9088ca12e59e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);