"use client";

import * as Types from "@shared/types/type";
import { NewTeacherInput } from "@/types/forms";
import api from "@shared/api/client";
import { ENDPOINTS } from "@shared/api/endpoint";

export async function fetchTeachers(): Promise<Types.Teacher[] | null> {
  try {
    const teachers = await api.get<Types.Teacher[]>(ENDPOINTS.teachers, );
    return teachers;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

export async function addTeacher(newTeacher: NewTeacherInput): Promise<Types.Teacher | null> {
  try {
    const teacher = await api.post<Types.Teacher>(ENDPOINTS.teachers, { ...newTeacher });
    return teacher;
  } catch (err: unknown) {
    console.error(err);
    return null;
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
    return null;
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
    return null;
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
    return null;
  }
}
