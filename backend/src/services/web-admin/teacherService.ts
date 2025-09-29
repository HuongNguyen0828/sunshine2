// src/services/web-admin/TeachersService.ts

import type { Teacher } from "../../../../shared/types/type";
import { db } from "../../server" // Importing db FireStore with admin permission
import admin from "firebase-admin";


// Reference Teacher collection 
const teachersRef =admin.firestore().collection("teachers");

// return a list of Teacher
export const getAllTeachers = async (): Promise<Teacher[]> => {
    const snapshot = await teachersRef.get();
    // Return teacher with id
    const teachers = snapshot.docs.map((doc) => ({id: doc.id, ... doc.data} as Teacher)) 
    return teachers;
};

export const addTeacher = async (teacher: Teacher): Promise<Teacher> => {
    // new doc referencing teacher after added
    const doc = await teachersRef.add(teacher);
    return {...teacher, id: doc.id};
};

export const getTeacherById = async (id: string): Promise<Teacher | null> => {
    const doc = await teachersRef.doc(id).get();
    const teacher = doc.exists ? ({id: doc.id, ...doc.data()} as Teacher) : null;
    
    return teacher;
};

export const deleteTeacher = async (id: string): Promise<boolean> => {
  await teachersRef.doc(id).delete();
  
  return true;
};

// Update Teacher, return new data
export const updateTeacher = async (
  id: string,
  body: Partial<Teacher> // accept only fields that need updating
): Promise<Teacher | undefined> => {
  let updatedTeacher: Teacher | undefined;

  // Update the doc
  await teachersRef.doc(id).update(body);
  // Get reference of the doc
  const updated = await teachersRef.doc(id).get();

  return {id: updated.id, ...updated.data()} as Teacher;
};