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
  runTransaction,
  documentId, 
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CHILDREN = "children";
const CLASSES = "classes";
const USERS = "users";

function normStr(v?: string): string | undefined {
  if (v == null) return undefined;
  const t = v.trim();
  return t ? t : undefined;
}
function normArr(a?: string[]): string[] {
  return Array.isArray(a)
    ? Array.from(new Set(a.map((s) => s.trim()).filter(Boolean)))
    : [];
}
function computeStatus(parentIds?: string[], classId?: string): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = !!classId;
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}
function statusFromDoc(v: unknown): Types.EnrollmentStatus | undefined {
  if (v === Types.EnrollmentStatus.Active) return Types.EnrollmentStatus.Active;
  if (v === Types.EnrollmentStatus.Waitlist) return Types.EnrollmentStatus.Waitlist;
  if (v === Types.EnrollmentStatus.New) return Types.EnrollmentStatus.New;
  if (v === Types.EnrollmentStatus.Withdraw) return Types.EnrollmentStatus.Withdraw;
  if (v === "Active") return Types.EnrollmentStatus.Active;
  if (v === "Waitlist") return Types.EnrollmentStatus.Waitlist;
  if (v === "New") return Types.EnrollmentStatus.New;
  if (v === "Withdraw") return Types.EnrollmentStatus.Withdraw;
  return undefined;
}
function statusToDoc(s: Types.EnrollmentStatus): string {
  return String(s);
}
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


export async function fetchChildren(opts?: {
  daycareId?: string;
  locationId?: string;
}): Promise<Types.Child[]> {
  const col = collection(db, CHILDREN);
  let qRef = query(col, orderBy("createdAt", "desc"));
  if (opts?.locationId) {
    qRef = query(col, where("locationId", "==", opts.locationId), orderBy("createdAt", "desc"));
  } else if (opts?.daycareId) {
    qRef = query(col, where("daycareId", "==", opts.daycareId), orderBy("createdAt", "desc"));
  }
  const snap = await getDocs(qRef);
  const out: Types.Child[] = [];
  snap.forEach((d) => out.push(toChild(d.id, d.data())));
  return out;
}

export type NewChildInput = {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId: string[];
  classId?: string;
  locationId?: string;
  daycareId?: string;
  notes?: string;
  enrollmentStatus?: Types.EnrollmentStatus;
};

export type ParentLite = { id: string; firstName?: string; lastName?: string; email?: string };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function fetchParentsLiteByIds(ids: string[]): Promise<ParentLite[]> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  if (uniq.length === 0) return [];

  const out: ParentLite[] = [];
  for (const group of chunk(uniq, 10)) {
    const qRef = query(
      collection(db, USERS),
      where(documentId(), "in", group),
      where("role", "==", "parent")
    );
    const snap = await getDocs(qRef);
    snap.forEach((d) => {
      const data = d.data() as { firstName?: string; lastName?: string; email?: string; profile?: Record<string, unknown> };
      let firstName = data.firstName;
      let lastName = data.lastName;
      if ((!firstName || !lastName) && data.profile && typeof data.profile === "object") {
        const p = data.profile as { firstName?: string; lastName?: string };
        firstName = firstName ?? p.firstName;
        lastName = lastName ?? p.lastName;
      }
      out.push({
        id: d.id,
        firstName,
        lastName,
        email: data.email,
      });
    });
  }
  return out;
}

