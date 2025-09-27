// lib/firebase.ts
// Client-side Firebase initialization for Next.js (App Router)
// - Prevents re-initialization during Fast Refresh
// - Safe to import in client components only

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TIP: All NEXT_PUBLIC_* must exist in .env for client usage
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,          // non-null assertion for DX
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional unless using Analytics
};

// Avoid duplicate initialization during Fast Refresh
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firestore and Auth singletons
export const db = getFirestore(app);
export const auth = getAuth(app);


export default app;

/* 
  If you need Analytics later:
  import { getAnalytics, isSupported } from 'firebase/analytics';
  export const analytics = typeof window !== 'undefined'
    ? await isSupported().then(s => (s ? getAnalytics(app) : undefined))
    : undefined;
*/
