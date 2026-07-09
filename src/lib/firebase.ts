import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

/* ================================================================
   Phase 13 — Google sign-in only (identity, not data sync yet).
   This module is dynamically imported (see lib/auth.ts) so the
   Firebase SDK never initializes when LifeOS is opened as a plain
   local file — sign-in needs a real http(s) origin anyway.

   The config below is the public, client-side Firebase config (it
   identifies the project; it is not a secret — see Firebase's own
   docs on this). Data stays 100% local to this device until Phase 14
   (Firestore sync) ships.
   ================================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyCB8AoEdlvSTmE_Q_pRFUAWQthNQfeqzo0",
  authDomain: "lifeos-ec00a.firebaseapp.com",
  projectId: "lifeos-ec00a",
  storageBucket: "lifeos-ec00a.firebasestorage.app",
  messagingSenderId: "750733424104",
  appId: "1:750733424104:web:48faad62ffc697c8cda05d",
  measurementId: "G-71VVFWJT2L",
};

let app: FirebaseApp | undefined;
function firebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

const googleProvider = new GoogleAuthProvider();

function auth() {
  return getAuth(firebaseApp());
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth(), googleProvider);
  return cred.user;
}

export async function signOutOfGoogle(): Promise<void> {
  await signOut(auth());
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth(), cb);
}

export type { User };
