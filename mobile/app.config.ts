// mobile/app.config.ts
import { ExpoConfig } from "expo/config";
import "dotenv/config";


const config: ExpoConfig = {
  name: "Sunshine",
  slug: "sunshine",
  scheme: "sunshine",
  plugins: ["expo-router"],
  owner: "huongexpo", // <-- Add this line
  experiments: { typedRoutes: true },
  android: {
    package: "com.huongexpo.sunshine",
    googleServicesFile: "./google-services.json" // optional, but needed for Firebase notifications
  },
  extra: {
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, 
      baseUrl: process.env.EXPO_PUBLIC_API_URL
    },
    eas: {
        projectId: "fa9800b2-2029-4bdb-8a56-ec9de2437e04" // manually set
      },  
  }, 
};

export default config;
