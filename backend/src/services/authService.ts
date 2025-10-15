
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

/**
 * Check if email is unique in users collection.
 * @param email 
 * @returns : true if unique, false if exists
 */
export async function checkingIfEmailIsUnique(email: string): Promise<Boolean> {
  const emailLower = email.trim().toLowerCase();

  const userDoc = await db.collection("users")
    .where("email", "==", emailLower)
    .get();

    if (userDoc.empty) {
      return true; // unique
    }
    return false; // exists
}
/***
 * Find daycareId and locationId by email for each user role
 */
export async function findDaycareAndLocationByEmail(email: string | null): Promise<{daycareId: string, locationId: string} | null> {
  // Case: not provide email
  if (!email || !email.trim()) {
    throw new Error("Email required to find daycare and location");
  }

  // else
  try {
    const userDoc= await db.collection("users")
      .where("email", "==", email.trim().toLowerCase())
      .get();
    if (userDoc.empty) {
      return null;
    }

    // Get user role
    const userData = userDoc.docs[0]?.data();
    const role = userData?.role;

    // If admin, extradt right away 
    if (role === UserRole.Admin) {
      const daycareId = userData?.daycareId;
      const locationId = userData?.locationId;
      return {daycareId, locationId};
    }

    // If teacher, extract locationId from data
    if (role === UserRole.Teacher) {
      const locationId = userData?.locationId;
      
    // Find the location document by its ID in subCollection locations
    const locationSnapshot = await db.collectionGroup("locations")
      .where("id", "==", locationId)
      .get();

    if (locationSnapshot.empty) return null;

    const locationDoc = locationSnapshot.docs[0];
    const daycareId = locationDoc?.data()?.daycareId;
    
    return daycareId ? { daycareId, locationId } : null;
    }


    // If parent, extract children array of locationIds from data
    if (role === UserRole.Parent) {
      const children = userData?.childrenIds; // array of {id, locationId}

      if (!children || children.length === 0) {
        return null; // Case parent with no children, need to delete
      }
      const classId = children[0]?.classId; // Take the first child classId
      if (!classId) {
        return null;
      }
      const classDoc  = await db.collection("classes").doc(classId).get();
      const locationId = (classDoc).data()?.locationId;
      if (!locationId) {
        return null;
      }
      // Then, find daycareProvider by locationId from daycareProviders collection with subcollection locations
      const locatioSnapshot = await db.collectionGroup("locations")
        .where("id", "==", locationId)
        .get(); 
      if (!locatioSnapshot.empty) {
        const locationDoc = locatioSnapshot.docs[0];
        const daycareId = locationDoc?.data()?.daycareId; // parent of subcollection parent
        if (daycareId) {
        return { daycareId, locationId };
        }
      }
      return null;
    }
    // If role is nether Admin nor Teacher nor Parent
    throw new Error("User role is invalid");

  } catch (error) {
    console.error("Error finding daycareProvider by email:", error);
    return null;
  }
}