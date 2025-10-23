// backend/src/lib/firebase.ts
import admin from "firebase-admin";

// Build service account object from .env variables
function buildServiceAccount() {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FB_PROJECT_ID / FB_CLIENT_EMAIL / FB_PRIVATE_KEY");
  }
  return { projectId, clientEmail, privateKey };
}

// Initialize only once
if (!admin.apps.length) {
  // Prefer env service account; fall back to applicationDefault when available
  const useAppDefault = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT;
  if (useAppDefault) {
    admin.initializeApp();
  } else {
    const sa = buildServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.projectId,
        clientEmail: sa.clientEmail,
        privateKey: sa.privateKey,
      }),
    });
  }
}

export { admin };
export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
export const adminAuth = admin.auth();
