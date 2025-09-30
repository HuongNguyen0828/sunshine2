import admin from "firebase-admin";
import {UserRole} from "../models/user"
import {db} from "../server" // import db from main server.ts


// Checking email exist before let user signup: email could be null from verify token
export async function findRoleByEmail(email: string | null): Promise<UserRole | null>{
  console.log(`    🔎 [findRoleByEmail] Searching for email: ${email}`);

  const teacherDoc = await db.collection("teachers")
    .where("email", "==", email)
    .get();
  console.log(`      Teachers collection: ${teacherDoc.empty ? 'not found' : 'FOUND'}`);
  if (!teacherDoc.empty) return UserRole.Teacher;

  const parentDoc = await db.collection("parents")
    .where("email", "==", email)
    .get();
  console.log(`      Parents collection: ${parentDoc.empty ? 'not found' : 'FOUND'}`);
  if (!parentDoc.empty) return UserRole.Parent;

  const adminDoc = await db.collection("admins")
    .where("email", "==", email)
    .get();
  console.log(`      Admins collection: ${adminDoc.empty ? 'not found' : 'FOUND'}`);
  if (!adminDoc.empty) return UserRole.Admin;

  console.log(`      ❌ Email not found in any collection`);
  return null;
}


// Create new user after checking user email is valid
export async function createUser(uid: string, email: string | null, role: string, name: string) {
  console.log(`    👤 [createUser] Creating user...`);
  console.log(`      UID: ${uid}`);
  console.log(`      Email: ${email}`);
  console.log(`      Role: ${role}`);
  console.log(`      Name: ${name}`);

  // If email is undefined, no create new user
  if (!email) {
    console.log(`      ⚠️  No email provided, skipping user creation`);
    return;
  }

  // Else, create user in Firestore Auth
  await db.collection("users").doc(uid).set({
    uid,
    email,
    role,
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`      ✅ User document created in 'users' collection`);
}

// Get user by uid
export async function getUserByUid(uid: string) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new Error("User not found");
  return userDoc.data();
}