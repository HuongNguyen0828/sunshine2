// web-admin/hooks/useClassesAPI.ts
"use client";

import * as Types from "@shared/types/type";
import api from "@shared/api/client";
import { ENDPOINTS } from "@shared/api/endpoint";
import { NewClassInput } from "@/types/forms";

function normalizeOptionalString(v?: string): string | undefined {
  if (v == null) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

// GET /class
export async function fetchClasses(): Promise<Types.Class[] | null> {
  try {
    const items = await api.get<Types.Class[]>(ENDPOINTS.classes);
    return items;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

// POST /class
export async function addClass(input: NewClassInput): Promise<Types.Class | null> {
  try {
    const payload = {
      name: input.name,
      locationId: normalizeOptionalString(input.locationId),
      capacity: Number(input.capacity),
      volume: Number(input.volume),
      ageStart: Number(input.ageStart),
      ageEnd: Number(input.ageEnd),
      classroom: normalizeOptionalString(input.classroom),
    };
    const created = await api.post<Types.Class>(ENDPOINTS.classes, payload);
    return created;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

// PUT /class/:id
export async function updateClass(id: string, input: NewClassInput): Promise<Types.Class | null> {
  try {
    const payload = {
      name: input.name,
      locationId: normalizeOptionalString(input.locationId),
      capacity: Number(input.capacity),
      volume: Number(input.volume),
      ageStart: Number(input.ageStart),
      ageEnd: Number(input.ageEnd),
      classroom: normalizeOptionalString(input.classroom),
    };
    const updated = await api.put<Types.Class>(`${ENDPOINTS.classes}/${id}`, payload);
    return updated;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

// DELETE /class/:id
export async function deleteClass(id: string): Promise<boolean> {
  try {
    await api.delete<void>(`${ENDPOINTS.classes}/${id}`);
    return true;
  } catch (err: unknown) {
    console.error(err);
    return false;
  }
}

// POST /class/:id/assign-teachers
export async function assignTeachersToClass(
  classId: string,
  teacherIds: string[]
): Promise<{ classId: string; teacherIds: string[] } | null> {
  try {
    const result = await api.post<{ classId: string; teacherIds: string[] }>(
      `${ENDPOINTS.classes}/${classId}/assign-teachers`,
      { teacherIds }
    );
    return result;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}
