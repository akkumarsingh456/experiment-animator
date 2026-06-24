// Firebase web SDK client. Web config values are public/publishable.
// Add these in Workspace Settings → Build Secrets (or a local .env) as
// VITE_FIREBASE_* so Vite can inline them at build time.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket,
);

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebase() {
  if (!firebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Add VITE_FIREBASE_* keys in Workspace Settings → Build Secrets.",
    );
  }
  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig);
    _db = getFirestore(_app);
    _storage = getStorage(_app);
  }
  return { app: _app!, db: _db!, storage: _storage! };
}
