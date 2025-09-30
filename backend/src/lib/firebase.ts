import admin from "firebase-admin"


// Initialize Firebase Admin SDK 
admin.initializeApp({
  credential: admin.credential.cert(require("../../serviceAccountKey.json")),
});

// Firestore reference
export const db = admin.firestore();

export {admin} ;