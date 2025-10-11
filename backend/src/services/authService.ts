
import { admin } from "../lib/firebase";
import { UserRole } from "../models/user";
import { db } from "../lib/firebase";


/**
 * Find a user's role by email across user collections.
 * Returns the matching UserRole or null if not found.
 * Errors: if email is null/empty, or if role is invalid.
 */
export async function findRoleByEmail(
  email: string | null
): Promise<UserRole | null> {
  // Guard clause: reject null/empty emails
  if (!email || !email.trim()) {
    return null;
  }
  // Cleanup email input
  const emailLower = email.trim().toLowerCase();

  // Query users collection for matching email
  const userDoc = await db
    .collection("users")
    .where("email", "==", emailLower)
    .limit(1)
    .get();

  // If no user found
  if (userDoc.empty) return null;
  const userData = userDoc.docs[0]?.data();

  //  Checking role:
  const role = userData?.role;
  if (role === UserRole.Teacher) return UserRole.Teacher;
  if (role === UserRole.Parent) return UserRole.Parent;
  if (role === UserRole.Admin) return UserRole.Admin;

  // If role is nether Teacher nor Parent nor Admin
  throw new Error("User role is invalid");
}

/**
 * Update user document after authentication if role is defined.
 * Sets isRegistered to true.
 * Set doc id to uid from Firebase Auth.
 * Returns true if update successful, false otherwise.
 */
export async function updateUserAfterRegister(email: string, uid: string): Promise<Boolean> {
  // Cleanup email input
  const emailLower = email.trim().toLowerCase();
  // Query users collection for matching email
  const userDoc = await db
    .collection("users")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  if (userDoc.empty) {
    throw new Error("User not found");
  }

  try {
    // updating isRegistered to true, id to uid
    await userDoc.docs[0]?.ref.set({
      id: uid, 
      isRegistered: true
    }, 
    {
      merge: true
    });

    // after successful update
    return true; 
  } catch (error) {
    console.error("Error updating user after registration:", error);
    return false;
  }
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