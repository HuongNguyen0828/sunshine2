
import { admin } from "../lib/firebase";
import { UserRole } from "../models/user";
import { db } from "../lib/firebase";


// Checking email exist before let user signup: email could be null from verify token
export async function findRoleByEmail(email: string | null): Promise<UserRole | null>{

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
  if (!teacherDoc.empty) return UserRole.Teacher;

  // parents
  const parentDoc = await db
    .collection("parents")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  if (!parentDoc.empty) return UserRole.Parent;

  // admins
  const adminDoc = await db
    .collection("admins")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  if (!adminDoc.empty) return UserRole.Admin;

  return null;
}


// Create new user after checking user email is valid
export async function createUser(uid: string, email: string | null, role: string, name: string) {

  // If email is undefined, no create new user
  if (!email) {
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


// Other services like: 
// Updating user email

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