// backend/src/services/web-admin/teacherService.ts
import type { Parent } from "../../../../shared/types/type";

// *****Later no need as status of Parent is castcaded by the Child
// !!!!!!!!!!Re-CONSIDER as parents have more than 1 child
import { EnrollmentStatus } from "../../../../shared/types/type";
import { db } from "../../lib/firebase";
import { UserRole } from "../../models/user";
import {
  daycareLocationIds,
  checkingIfEmailIsUnique,
  updateEmailFirebaseAuth,
  deleteUserFirebaseAuth,
} from "../authService";

// Collections
const childrenRef = db.collection("children");
const usersRef = db.collection("users");

/*
=================== Need Plug in case locationId passing from login admin with locationId = ['*'];Meaning 
1. Fetching all teacher data of all location under that daycareProvider/ daycareId
2. Adding allow multiple locations option
3. Deleting/ Updating is affecting for only that location only
*/

// List all parents of THAT child
export const getAllParents = async (
  daycareId: string,
  locationId: string
): Promise<Parent[]> => {
  // Case when locationId = '*', use daycareId to take all locations Id of that daycare
  if (locationId === "*") {
    // Get all locations of that daycare
    const locationIds = await daycareLocationIds(daycareId);
    // If return empty location
    if (locationIds.length === 0) {
      console.log("No locations found for this provider");
      return [];
    }

    // Else,
    // Firestore 'in' operator can only take up to 30 values
    const chunks = [];
    while (locationIds.length) {
      chunks.push(locationIds.splice(0, 30));
    }

    const parents: Parent[] = [];

    for (const idsChunk of chunks) {
      const snapshot = await db
        .collection("users")
        .where("locationId", "in", idsChunk) // match location
        .where("role", "==", UserRole.Parent) // match role
        .get();

      snapshot.forEach((doc) => {
        parents.push({ id: doc.id, ...(doc.data() as any) } as Parent);
      });
    }

    return parents;
  }

  // else, case when locationId is exactly match
  const snap = await usersRef
    .where("locationId", "==", locationId)
    .where("role", "==", "parent") // only Parents
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Parent));
};

// Create Parent (returns created parent with id):
// using id Field, NO rely on doc(id) as it CAN-NOT later on Update followed uid from Firebase Auth (middleware)
export const addParent = async (
  parent: Omit<Parent, "id" | "role">
): Promise<Parent | null> => {
  // Ensure email is unique among users
  const isUniqueEmail = await checkingIfEmailIsUnique(parent.email);
  if (!isUniqueEmail) {
    return null; // email already exists, return null
  }
  // Adding new parent into users collection: with role, status and isRegistered flags
  // Ensure no id field is present and locationId is set to the provided locationId, role set to Teacher
  const docRef = await usersRef.add({
    ...parent,
    role: UserRole.Parent,
    // As the first-time parent user, Should be same status as the linked child
    // Case searching existing parent, status of parent (e.g ACTIVE) is Deffer from concurent child (e.g. NEW)
    status: EnrollmentStatus.New, // status new by default, if user doesn't select a status
  });

  // Updating current Parent Doc with newly added id
  const id = docRef.id;
  await docRef.update({ id });

  // Update current child with newaddedParent id: Child doc with parentId.push(parentId)
  /// 1. As childIds is list, the newLy added childId = childIds[length -1] or the last childId
  const parentDocRef = docRef.get();
  const parentData = (await parentDocRef).data();

  const  childIds = parentData?.childIds;
  const newlyAddedChildId = childIds[childIds.length - 1];;

  // 2. Find the child with newlyAddedChildId
  const childRef = db.collection("children").doc(newlyAddedChildId);
  // 3. Update parentId list to add parentId
  // 3.1 Extract parentId data, modify it
  const childDataRef = childRef.get();
  const childData = (await childDataRef).data();
  const parentIdFromChildDoc = childData?.parentId;
  // 3.3 NOT using parent doc id, but parent.id field
  const parentIdField = parentData?.id;
  const modifiedParenId = [...parentIdFromChildDoc, parentIdField]; /// modifying current Array, NOT parenIdFromChildDoc.push(id); as this is creating new array
  // 3.2 Update the modifed ParentId into childRef doc
  const ok = await childRef.update({parentId: modifiedParenId })
  if (!ok) throw Error ("Failed to update ParentId inside Children collection");
  // return parent
  return { id, ...(parent as any) } as Parent;
};

