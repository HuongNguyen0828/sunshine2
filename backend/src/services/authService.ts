import { admin } from "../lib/firebase";
import { UserRole } from "../models/user";
import { db } from "../lib/firebase";

/**
 * Find a user's role by email across collections (teachers, parents, admins).
 * Returns the matching UserRole or null if not found.
 */
export async function findRoleByEmail(
  email: string | null
): Promise<UserRole | null> {
  console.log(`    🔎 [findRoleByEmail] Searching for email: ${email}`);

  // Guard clause: reject null/empty emails
  if (!email || !email.trim()) {
    console.log(`      ⚠️  Empty email provided`);
    return null;
  }

  const emailLower = email.trim().toLowerCase();

  // teachers
  const teacherDoc = await db
    .collection("teachers")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  console.log(
    `      Teachers collection: ${teacherDoc.empty ? "not found" : "FOUND"}`
  );
  if (!teacherDoc.empty) return UserRole.Teacher;

  // parents
  const parentDoc = await db
    .collection("parents")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  console.log(
    `      Parents collection: ${parentDoc.empty ? "not found" : "FOUND"}`
  );
  if (!parentDoc.empty) return UserRole.Parent;

  // admins
  const adminDoc = await db
    .collection("admins")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  console.log(
    `      Admins collection: ${adminDoc.empty ? "not found" : "FOUND"}`
  );
  if (!adminDoc.empty) return UserRole.Admin;

  console.log(`      ❌ Email not found in any collection`);
  return null;
}

/**
 * Create a user document in 'users/{uid}'.
 * Skips creation if email is null or empty.
 */
export async function createUser(
  uid: string,
  email: string | null,
  role: string, // keep as string for compatibility; prefer UserRole in new code
  name: string
): Promise<void> {
  console.log(`    👤 [createUser] Creating user...`);
  console.log(`      UID: ${uid}`);
  console.log(`      Email: ${email}`);
  console.log(`      Role: ${role}`);
  console.log(`      Name: ${name}`);

  if (!email || !email.trim()) {
    console.log(`      ⚠️  No email provided, skipping user creation`);
    return;
  }

  const emailLower = email.trim().toLowerCase();

  await db.collection("users").doc(uid).set({
    uid,
    email: emailLower,
    role,
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`      ✅ User document created in 'users' collection`);
}

/**
 * Get a user document by uid.
 * Throws if the document does not exist.
 */
export async function getUserByUid(uid: string) {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) throw new Error("User not found");
  return userDoc.data();
}


export async function findDaycareAndLocationByEmail(email: string | null): Promise<{daycareId: string, locationId: string} | null> {
  // Case: not provide email
  if (!email || !email.trim()) {
    throw new Error("Email required to find daycare and location");
  }
  // else
  try {
    const adminRef = await db.collection("admins")
      .where("email", "==", email.trim().toLowerCase());

    // Extract daycare and location IDs
    const snapshot = await adminRef.get();
    if (snapshot.empty) {
      throw new Error("No matching admin found for provided email");
    }

    // If found
    const adminData = snapshot.docs[0]?.data();

    const daycareId = adminData?.daycareId;
    const locationId = adminData?.locationId;
    // Checking result is valid
    if (!daycareId || !locationId) {
      throw new Error("Admin record missing daycareId or locationId");
    }
    return { daycareId, locationId };

  } catch (error) {
    console.error("Error finding daycareProvider by email:", error);
    return null;
  }

}