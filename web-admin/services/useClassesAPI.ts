// web-admin/services/useClassesAPI.ts
"use client";

import * as Types from "../../shared/types/type";
import api from "@/api/client";
import { ENDPOINTS } from "@/api/endpoint";
import { NewClassInput } from "@/types/forms";

/** Normalize optional text inputs to undefined when blank. */
function normalizeOptionalString(v?: string): string | undefined {
  if (v == null) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** Keep only unique, non-empty string IDs. */
function normalizeTeacherIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out = new Set<string>();
  for (const v of ids) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s.length > 0) out.add(s);
    }
  }
  return Array.from(out);
}

/* =========================
   Classes CRUD (server filters by admin scope)
   ========================= */

/** GET /api/classes */
export async function fetchClasses(): Promise<Types.Class[] | null> {
  try {
    const items = await api.get<Types.Class[]>(ENDPOINTS.classes);
    return items;
  } catch (err: unknown) {
    console.error(err);
    return null;
  }
}

/** POST /api/classes */
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

/** PUT /api/classes/:id */
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

/** DELETE /api/classes/:id */
export async function deleteClass(id: string): Promise<boolean> {
  try {
    await api.delete<void>(`${ENDPOINTS.classes}/${id}`);
    return true;
  } catch (err: unknown) {
    console.error(err);
    return false;
  }
}

/* =========================
   Teachers (list for cards) and Candidates (for modal)
   ========================= */

export type TeacherLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;      // should be "teacher"
  status?: string;    // "New" | "Active" | ...
  classIds?: string[];
};

/** GET /api/users/teachers  (optionally pass classId to filter server-side if you add it later) */
export async function fetchTeachers(): Promise<TeacherLite[]> {
  try {
    const items = await api.get<TeacherLite[]>(ENDPOINTS.teachers);
    return items ?? [];
  } catch (err: unknown) {
    console.error(err);
    return [];
  }
}

/** Teacher candidates used in the "Assign" modal (defaults to onlyNew=true). */
export type TeacherCandidate = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  classIds?: string[];
};

export async function fetchTeacherCandidates(onlyNew = true): Promise<TeacherCandidate[]> {
  try {
    const qs = onlyNew ? "?onlyNew=true" : "?onlyNew=false";
    const items = await api.get<TeacherCandidate[]>(`${ENDPOINTS.teacherCandidates}${qs}`);
    return items ?? [];
  } catch (err: unknown) {
    console.error(err);
    return [];
  }
}

/* =========================
   Assign teachers
   ========================= */

/** POST /api/classes/:id/assign-teachers */
export async function assignTeachersToClass(
  classId: string,
  teacherIds: string[]
): Promise<boolean> {
  try {
    const payload = { teacherIds: normalizeTeacherIds(teacherIds) };
    const res = await api.post<{ ok?: boolean; classId?: string }>(
      `${ENDPOINTS.classes}/${classId}/assign-teachers`,
      payload
    );
    return !!res?.ok;
  } catch (err: unknown) {
    console.error(err);
    return false;
  }
}
