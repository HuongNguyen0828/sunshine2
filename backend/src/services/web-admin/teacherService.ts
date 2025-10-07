// src/services/web-admin/TeachersService.ts

import type { Teacher } from "../../../../shared/types/type";
import { db } from "../../lib/firebase" // Importing db FireStore with admin permission


// Reference Teacher collection 
const teachersRef = db.collection("teachers");

// return a list of Teacher
export const getAllTeachers = async (locationId?: string): Promise<Teacher[]> => {
  // if not location
  if (!locationId) {
    throw new Error("locationId is required to fetch teachers");
  }

  // if locationId is *, mean fetch all teacher inside that daycare. 
  // For daycare admin (owner with many locations) for now, ignore Sushine admin



  // Else, admin of that location
  const snapshot = await teachersRef
    .where("locationId", "==", locationId)
    .get();
  // Return teacher with id
  const teachers = snapshot.docs.map((doc) => ({id: doc.id, ... doc.data()} as Teacher)) 
  return teachers;
};

export const addTeacher = async (teacher: Teacher): Promise<Teacher> => {
    // new doc referencing teacher after added
    const doc = await teachersRef.add(teacher);
    return {...teacher, id: doc.id};
};

export const getTeacherById = async (id: string | undefined): Promise<Teacher | null> => {
    if (!id) return null;
    // else, if id
    const doc = await teachersRef.doc(id).get();
    // Found if doc match, else, null
    const teacher = doc.exists ? ({id: doc.id, ...doc.data()} as Teacher) : null;
    
    return teacher;
};

export const deleteTeacher = async (id: string): Promise<boolean> => {
  await teachersRef.doc(id).delete();
  
  return true;
};

// Update Teacher, return new data:  // accept only fields that need updating
export const updateTeacher = async (id: string, body: Partial<Teacher>): Promise<Teacher | undefined> => {

  // Checking if the doc of teacher exist
  const docRef = teachersRef.doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Teacher not found")
  }

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