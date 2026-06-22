import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDDDk-FnqPmxxpwld6pvXSP_O1yUfm911o",
  authDomain: "grounded-mountain-2dckx.firebaseapp.com",
  projectId: "grounded-mountain-2dckx",
  storageBucket: "grounded-mountain-2dckx.firebasestorage.app",
  messagingSenderId: "548148934687",
  appId: "1:548148934687:web:5c344afb2b760a06a5bd2a"
};

const app = initializeApp(firebaseConfig);

// Acessa o Firestore utilizando o database ID específico configurado
export const db = getFirestore(app, "ai-studio-a8a1c2da-08d2-4aef-b769-ada8e1601848");

// Inicializa e exporta o Firebase Auth
export const auth = getAuth(app);

// Inicializa e exporta o Firebase Storage
export const storage = getStorage(app);
