import { admin } from "../lib/firebase";
import {UserRole} from "../models/user"
import {db} from "../lib/firebase" // import db from main server.ts


// Checking email exist before let user signup: email could be null from verify token
export async function findRoleByEmail(email: string | null): Promise<UserRole | null>{

  const teacherDoc = await db.collection("teachers")
    .where("email", "==", email)
    .get();
  if (!teacherDoc.empty) return UserRole.Teacher;

  const parentDoc = await db.collection("parents")
    .where("email", "==", email)
    .get();
  if (!parentDoc.empty) return UserRole.Parent;

  const adminDoc = await db.collection("admins")
    .where("email", "==", email)
    .get();
  if (!adminDoc.empty) return UserRole.Admin;

  return null;
}


// Create new user after checking user email is valid
export async function createUser(uid: string, email: string | null, role: string, name: string) {
  // If email is undefined, no create new user
  if (!email) return;

  // Else, create user in Firestore Auth
  await db.collection("users").doc(uid).set({
    uid,
    email,
    role,
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// Get user by uid
export async function getUserByUid(uid: string) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new Error("User not found");
  return userDoc.data
  ();
}


// Other services like: 


// User updating email

// Reset Password


// Change role