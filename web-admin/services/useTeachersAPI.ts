"use client";

import * as Types from "@shared/types/type";
import { NewTeacherInput } from "@/types/forms";
import api from "@/api/client";
import { ENDPOINTS } from "@/api/endpoint";
import swal from "sweetalert2";

export async function fetchTeachers(): Promise<Types.Teacher[] | null> {
  try {
    const teachers = await api.get<Types.Teacher[]>(ENDPOINTS.teachers);
    return teachers;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

export async function addTeacher(newTeacher: NewTeacherInput): Promise<Types.Teacher | null> {
  try {
    const teacher = await api.post<Types.Teacher>(ENDPOINTS.teachers, { ...newTeacher });
    swal.fire({
          icon: "success",
          title: "New Teacher",
          text: `Successfully added: ${teacher.firstName} ${teacher.lastName}`,
        });
    return teacher;
  } catch (err: unknown) {
    // console.error(err);
    swal.fire({
      title: "Error",
      text: err instanceof Error ? err.message : "Unknown error",
      icon: "error",
    });
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function updateTeacher(
  id: string,
  payload: NewTeacherInput
): Promise<Types.Teacher | null> {
  try {
    const teacher = await api.put<Types.Teacher>(`${ENDPOINTS.teachers}/${id}`, { ...payload });
    return teacher;
  } catch (err: unknown) {
    console.error(err);
    // return null;
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function deleteTeacher(
  id: string
): Promise<{ ok: boolean; uid: string } | null> {
  try {
    const res = await api.delete<{ ok: boolean; uid: string }>(`${ENDPOINTS.teachers}/${id}`);
    return res;
  } catch (err: unknown) {
    console.error(err);
    throw err; // Rethrow the error to be handled by the caller
  }
}

export async function assignTeacherToClass(
  id: string,
  classId: string
): Promise<{ ok: boolean } | null> {
  try {
    const res = await api.post<{ ok: boolean }>(`${ENDPOINTS.teachers}/${id}/assign`, { classId });
    return res;
  } catch (err: unknown) {
    console.error(err);
    throw err; // Rethrow the error to be handled by the caller
  }
}
