// web-admin/services/useChildrenAPI.ts
"use client";

import * as Types from "../../shared/types/type";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* --------------------------------- constants --------------------------------- */

const CHILDREN = "children";

/* ---------------------------------- helpers ---------------------------------- */

/** Normalize string: trim and convert empty to undefined */
function normStr(v?: string) {
  if (v == null) return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

/** Normalize string[]: trim, remove empties, unique */
function normArr(a?: string[]) {
  return Array.isArray(a)
    ? Array.from(new Set(a.map((s) => s.trim()).filter(Boolean)))
    : [];
}

/** Local-only status calculator (fallback if Firestore field is absent) */
function computeStatus(
  parentIds?: string[],
  classId?: string
): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = !!classId;
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

/** Deserialize enrollmentStatus from Firestore (string or enum value) */
function statusFromDoc(v: unknown): Types.EnrollmentStatus | undefined {
  if (v === Types.EnrollmentStatus.Active) return Types.EnrollmentStatus.Active;
  if (v === Types.EnrollmentStatus.Waitlist) return Types.EnrollmentStatus.Waitlist;
  if (v === Types.EnrollmentStatus.New) return Types.EnrollmentStatus.New;
  if (v === "Active") return Types.EnrollmentStatus.Active;
  if (v === "Waitlist") return Types.EnrollmentStatus.Waitlist;
  if (v === "New") return Types.EnrollmentStatus.New; // fallback (just in case of casing)
  return undefined;
}
/** Serialize status to Firestore (store as string) */
function statusToDoc(s: Types.EnrollmentStatus): string {
  return String(s);
}

/** Safely map Firestore doc to Types.Child */
function toChild(id: string, data: DocumentData): Types.Child {
  const parentId = Array.isArray(data.parentId) ? (data.parentId as string[]) : [];
  const classId = (data.classId as string | null) ?? undefined;

  return {
    id,
    firstName: (data.firstName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    birthDate: (data.birthDate as string) ?? "",
    parentId,
    classId,
    locationId: (data.locationId as string | null) ?? undefined,
    daycareId: (data.daycareId as string) ?? "",
    notes: (data.notes as string | null) ?? undefined,
    enrollmentStatus:
      statusFromDoc(data.enrollmentStatus) ?? computeStatus(parentId, classId),
  };
}

/* ----------------------------------- API ----------------------------------- */

/**
 * Fetch children with optional filtering by daycareId or locationId.
 * If both are provided, locationId takes precedence.
 */
export async function fetchChildren(opts?: {
  daycareId?: string;
  locationId?: string;
}): Promise<Types.Child[]> {
  const col = collection(db, CHILDREN);
  let q = query(col, orderBy("createdAt", "desc"));

  if (opts?.locationId) {
    q = query(col, where("locationId", "==", opts.locationId), orderBy("createdAt", "desc"));
  } else if (opts?.daycareId) {
    q = query(col, where("daycareId", "==", opts.daycareId), orderBy("createdAt", "desc"));
  }

  const snap = await getDocs(q);
  const out: Types.Child[] = [];
  snap.forEach((d) => out.push(toChild(d.id, d.data())));
  return out;
}

/** Client-facing input for create/update */
export type NewChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  parentId: string[];
  classId?: string;
  locationId?: string;
  daycareId?: string;
  notes?: string;
};

/**
 * Create a child document.
 * Status is persisted; classId/locationId may be null in Firestore when unassigned.
 * NOTE: Class capacity/volume is NOT adjusted here—server must handle that.
 */
export async function addChild(input: NewChildInput): Promise<Types.Child | null> {
  const parentId = normArr(input.parentId);
  const classId = normStr(input.classId);
  const status = computeStatus(parentId, classId);

  const payload: DocumentData = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate,
    parentId,
    classId: classId ?? null, // store null when unassigned
    locationId: normStr(input.locationId) ?? null,
    daycareId: normStr(input.daycareId) ?? "",
    notes: normStr(input.notes) ?? null,
    enrollmentStatus: statusToDoc(status), // persist status
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, CHILDREN), payload);

  // Return a normalized object; timestamps are server-side and will be correct on next fetch.
  return toChild(ref.id, payload);
}

/**
 * Update a child document (partial).
 * Recomputes and persists enrollmentStatus if parentId or classId changes.
 */
export async function updateChild(
  id: string,
  patch: Partial<NewChildInput>
): Promise<boolean> {
  const ref = doc(db, CHILDREN, id);
  const currSnap = await getDoc(ref);
  const curr = currSnap.data() ?? {};

  const payload: DocumentData = { updatedAt: serverTimestamp() };

  if (patch.firstName !== undefined) payload.firstName = patch.firstName.trim();
  if (patch.lastName !== undefined) payload.lastName = patch.lastName.trim();
  if (patch.birthDate !== undefined) payload.birthDate = patch.birthDate;
  if (patch.parentId !== undefined) payload.parentId = normArr(patch.parentId);
  if (patch.classId !== undefined) payload.classId = normStr(patch.classId) ?? null;
  if (patch.locationId !== undefined) payload.locationId = normStr(patch.locationId) ?? null;
  if (patch.notes !== undefined) payload.notes = normStr(patch.notes) ?? null;

  // Recompute status only when the inputs affecting it may change
  if (patch.parentId !== undefined || patch.classId !== undefined) {
    const parentIds = (patch.parentId ?? curr.parentId ?? []) as string[];
    const nextClassIdRaw =
      patch.classId !== undefined ? patch.classId : (curr.classId as string | null | undefined);
    const nextClassId =
      typeof nextClassIdRaw === "string" && nextClassIdRaw.trim() ? nextClassIdRaw : undefined;

    payload.enrollmentStatus = statusToDoc(
      computeStatus(Array.isArray(parentIds) ? parentIds : [], nextClassId)
    );
  }

  await updateDoc(ref, payload);
  return true;
}

/** Delete a child document by id */
export async function deleteChildById(id: string): Promise<boolean> {
  await deleteDoc(doc(db, CHILDREN, id));
  return true;
}

/* --------------------------- Enrollment helpers --------------------------- */

/**
 * Assign a child to a class (client-side only).
 * Recomputes and persists enrollmentStatus.
 * NOTE: Capacity/volume must be enforced server-side to avoid race conditions.
 */
export async function assignChildToClass(childId: string, classId: string): Promise<boolean> {
  const ref = doc(db, CHILDREN, childId);
  const snap = await getDoc(ref);
  const parentIds = Array.isArray(snap.data()?.parentId)
    ? (snap.data()!.parentId as string[])
    : [];

  const status = computeStatus(parentIds, classId);

  await updateDoc(ref, {
    classId,
    enrollmentStatus: statusToDoc(status),
    updatedAt: serverTimestamp(),
  });
  return true;
}

/**
 * Unassign a child from a class (client-side only).
 * Recomputes and persists enrollmentStatus.
 */
export async function unassignChildFromClass(childId: string): Promise<boolean> {
  const ref = doc(db, CHILDREN, childId);
  const snap = await getDoc(ref);
  const parentIds = Array.isArray(snap.data()?.parentId)
    ? (snap.data()!.parentId as string[])
    : [];

  const status = computeStatus(parentIds, undefined);

  await updateDoc(ref, {
    classId: null,
    enrollmentStatus: statusToDoc(status),
    updatedAt: serverTimestamp(),
  });
  return true;
}
