// shared/firebase/client.ts
// Web (Next.js) only Firebase client init — no Expo dependency.

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Read from NEXT_PUBLIC_* envs (browser-safe)
const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Minimal validation
(["apiKey", "authDomain", "projectId", "appId"] as const).forEach((k) => {
  if (!(config as Record<string, unknown>)[k]) {
    throw new Error(`[Firebase] Missing required config key: ${k}`);
  }
});

const app = getApps().length ? getApp() : initializeApp(config);

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
