// web-admin/services/useChildrenAPI.ts
"use client";

import * as Types from "../../shared/types/type";
import api from "@/api/client";
import { ENDPOINTS } from "@/api/endpoint";

/* ------------- small normalizers ------------- */
function nStr(v?: string) {
  if (v == null) return undefined;
  const t = v.trim();
  return t ? t : undefined;
}
function nArr(a?: string[]) {
  return Array.isArray(a)
    ? Array.from(new Set(a.map((s) => s.trim()).filter(Boolean)))
    : [];
}

/* ------------- types aligned to backend ------------- */
export type CreateChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;     // YYYY-MM-DD
  parentId?: string[];   // users/{id} with role="parent"
  classId?: string;
  locationId?: string;
  notes?: string;
};

export type UpdateChildInput = Partial<{
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId: string[];
  locationId: string;
  notes: string;
}>;

type Ok = { ok: true };

/* ------------- API calls ------------- */

export async function fetchChildren(params?: {
  classId?: string;
  status?: Types.EnrollmentStatus;
  parentId?: string; // -> parentUserId (backend expects this name)
}): Promise<Types.Child[]> {
  const q: string[] = [];
  if (params?.classId) q.push(`classId=${encodeURIComponent(params.classId)}`);
  if (params?.status) q.push(`status=${encodeURIComponent(params.status)}`);
  if (params?.parentId) q.push(`parentUserId=${encodeURIComponent(params.parentId)}`);
  const qs = q.length ? `?${q.join("&")}` : "";
  return (await api.get<Types.Child[]>(`${ENDPOINTS.children}${qs}`)) ?? [];
}

export async function createChild(input: CreateChildInput) {
  const payload: CreateChildInput = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate,
    parentId: nArr(input.parentId),
    classId: nStr(input.classId),
    locationId: nStr(input.locationId),
    notes: nStr(input.notes),
  };
  return (await api.post<Types.Child>(ENDPOINTS.children, payload)) ?? null;
}

export async function updateChild(id: string, patch: UpdateChildInput) {
  const payload: UpdateChildInput = {
    ...(patch.firstName !== undefined ? { firstName: patch.firstName.trim() } : {}),
    ...(patch.lastName !== undefined ? { lastName: patch.lastName.trim() } : {}),
    ...(patch.birthDate !== undefined ? { birthDate: patch.birthDate } : {}),
    ...(patch.parentId !== undefined ? { parentId: nArr(patch.parentId) } : {}),
    ...(patch.locationId !== undefined ? { locationId: nStr(patch.locationId) } : {}),
    ...(patch.notes !== undefined ? { notes: nStr(patch.notes) } : {}),
  };
  return (await api.put<Types.Child>(`${ENDPOINTS.children}/${id}`, payload)) ?? null;
}

export async function deleteChild(id: string) {
  await api.delete<void>(`${ENDPOINTS.children}/${id}`);
  return true;
}

/* --- enrollment actions --- */
export async function assignChild(childId: string, classId: string) {
  return (await api.post<Ok>(`${ENDPOINTS.children}/${childId}/assign`, { classId })) ?? null;
}
export async function unassignChild(childId: string) {
  return (await api.post<Ok>(`${ENDPOINTS.children}/${childId}/unassign`, {})) ?? null;
}
export async function withdrawChild(childId: string) {
  // controller: withdraw == unassign
  return (await api.post<Ok>(`${ENDPOINTS.children}/${childId}/withdraw`, {})) ?? null;
}
export async function reenrollChild(childId: string, classId: string) {
  // controller: re-enroll == assign again
  return (await api.post<Ok>(`${ENDPOINTS.children}/${childId}/re-enroll`, { classId })) ?? null;
}

/* --- parent linking --- */
export async function linkParentByEmail(childId: string, email: string) {
  return (
    (await api.post<Ok>(`${ENDPOINTS.children}/${childId}/link-parent-by-email`, { email })) ?? null
  );
}
export async function unlinkParent(childId: string, parentUserId: string) {
  return (
    (await api.post<Ok>(`${ENDPOINTS.children}/${childId}/unlink-parent`, { parentUserId })) ?? null
  );
}
