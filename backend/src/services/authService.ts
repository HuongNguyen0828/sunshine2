
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
  const q = await db
    .collection("users")
    .where("email", "==", email.trim().toLowerCase())
    .limit(1)
    .get();
  return q.empty;
}
/**
 * Update user email profile in Firebase Auth
 * @param email 
 * @returns 
 */
export async function updateEmailFirebaseAuth(uid: string, newEmail: string) {
  try {
    const userRecord = await admin.auth().updateUser(uid, {
        email: newEmail,
        emailVerified: true // we don't do email veritification
      });
    return userRecord;
  }
  catch (error: any) {
    throw new Error("Failed to update user email from Firebase Auth");
  }
} 

export async function deleteUserFirebaseAuth(uid: string) {
  try {
    await admin.auth().deleteUser(uid)
  }
  catch (error: any) {
    throw new Error("Failed to delete user from Firebase Auth");
  }
}

/***
 * Find daycareId and locationId by email for each user role
 */
export async function findDaycareAndLocationByEmail(email: string | null): Promise<{daycareId: string, locationId: string} | null> {
    console.log(`🔍 Searching for daycare/location with email: ${email}`);

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

    console.log(`📊 Users found: ${userDoc.size}`);


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
    /* ====================
    Creating single-field index Exemption in Firestore for locations: with id field in ASC order in Collection Group scope setting
    */
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

// Get all locationId of a daycare by known daycareId
export async function daycareLocationIds(daycareId: string): Promise<string[]> {
  const snap = await db.collection(`daycareProvider/${daycareId}/locations`).get();
  return snap.docs.map((d) => d.id);
}

/**
 * To check if admin have right access to their properties: applied in acessing Object of locations, classes, teachers, children, parents, schedules.
 * @param adminLocationId: admin daycareId from midleware
 * @param adminDaycareId: admin locationId from midleware
 * @param passingLocationId: locationId passing from requesting acessing Object
 * @returns 
 */
export const canAdminnAccess = async (
  adminLocationId: string, 
  adminDaycareId: string, 
  passingLocationId: string
): Promise<boolean> => {
  if (adminLocationId === '*') {
    const locations = await daycareLocationIds(adminDaycareId);
    return locations.includes(passingLocationId);
  }
  return adminLocationId === passingLocationId;
};

/** Usage in controller inside web-admin
 */

// const hasAccess = await canAdminnAccess(locationId, daycareId, passingLocationId);
// if (!hasAccess) {
//   return res.status(403).json({ message: "Forbidden: cannot access teacher from another location" });
// }