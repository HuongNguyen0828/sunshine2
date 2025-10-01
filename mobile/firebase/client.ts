// mobile/firebase/client.ts
// Expo (React Native) only Firebase client init.
// - Reads config from Expo Constants (app.json/app.config.* → extra.firebase)
// - Initializes Auth with React Native persistence (AsyncStorage)
// - Safe for Fast Refresh (re-init guard)

import { initializeApp, getApp, getApps, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth/react-native";
import { getAuth } from "firebase/auth"; // fallback if already initialized
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// 1) Read Firebase config from Expo 'extra.firebase'
const extra =
  Constants?.expoConfig?.extra ??
  // legacy fallback (older Expo manifests)
  (Constants as any)?.manifest?.extra ??
  (Constants as any)?.manifest2?.extra;

const config = (extra?.firebase ?? {}) as Partial<FirebaseOptions>;

const required: Array<keyof FirebaseOptions> = ["apiKey", "authDomain", "projectId", "appId"];
for (const k of required) {
  if (!config[k]) {
    throw new Error(`[Firebase/Expo] Missing required config key: ${String(k)} in extra.firebase`);
  }
}

// 2) Initialize app once
const app = getApps().length ? getApp() : initializeApp(config as FirebaseOptions);

// 3) Initialize Auth with RN persistence (guard for Fast Refresh)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // If Auth was already initialized (e.g., Fast Refresh), reuse it
  auth = getAuth(app);
}

// 4) Firestore instance
const db = getFirestore(app);

// 5) Exports
export { app as firebaseApp, auth, db };
export default app;