/**
 *  Get parent by id field: not doc id
 *  this could be doc(id) in case isRegisted is false
 * Else, after register, id is updated to uid from Firebase Auth
 * @param id
 * @returns
 */
export const getParentById = async (id: string): Promise<Parent | null> => {
  const parentSnap = await usersRef.where("id", "==", id).get();
  // Get parent doc
  const parentDoc = parentSnap.docs[0];
  if (!parentDoc?.exists) return null;
  return { ...parentDoc.data() } as Parent;
};

// Update parent, returns updated doc or null if not found
export const updateParent = async (
  id: string,
  body: Partial<Parent>
): Promise<Parent | null> => {
  // Find the doc ref of Teacher
  const parentSnap = usersRef.where("id", "==", id);
  const doc = await parentSnap.get();
  const parentDoc = doc.docs[0];
  if (!parentDoc?.exists) return null;

  const parentDocRef = parentDoc?.ref;

  await parentDocRef.set(body, { merge: true });
  const updated = await parentDocRef.get();

  // Checking if updating email
  const currentParent = await getParentById(id);
  const currentEmail = currentParent?.email;

  if (body.email) {
    const newEmail = body.email;
    if (body.email !== currentEmail) {
      // update firebae Auth credentials: calling from authServices
      try {
        await updateEmailFirebaseAuth(id, newEmail);
      } catch (error: any) {
        throw error;
      }
    }
  }

  return { id: updated.id, ...(updated.data() as any) } as Parent;
};

/**
 * Delete Parent and clear class references; also remove user doc if exists
 * And delete user in Firebase Auth
 * !!!! Carefully that maybe me we just want to delete the parent relationship, not the actual parent
 * ONLY check If all of childIds.length = 0, then delete the Parent
 * @param id: parent Id
 * @returns: boolean: true if success, false otherwise
 */

export const deleteParent = async (id: string): Promise<boolean> => {
  const snapDoc = usersRef.where("id", "==", id);
  const doc = await snapDoc.get();

  // 0. Checking if parent exist, not => return false
  const parentDoc = doc.docs[0];
  if (!parentDoc?.exists) return false;

  // 1. Delete the references relationship:
  // 1.1 Delete parentId in child doc, and
  // 1.2 Delete childId reference in Parent
  const childrenSnap = await childrenRef.where("parentId", "==", id).get();
  const batch = db.batch();

  // 2. Checking if childIds.length === 0 (empty),
  // 3. If yes,
  // 3.1. Delete user doc in users collection
  // 3.2. Delete user from Firebase Auth: if already registered
  batch.delete(parentDoc?.ref);
  // batch.delete(usersRef.doc(id)); // ok even if missing
  childrenSnap.forEach((d) => batch.update(d.ref, { parentId: null }));

  await batch.commit();

  const parentData = parentDoc.data();
  if (!parentData?.isRegistered) {
    return true; // ignore
  }

  // Else, delete in Firebase Auth
  try {
    await deleteUserFirebaseAuth(id);
    return true;
  } catch (error: any) {
    throw error;
  }
  // 4. Else, do nothing, return true. Just stop at cleanning the reference relationshop
};

// Assign a teacher to a class (bidirectional), returns success boolean
export const assignParentToChild = async (id: string, childId: string): Promise<boolean> => {
  // Get Parent by id field, not doc id
  const parentRef = usersRef
    .where("id", "==", id);
  const doc = await parentRef.get();
  const parentDoc = doc.docs[0];

  // Get Class by doc id
  const childRef   = childrenRef.doc(childId);

  const [parentSnap, childSnap] = await Promise.all([parentDoc, childRef.get()]);
  // Either 1 of them cannot found, return false
  if (!parentSnap.exists || !childSnap.exists) return false;

  // Else, ... update classId and teacherId return choose
  const batch = db.batch();
  batch.set(parentDoc.ref, { childId }, { merge: true }); // Check the array, not object
  batch.set(childRef, { parentId: id }, { merge: true }); // Check the array, not object
  await batch.commit();

  return true;
};

