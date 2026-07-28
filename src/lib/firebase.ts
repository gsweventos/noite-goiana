import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Todas as chaves abaixo são PÚBLICAS por natureza (o SDK client-side do Firebase
 * não expõe segredos — a segurança real vem das Firestore Security Rules e das
 * Cloud Functions, que rodam no servidor). Ainda assim, mantemos tudo em variáveis
 * de ambiente para facilitar troca entre projetos (dev/staging/produção).
 *
 * Ver .env.example na raiz do projeto.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Modo mock: enquanto não houver um projeto Firebase configurado (.env vazio),
 * o app inteiro roda com dados fictícios em memória (src/services/mockData.ts),
 * para que toda a interface seja demonstrável sem backend.
 *
 * Basta preencher o .env com um projeto real para USE_MOCK virar false
 * automaticamente e os serviços passarem a usar Firestore/Auth/Storage de verdade.
 */
export const USE_MOCK = !firebaseConfig.apiKey || !firebaseConfig.projectId;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (!USE_MOCK) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