export async function addChild(input: NewChildInput): Promise<Types.Child | null> {
  const parentId = normArr(input.parentId);
  const classId = normStr(input.classId);
  const status = input.enrollmentStatus ?? computeStatus(parentId, classId);
  const payload: DocumentData = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate: input.birthDate,
    parentId,
    classId: classId ?? null,
    locationId: normStr(input.locationId) ?? null,
    daycareId: normStr(input.daycareId) ?? "",
    notes: normStr(input.notes) ?? null,
    enrollmentStatus: statusToDoc(status),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, CHILDREN), payload);
  return toChild(ref.id, payload);
}

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

  if (patch.enrollmentStatus !== undefined) {
    payload.enrollmentStatus = statusToDoc(patch.enrollmentStatus);
  } else if (patch.parentId !== undefined || patch.classId !== undefined) {
    const parentIds = (patch.parentId ?? (curr.parentId as string[] | undefined) ?? []) as string[];
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

export async function deleteChildById(id: string): Promise<boolean> {
  await deleteDoc(doc(db, CHILDREN, id));
  return true;
}

export async function assignChildToClass(childId: string, classId: string): Promise<boolean> {
  const classRef = doc(db, CLASSES, classId);
  const childRef = doc(db, CHILDREN, childId);

  await runTransaction(db, async (tx) => {
    const [clsSnap, chSnap] = await Promise.all([tx.get(classRef), tx.get(childRef)]);
    if (!clsSnap.exists() || !chSnap.exists()) {
      throw new Error("Child or class not found");
    }

    const cls = clsSnap.data() as { capacity?: number; volume?: number; locationId?: string };
    const child = chSnap.data() as { parentId?: string[]; locationId?: string | null };

    const cap = Math.max(0, cls.capacity ?? 0);
    const vol = Math.max(0, cls.volume ?? 0);
    if (vol >= cap) {
      const err = new Error("Class is full") as Error & { status?: number };
      err.status = 409;
      throw err;
    }

    const parentIds = Array.isArray(child.parentId) ? child.parentId : [];
    const nextStatus = computeStatus(parentIds, classId);

    tx.update(classRef, { volume: vol + 1 });
    tx.update(childRef, {
      classId,
      locationId: cls.locationId ?? (child.locationId ?? null),
      enrollmentStatus: statusToDoc(nextStatus),
      updatedAt: serverTimestamp(),
    });
  });

  return true;
}

export async function unassignChildFromClass(childId: string): Promise<boolean> {
  const childRef = doc(db, CHILDREN, childId);

  await runTransaction(db, async (tx) => {
    const chSnap = await tx.get(childRef);
    if (!chSnap.exists()) throw new Error("Child not found");

    const c = chSnap.data() as { classId?: string | null; parentId?: string[] };
    const currentClassId = typeof c.classId === "string" && c.classId.trim() ? c.classId : undefined;

    if (currentClassId) {
      const classRef = doc(db, CLASSES, currentClassId);
      const clsSnap = await tx.get(classRef);
      if (clsSnap.exists()) {
        const cls = clsSnap.data() as { volume?: number };
        const nextVol = Math.max(0, (cls.volume ?? 0) - 1);
        tx.update(classRef, { volume: nextVol });
      }
    }

    const parentIds = Array.isArray(c.parentId) ? c.parentId : [];
    const nextStatus = computeStatus(parentIds, undefined);

    tx.update(childRef, {
      classId: null,
      enrollmentStatus: statusToDoc(nextStatus),
      updatedAt: serverTimestamp(),
    });
  });

  return true;
}

export async function linkParentToChildByEmail(childId: string, email: string): Promise<boolean> {
  const emailTrim = email.trim().toLowerCase();
  const qRef = query(
    collection(db, USERS),
    where("email", "==", emailTrim),
    where("role", "==", "parent")
  );
  const snap = await getDocs(qRef);
  const docSnap = snap.docs[0];
  if (!docSnap) throw new Error("Parent user not found by email");
  const parentUserId = docSnap.id;

  const ref = doc(db, CHILDREN, childId);
  await runTransaction(db, async (tx) => {
    const ch = await tx.get(ref);
    if (!ch.exists()) throw new Error("Child not found");
    const data = ch.data() as { parentId?: string[]; classId?: string | null };

    const curr = Array.isArray(data.parentId) ? data.parentId : [];
    const nextParents = Array.from(new Set([...curr, parentUserId]));
    const nextStatus = computeStatus(nextParents, typeof data.classId === "string" ? data.classId : undefined);

    tx.update(ref, {
      parentId: nextParents,
      enrollmentStatus: statusToDoc(nextStatus),
      updatedAt: serverTimestamp(),
    });
  });

  return true;
}

export async function unlinkParentFromChild(childId: string, parentUserId: string): Promise<boolean> {
  const ref = doc(db, CHILDREN, childId);
  await runTransaction(db, async (tx) => {
    const ch = await tx.get(ref);
    if (!ch.exists()) throw new Error("Child not found");
    const data = ch.data() as { parentId?: string[]; classId?: string | null };
    const curr = Array.isArray(data.parentId) ? data.parentId : [];
    const nextParents = curr.filter((id) => id !== parentUserId);
    const nextStatus = computeStatus(nextParents, typeof data.classId === "string" ? data.classId : undefined);

    tx.update(ref, {
      parentId: nextParents,
      enrollmentStatus: statusToDoc(nextStatus),
      updatedAt: serverTimestamp(),
    });
  });
  return true;
}
