
import { admin } from "../lib/firebase";
import { UserRole } from "../models/user";
import { db } from "../lib/firebase";


// Checking email exist before let user signup: email could be null from verify token
export async function findRoleByEmail(email: string | null): Promise<UserRole | null>{

  // Guard clause: reject null/empty emails
  if (!email || !email.trim()) {
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

type daycareAndLocation = {
  daycareId: string, 
  locationId: string
}

// Get daycare and location
export async function getDaycareAndLocation(email: string | null) : Promise<daycareAndLocation> {
  // just for admin now
  if (!email) throw new Error("Email is null");
  // Else, 
  const adminDoc = await db.collection("admins")
    .where("email", "==", email)
    .get();

    let daycareId;
    let locationId;
  
  // If empty:
  if (adminDoc.empty) {
    throw new Error("Daycare/location not found for this user");
  }
  if (!adminDoc.empty) {
    // Get locationID and daycareID; admins/{uid, email, daycareId, locationId}
    const adminData = adminDoc.docs[0]?.data();
    daycareId = adminData?.daycareId;
    locationId= adminData?.locationId;
  }
  return {daycareId, locationId}

}


// Get all locationId[] of daycare admin;
export async function getAllLocationIdForDaycare(email: string | null): Promise<String[] | undefined>{
  
  const {daycareId, locationId} = await getDaycareAndLocation(email);


  const daycareDocs = await db.collection("daycareProvider")
  .where("daycareId", "==", daycareId)
  .get();

  if (!daycareDocs) throw new Error("Cannot find the daycare");
  // Get sub collection location of that daycare doc
  const daycareDocRef = daycareDocs.docs[0]?.ref;
  const locationSnap = await daycareDocRef?.collection("locations").get();

  if (locationSnap?.empty) {
    console.log("Daycare has no location")
    return [];
  }
  // convert to list of id

  const locationIdList = locationSnap?.docs.map( doc => doc.id);

  return locationIdList;
}

// Other services like: 
// Updating user email


// User updating email

// Reset Password


// Change role
