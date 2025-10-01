// backend/src/services/web-admin/teacherService.ts
import type { Teacher } from "../../../../shared/types/type";
import { db } from "../../lib/firebase";

// Collections
const teachersRef = db.collection("teachers");
const classesRef  = db.collection("classes");
const usersRef    = db.collection("users");

// List all teachers
export const getAllTeachers = async (locationId: string): Promise<Teacher[]> => {
  const snap = await teachersRef
    .where("locationId", "==", locationId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Teacher));
};

// Create teacher (returns created teacher with id)
export const addTeacher = async (locationId: string, teacher: Omit<Teacher, "id">): Promise<Teacher> => {

  // Ensure no id field is present and locationId is set to the provided locationId
  const doc = await teachersRef.add({...teacher, locationId: locationId});
  return { id: doc.id, ...(teacher as any) } as Teacher;
};

// Get teacher by id
export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const doc = await teachersRef.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as any) } as Teacher;
};

// Update teacher, returns updated doc or null if not found
export const updateTeacher = async (
  id: string,
  body: Partial<Teacher>
): Promise<Teacher | null> => {
  const docRef = teachersRef.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.set(body, { merge: true });
  const updated = await docRef.get();
  return { id: updated.id, ...(updated.data() as any) } as Teacher;
};

// Delete teacher and clear class references; also remove user doc if exists
export const deleteTeacher = async (id: string): Promise<boolean> => {
  const docRef = teachersRef.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const clsSnap = await classesRef.where("teacherId", "==", id).get();
  const batch = db.batch();

  batch.delete(docRef);
  batch.delete(usersRef.doc(id)); // ok even if missing
  clsSnap.forEach((d) => batch.update(d.ref, { teacherId: null }));

  await batch.commit();
  return true;
};

// Update Teacher, return new data:  // accept only fields that need updating
export const updateTeacher = async (id: string, body: Partial<Teacher>): Promise<Teacher | undefined> => {

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