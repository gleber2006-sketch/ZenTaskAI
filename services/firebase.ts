import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// TODO: Substitua pelas suas configurações do console do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBP0fw0FcWP22soZN--gLXb5nK4gTmi0hk",
    authDomain: "zentask-ai.firebaseapp.com",
    projectId: "zentask-ai",
    storageBucket: "zentask-ai.firebasestorage.app",
    messagingSenderId: "704648689934",
    appId: "1:704648689934:web:8075afe68e679b896dff5f",
    measurementId: "G-T1MWGE2743"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Ativar persistência offline
import { enableIndexedDbPersistence } from "firebase/firestore";
if (typeof window !== "undefined") {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Múltiplas abas abertas, persistência habilitada apenas na primeira.");
        } else if (err.code === 'unimplemented') {
            console.warn("O navegador atual não suporta persistência offline.");
        }
    });
}

export default app;
