// backend/src/services/web-admin/teacherService.ts
import type { Teacher } from "../../../../shared/types/type";
import { TeacherStatus } from "../../../../shared/types/type";
import { db } from "../../lib/firebase";
import { UserRole } from "../../models/user";
import { checkingIfEmailIsUnique } from "../authService";

// Collections
const classesRef  = db.collection("classes");
const usersRef    = db.collection("users");

// List all teachers
export const getAllTeachers = async (locationId: string): Promise<Teacher[]> => {
  const snap = await usersRef
    .where("locationId", "==", locationId)
    .where("role", "==", UserRole.Teacher) // only teachers
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Teacher));
};

// Create teacher (returns created teacher with id)
export const addTeacher = async (locationId: string, teacher: Omit<Teacher, "id">): Promise<Teacher | null> => {

  // Ensure email is unique among users
  const isUniqueEmail = await checkingIfEmailIsUnique(teacher.email);
  if (!isUniqueEmail) {
    return null; // email already exists, return null
  }
  // Adding new teacher into user collection: with role, status and isRegistered flags
  // Ensure no id field is present and locationId is set to the provided locationId, role set to Teacher
  const doc = await usersRef.add({
    ...teacher, 
    locationId: locationId, 
    role: UserRole.Teacher, 
    status: TeacherStatus.New, // status new by default
  });
  return { id: doc.id, ...(teacher as any) } as Teacher;
};

// Get teacher by id
export const getTeacherById = async (id: string): Promise<Teacher | null> => {
  const doc = await usersRef.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as any) } as Teacher;
};

// Update teacher, returns updated doc or null if not found
export const updateTeacher = async (
  id: string,
  body: Partial<Teacher>
): Promise<Teacher | null> => {
  const docRef = usersRef.doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  await docRef.set(body, { merge: true });
  const updated = await docRef.get();
  return { id: updated.id, ...(updated.data() as any) } as Teacher;
};

// Delete teacher and clear class references; also remove user doc if exists
export const deleteTeacher = async (id: string): Promise<boolean> => {
  const docRef = usersRef.doc(id);
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

  return true;
};
