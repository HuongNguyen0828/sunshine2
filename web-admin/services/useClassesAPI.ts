// web-admin/services/useClassesAPI.ts
"use client";

import * as Types from "../../shared/types/type"; // align path with other files
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

/** Build a query string from a record of params (ignores undefined/empty). */
function buildQS(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    if (typeof v === "string" && v.trim() === "") return;
    usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/* =========================
   Classes CRUD (server filters by admin scope)
   ========================= */

/** GET /api/classes */
export async function fetchClasses(): Promise<Types.Class[] | null> {
  try {
    const items = await api.get<Types.Class[]>(ENDPOINTS.classes);
    return items;
  } catch (err) {
    console.error(err);
    return null;
  }
}

/** POST /api/classes */
export async function addClass(input: NewClassInput): Promise<Types.Class | null> {
  try {
    const payload = {
      name: input.name.trim(),
      locationId: normalizeOptionalString(input.locationId),
      capacity: Number(input.capacity),
      volume: Number(input.volume),
      ageStart: Number(input.ageStart),
      ageEnd: Number(input.ageEnd),
      classroom: normalizeOptionalString(input.classroom),
    };
    const created = await api.post<Types.Class>(ENDPOINTS.classes, payload);
    return created;
  } catch (err) {
    console.error(err);
    return null;
  }
}

/** PUT /api/classes/:id */
export async function updateClass(id: string, input: NewClassInput): Promise<Types.Class | null> {
  try {
    const payload = {
      name: input.name.trim(),
      locationId: normalizeOptionalString(input.locationId),
      capacity: Number(input.capacity),
      volume: Number(input.volume),
      ageStart: Number(input.ageStart),
      ageEnd: Number(input.ageEnd),
      classroom: normalizeOptionalString(input.classroom),
    };
    const updated = await api.put<Types.Class>(`${ENDPOINTS.classes}/${id}`, payload);
    return updated;
  } catch (err) {
    console.error(err);
    return null;
  }
}

/** DELETE /api/classes/:id */
export async function deleteClass(id: string): Promise<boolean> {
  try {
    await api.delete<void>(`${ENDPOINTS.classes}/${id}`);
    return true;
  } catch (err) {
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
  role?: string;
  status?: string;
  classIds?: string[];
  locationId?: string; // used to enforce same-location UI guards
};

/**
 * GET /api/users/teachers
 * Optional filters:
 * - locationId: only teachers within this location
 * - classId: only teachers assigned to this class (server also derives location from class if needed)
 */
export async function fetchTeachers(opts?: {
  locationId?: string;
  classId?: string;
}): Promise<TeacherLite[]> {
  try {
    const qs = buildQS({
      locationId: opts?.locationId,
      classId: opts?.classId,
    });
    const items = await api.get<TeacherLite[]>(`${ENDPOINTS.teachers}${qs}`);
    return items ?? [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export type TeacherCandidate = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  classIds?: string[];
  locationId?: string; // used to enforce same-location UI guards
};

/**
 * GET /api/users/teacher-candidates
 * Optional filters:
 * - onlyNew (default true)
 * - locationId or classId (server enforces scope and filters by location)
 */
export async function fetchTeacherCandidates(opts?: {
  onlyNew?: boolean;
  locationId?: string;
  classId?: string;
}): Promise<TeacherCandidate[]> {
  try {
    const qs = buildQS({
      onlyNew: opts?.onlyNew ?? true,
      locationId: opts?.locationId,
      classId: opts?.classId,
    });
    const items = await api.get<TeacherCandidate[]>(`${ENDPOINTS.teacherCandidates}${qs}`);
    return items ?? [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

/* =========================
   Assign teachers
   ========================= */

/**
 * POST /api/classes/:id/assign-teachers
 * Server enforces teacher.locationId === class.locationId.
 */
export async function assignTeachersToClass(
  classId: string,
  teacherIds: string[]
): Promise<boolean> {
  try {
    const payload = { teacherIds: normalizeTeacherIds(teacherIds) };
    const res = await api.post<{ ok?: boolean }>(
      `${ENDPOINTS.classes}/${classId}/assign-teachers`,
      payload
    );
    return !!res?.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}
