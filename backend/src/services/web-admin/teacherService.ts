// backend/src/services/web-admin/teacherService.ts
import type { Teacher } from "../../../../shared/types/type";
import { TeacherStatus } from "../../../../shared/types/type";
import { db } from "../../lib/firebase";
import { UserRole } from "../../models/user";
import { daycareLocationIds, checkingIfEmailIsUnique, updateEmailFirebaseAuth, deleteUserFirebaseAuth } from "../authService";

// Collections
const classesRef  = db.collection("classes");
const usersRef    = db.collection("users");

/*
=================== Need Plug in case locationId passing from login admin with locationId = ['*'];Meaning 
1. Fetching all teacher data of all location under that daycareProvider/ daycareId
2. Adding allow multiple locations option
3. Deleting/ Updating is affecting for only that location only
*/


// List all teachers
export const getAllTeachers = async (daycareId: string, locationId: string): Promise<Teacher[]> => {
  // Case when locationId = '*', use daycareId to take all locations Id of that daycare
  if (locationId === '*') {
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

    const teachers: Teacher[] = [];

    for (const idsChunk of chunks) {
      const snapshot = await db.collection('users')
        .where('locationId', 'in', idsChunk) // match location
        .where('role', '==', UserRole.Teacher) // match role
        .get();
      
      snapshot.forEach((doc) => {
        teachers.push({id: doc.id, ...(doc.data() as any)} as Teacher);
      });
    }

    return teachers;
  }


  // else, when locationId is exactly match
  const snap = await usersRef
    .where("locationId", "==", locationId)
    .where("role", "==", UserRole.Teacher) // only teachers
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Teacher));
};

// Create teacher (returns created teacher with id)
export const addTeacher = async (teacher: Omit<Teacher, "id">): Promise<Teacher | null> => {

  // Ensure email is unique among users
  const isUniqueEmail = await checkingIfEmailIsUnique(teacher.email);
  if (!isUniqueEmail) {
    return null; // email already exists, return null
  }
  // Adding new teacher into user collection: with role, status and isRegistered flags
  // Ensure no id field is present and locationId is set to the provided locationId, role set to Teacher
  const docRef = await usersRef.add({
    ...teacher, 
    role: UserRole.Teacher, 
    status: TeacherStatus.New, // status new by default
  });

  // Updating current Teacher Doc with newly added id
  const id = docRef.id;
  await docRef.update({id});
  
  // return teacher
  return { id: docRef.id, ...(teacher as any) } as Teacher;
};


/**
 *  Get teacher by id field: not doc id 
 *  this could be doc(id) in case isRegisted is false
 * Else, after register, id is updated to uid from Firebase Auth
 * @param id 
 * @returns 
 */
export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const teacherSnap = await usersRef.where("id", "==", id).get();
  // Get teacher doc
  const teacherDoc = teacherSnap.docs[0];
  if (!teacherDoc?.exists) return null;
  return {...teacherDoc.data()} as Teacher;
};

// Update teacher, returns updated doc or null if not found
export const updateTeacher = async (
  id: string,
  body: Partial<Teacher>
): Promise<Teacher | null> => {
  // Find the doc ref of Teacher
  const teacherSnap = usersRef.where("id", "==", id);
  const doc = await teacherSnap.get();
  const teacherDoc = doc.docs[0];
  if (!teacherDoc?.exists) return null;

  const teacherDocRef = teacherDoc?.ref;

  await teacherDocRef.set(body, { merge: true });
  const updated = await teacherDocRef.get();

  // Checking if updating email
  const currentTeacher = await getTeacherById(id);
  const currentEmail = currentTeacher?.email;

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

  return { id: updated.id, ...(updated.data() as any) } as Teacher;
};

// Delete teacher and clear class references; also remove user doc if exists
// And delete user in Firebase Auth
export const deleteTeacher = async (id: string): Promise<boolean> => {
  const snapDoc = usersRef.where("id", "==", id);
  const doc = await snapDoc.get();

  const clsSnap = await classesRef.where("teacherId", "==", id).get();
  const batch = db.batch();

  const teacherDoc = doc.docs[0];
  if (!teacherDoc?.exists) return false;

  batch.delete(teacherDoc?.ref);
  // batch.delete(usersRef.doc(id)); // ok even if missing
  clsSnap.forEach((d) => batch.update(d.ref, { teacherId: null }));

  await batch.commit();
  // Delete user from Firebase Auth: if already registered
  const teacherData = teacherDoc.data();
  if (!teacherData?.isRegistered) {
    return true; // ignore
  }

  // Else, delete in Firebase Auth
  try {
    await deleteUserFirebaseAuth(id);
    return true;
  } catch (error: any) {
    throw error;
  }
};

// Assign a teacher to a class (bidirectional), returns success boolean
export const assignTeacherToClass = async (id: string, classId: string): Promise<boolean> => {
  const teacherRef = usersRef.doc(id);
  const classRef   = classesRef.doc(classId);

  const [tSnap, cSnap] = await Promise.all([teacherRef.get(), classRef.get()]);
  if (!tSnap.exists || !cSnap.exists) return false;

  const batch = db.batch();
  batch.set(teacherRef, { classId }, { merge: true });
  batch.set(classRef, { teacherId: id }, { merge: true });
  await batch.commit();

  // else, if found, Update the doc
  await teachersRef.doc(id).update(body);
  // Get reference of the doc
  const updated = await teachersRef.doc(id).get();
  

  // Case updating email, need update Firebase Auth email
  // if (body.email) {
  //   const editingEmail = body.email;

  // }

  return {id: updated.id, ...updated.data()} as Teacher;
};