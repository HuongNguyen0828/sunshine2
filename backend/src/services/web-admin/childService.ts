// backend/services/web-admin/childService.ts
import { db, admin } from "../../lib/firebase";
import * as Types from "../../../../shared/types/type";

type ChildDocDB = {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId: string[];
  classId?: string;
  locationId?: string;
  daycareId: string;
  enrollmentStatus: Types.EnrollmentStatus;
  enrollmentDate?: string;
  notes?: string;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};

type ClassDocDB = {
  locationId?: string;
  capacity: number;
  volume: number;
};

type UserProfile = {
  role?: string;
  email?: string;
  daycareId?: string;
  locationId?: string;
};

type AdminScope =
  | { kind: "all" }
  | { kind: "location"; id: string }
  | { kind: "daycare"; daycareId: string };

function errorWithStatus(message: string, status: number): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function tsToISO(
  v?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue
): string | undefined {
  if (!v) return undefined;
  if (v instanceof admin.firestore.Timestamp) return v.toDate().toISOString();
  return undefined;
}

function computeStatus(
  parentIds: string[],
  classId?: string
): Types.EnrollmentStatus {
  const hasParent = Array.isArray(parentIds) && parentIds.length > 0;
  const hasClass = Boolean(classId);
  if (hasParent && hasClass) return Types.EnrollmentStatus.Active;
  if (hasParent || hasClass) return Types.EnrollmentStatus.Waitlist;
  return Types.EnrollmentStatus.New;
}

function toDTO(id: string, d: ChildDocDB): Types.Child {
  return {
    id,
    firstName: d.firstName,
    lastName: d.lastName,
    birthDate: d.birthDate,
    parentId: Array.isArray(d.parentId) ? d.parentId : [],
    classId: d.classId,
    locationId: d.locationId,
    daycareId: d.daycareId,
    enrollmentStatus: d.enrollmentStatus,
    enrollmentDate: d.enrollmentDate,
    notes: d.notes,
    createdAt: tsToISO(d.createdAt),
    updatedAt: tsToISO(d.updatedAt),
  };
}

async function loadAdminScope(uid?: string): Promise<AdminScope> {
  if (!uid) return { kind: "all" };
  const u = await db.collection("users").doc(uid).get();
  if (!u.exists) return { kind: "all" };
  const prof = u.data() as UserProfile;
  const loc = (prof.locationId ?? "").trim();
  const daycare = (prof.daycareId ?? "").trim();
  if (loc === "*") {
    if (daycare) return { kind: "daycare", daycareId: daycare };
    return { kind: "all" };
  }
  if (loc) return { kind: "location", id: loc };
  if (daycare) return { kind: "daycare", daycareId: daycare };
  return { kind: "all" };
}

async function daycareLocationIds(daycareId: string): Promise<string[]> {
  const snap = await db.collection(`daycareProvider/${daycareId}/locations`).get();
  return snap.docs.map((d) => d.id);
}

async function ensureLocationAllowed(scope: AdminScope, locationId?: string): Promise<void> {
  const deny = (): never => {
    throw errorWithStatus("Forbidden: location is not within admin scope", 403);
  };
  if (!locationId) {
    if (scope.kind !== "all") deny();
    return;
  }
  if (scope.kind === "all") return;
  if (scope.kind === "location") {
    if (scope.id !== locationId) deny();
    return;
  }
  const loc = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  if (!loc.exists) deny();
}

async function classLocation(classId?: string): Promise<string | undefined> {
  if (!classId) return undefined;
  const c = await db.collection("classes").doc(classId).get();
  const data = c.exists ? (c.data() as ClassDocDB) : undefined;
  return data?.locationId;
}

async function listChildrenByScope(
  scope: AdminScope,
  f: { classId?: string; status?: Types.EnrollmentStatus; parentId?: string }
): Promise<Types.Child[]> {
  if (f.classId) {
    let q: FirebaseFirestore.Query = db.collection("children").where("classId", "==", f.classId);
    if (f.status) q = q.where("enrollmentStatus", "==", f.status);
    if (f.parentId) q = q.where("parentId", "array-contains", f.parentId);
    const snap = await q.get();
    return snap.docs.map((d) => toDTO(d.id, d.data() as ChildDocDB));
  }

  if (scope.kind === "all") {
    let q: FirebaseFirestore.Query = db.collection("children");
    if (f.status) q = q.where("enrollmentStatus", "==", f.status);
    if (f.parentId) q = q.where("parentId", "array-contains", f.parentId);
    const snap = await q.orderBy("lastName").get();
    return snap.docs.map((d) => toDTO(d.id, d.data() as ChildDocDB));
  }

  const locIds =
    scope.kind === "location" ? [scope.id] : await daycareLocationIds(scope.daycareId);
  if (!locIds.length) return [];

  const classIds: string[] = [];
  for (const g of chunk(locIds, 10)) {
    const cs = await db.collection("classes").where("locationId", "in", g).get();
    classIds.push(...cs.docs.map((d) => d.id));
  }

  const out: Types.Child[] = [];

  if (classIds.length > 0) {
    for (const g of chunk(classIds, 10)) {
      let q: FirebaseFirestore.Query = db.collection("children").where("classId", "in", g);
      if (f.status) q = q.where("enrollmentStatus", "==", f.status);
      if (f.parentId) q = q.where("parentId", "array-contains", f.parentId);
      const snap = await q.get();
      out.push(...snap.docs.map((d) => toDTO(d.id, d.data() as ChildDocDB)));
    }
  }

  for (const g of chunk(locIds, 10)) {
    let q: FirebaseFirestore.Query = db
      .collection("children")
      .where("classId", "==", null)
      .where("locationId", "in", g);
    if (f.status) q = q.where("enrollmentStatus", "==", f.status);
    if (f.parentId) q = q.where("parentId", "array-contains", f.parentId);
    const snap = await q.get();
    out.push(...snap.docs.map((d) => toDTO(d.id, d.data() as ChildDocDB)));
  }

  const seen = new Set<string>();
  const uniq: Types.Child[] = [];
  for (const c of out) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      uniq.push(c);
    }
  }
  uniq.sort((a, b) => a.lastName.localeCompare(b.lastName));
  return uniq;
}

export async function listChildren(
  uid?: string,
  filters: { classId?: string; status?: Types.EnrollmentStatus; parentId?: string } = {}
): Promise<Types.Child[]> {
  const scope = await loadAdminScope(uid);
  return listChildrenByScope(scope, {
    classId: filters.classId,
    status: filters.status,
    parentId: filters.parentId,
  });
}

type CreateChildPayload = {
  firstName: string;
  lastName: string;
  birthDate: string;
  parentId?: string[];
  classId?: string;
  locationId?: string;
  notes?: string;
  enrollmentStatus?: Types.EnrollmentStatus;
};

export async function createChild(
  input: CreateChildPayload,
  uid?: string
): Promise<Types.Child> {
  if (!input.firstName || !input.lastName || !input.birthDate) {
    throw errorWithStatus("Missing required fields", 400);
  }

  const scope = await loadAdminScope(uid);
  const clsLoc = await classLocation(input.classId);
  const scopeFixedLoc = scope.kind === "location" ? scope.id : undefined;
  const effectiveLocationId = clsLoc ?? input.locationId ?? scopeFixedLoc ?? undefined;
  await ensureLocationAllowed(scope, effectiveLocationId);

  const parentIds = Array.isArray(input.parentId) ? input.parentId : [];
  const statusProvided = input.enrollmentStatus as Types.EnrollmentStatus | undefined;
  const status = statusProvided ?? computeStatus(parentIds, input.classId);

  if (!input.classId) {
    const payload: ChildDocDB = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      parentId: parentIds,
      classId: undefined,
      locationId: effectiveLocationId,
      daycareId: scope.kind === "daycare" ? scope.daycareId : "",
      enrollmentStatus: status,
      enrollmentDate: status === Types.EnrollmentStatus.New ? undefined : new Date().toISOString(),
      notes: input.notes?.trim() || undefined,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("children").add(payload);
    const saved = await ref.get();
    return toDTO(saved.id, saved.data() as ChildDocDB);
  }

  const classId = input.classId;
  const classRef = db.collection("classes").doc(classId);
  const childRef = db.collection("children").doc();

  await db.runTransaction(async (tx) => {
    const clsSnap = await tx.get(classRef);
    if (!clsSnap.exists) throw errorWithStatus("Class not found", 404);
    const cls = clsSnap.data() as ClassDocDB;

    await ensureLocationAllowed(scope, cls.locationId);

    const cap = Math.max(0, cls.capacity ?? 0);
    const vol = Math.max(0, cls.volume ?? 0);
    if (vol >= cap) {
      throw errorWithStatus("Class is full", 409);
    }

    const payload: ChildDocDB = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthDate: input.birthDate,
      parentId: parentIds,
      classId,
      locationId: cls.locationId ?? effectiveLocationId,
      daycareId: scope.kind === "daycare" ? scope.daycareId : "",
      enrollmentStatus: statusProvided ?? computeStatus(parentIds, classId),
      enrollmentDate:
        (statusProvided ?? computeStatus(parentIds, classId)) === Types.EnrollmentStatus.New
          ? undefined
          : new Date().toISOString(),
      notes: input.notes?.trim() || undefined,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    tx.update(classRef, { volume: vol + 1 });
    tx.set(childRef, payload);
  });

  const saved = await childRef.get();
  return toDTO(saved.id, saved.data() as ChildDocDB);
}

export async function updateChildById(
  id: string,
  patch: Partial<
    Pick<
      Types.Child,
      "firstName" | "lastName" | "birthDate" | "locationId" | "notes" | "parentId" | "enrollmentStatus"
    >
  >,
  uid?: string
): Promise<Types.Child> {
  if (!id) throw errorWithStatus("Missing child id", 400);

  const ref = db.collection("children").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw errorWithStatus("Child not found", 404);
  const curr = snap.data() as ChildDocDB;

  const nextParentIds = Array.isArray(patch.parentId) ? patch.parentId : curr.parentId;
  const nextLoc = patch.locationId ?? curr.locationId ?? (await classLocation(curr.classId));
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, nextLoc);

  const manualStatus = patch.enrollmentStatus as Types.EnrollmentStatus | undefined;
  const nextStatus = manualStatus ?? computeStatus(nextParentIds, curr.classId);

  const upd: Partial<ChildDocDB> = {
    firstName: patch.firstName ?? curr.firstName,
    lastName: patch.lastName ?? curr.lastName,
    birthDate: patch.birthDate ?? curr.birthDate,
    locationId: patch.locationId ?? curr.locationId,
    notes: patch.notes ?? curr.notes,
    parentId: nextParentIds,
    enrollmentStatus: nextStatus,
    enrollmentDate:
      nextStatus === Types.EnrollmentStatus.New
        ? curr.enrollmentDate
        : curr.enrollmentDate ?? new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.update(upd);
  const updated = await ref.get();
  return toDTO(updated.id, updated.data() as ChildDocDB);
}

export async function deleteChildById(id: string, uid?: string): Promise<void> {
  if (!id) throw errorWithStatus("Missing child id", 400);
  const ref = db.collection("children").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw errorWithStatus("Child not found", 404);
  const child = snap.data() as ChildDocDB;

  const locForScope = (await classLocation(child.classId)) ?? child.locationId;
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, locForScope);

  if (child.classId) {
    const classRef = db.collection("classes").doc(child.classId);
    await db.runTransaction(async (tx) => {
      const [clsSnap, chSnap] = await Promise.all([tx.get(classRef), tx.get(ref)]);
      if (!chSnap.exists) return;
      if (clsSnap.exists) {
        const cls = clsSnap.data() as ClassDocDB;
        tx.update(classRef, { volume: Math.max(0, (cls.volume ?? 0) - 1) });
      }
      tx.delete(ref);
    });
  } else {
    await ref.delete();
  }
}

export async function linkParentToChild(
  childId: string,
  parentUserId: string,
  uid?: string
): Promise<Types.Child> {
  if (!childId || !parentUserId) throw errorWithStatus("Missing childId or parentUserId", 400);

  const userSnap = await db.collection("users").doc(parentUserId).get();
  if (!userSnap.exists) throw errorWithStatus("Parent user not found", 404);
  const role = (userSnap.data() as UserProfile).role;
  if (role !== "parent") throw errorWithStatus("User is not a parent", 400);

  const ref = db.collection("children").doc(childId);
  const snap = await ref.get();
  if (!snap.exists) throw errorWithStatus("Child not found", 404);
  const child = snap.data() as ChildDocDB;

  const scope = await loadAdminScope(uid);
  const locForScope = (await classLocation(child.classId)) ?? child.locationId;
  await ensureLocationAllowed(scope, locForScope);

  const nextParents = Array.from(new Set([...(child.parentId ?? []), parentUserId]));
  const nextStatus = computeStatus(nextParents, child.classId);

  await ref.update({
    parentId: nextParents,
    enrollmentStatus: nextStatus,
    enrollmentDate:
      nextStatus === Types.EnrollmentStatus.New
        ? child.enrollmentDate
        : child.enrollmentDate ?? new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return toDTO(updated.id, updated.data() as ChildDocDB);
}

export async function linkParentToChildByEmail(
  childId: string,
  parentEmail: string,
  uid?: string
): Promise<Types.Child> {
  if (!childId || !parentEmail) throw errorWithStatus("Missing childId or parentEmail", 400);
  const q = await db
    .collection("users")
    .where("email", "==", parentEmail.trim().toLowerCase())
    .where("role", "==", "parent")
    .limit(1)
    .get();
  if (q.empty) throw errorWithStatus("Parent user not found by email", 404);
  const u = q.docs[0];
  return linkParentToChild(childId, u.id, uid);
}

export async function unlinkParentFromChild(
  childId: string,
  parentUserId: string,
  uid?: string
): Promise<Types.Child> {
  if (!childId || !parentUserId) throw errorWithStatus("Missing childId or parentUserId", 400);

  const ref = db.collection("children").doc(childId);
  const snap = await ref.get();
  if (!snap.exists) throw errorWithStatus("Child not found", 404);
  const child = snap.data() as ChildDocDB;

  const scope = await loadAdminScope(uid);
  const locForScope = (await classLocation(child.classId)) ?? child.locationId;
  await ensureLocationAllowed(scope, locForScope);

  const nextParents = (child.parentId ?? []).filter((id) => id !== parentUserId);
  const nextStatus = computeStatus(nextParents, child.classId);

  await ref.update({
    parentId: nextParents,
    enrollmentStatus: nextStatus,
    enrollmentDate:
      nextStatus === Types.EnrollmentStatus.New
        ? child.enrollmentDate
        : child.enrollmentDate ?? new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return toDTO(updated.id, updated.data() as ChildDocDB);
}

export async function assignChildToClass(
  childId: string,
  classId: string,
  uid?: string
): Promise<Types.Child> {
  if (!childId || !classId) throw errorWithStatus("Missing childId or classId", 400);

  const classRef = db.collection("classes").doc(classId);
  const childRef = db.collection("children").doc(childId);

  await db.runTransaction(async (tx) => {
    const [clsSnap, chSnap] = await Promise.all([tx.get(classRef), tx.get(childRef)]);
    if (!clsSnap.exists || !chSnap.exists) throw errorWithStatus("Child or class not found", 404);

    const cls = clsSnap.data() as ClassDocDB;
    const child = chSnap.data() as ChildDocDB;

    const scope = await loadAdminScope(uid);
    await ensureLocationAllowed(scope, cls.locationId);

    const cap = Math.max(0, cls.capacity ?? 0);
    const vol = Math.max(0, cls.volume ?? 0);
    if (vol >= cap) {
      throw errorWithStatus("Class is full", 409); // Can also have guard checking from frontend before shifting to backend
    }

    const nextStatus = computeStatus(child.parentId, classId); // Update both parent and child status

    tx.update(classRef, { volume: vol + 1 });
    tx.update(childRef, {
      classId,                       // Children just go for 1 class at a time, update this class to other class. 
      locationId: cls.locationId ?? child.locationId,
      enrollmentStatus: nextStatus,
      enrollmentDate:
        nextStatus === Types.EnrollmentStatus.New
          ? child.enrollmentDate
          : child.enrollmentDate ?? new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const saved = await childRef.get();
  return toDTO(saved.id, saved.data() as ChildDocDB);
}

export async function unassignChild(childId: string, uid?: string): Promise<Types.Child> {
  if (!childId) throw errorWithStatus("Missing childId", 400);
  const ref = db.collection("children").doc(childId);

  await db.runTransaction(async (tx) => {
    const ch = await tx.get(ref);
    if (!ch.exists) throw errorWithStatus("Child not found", 404);
    const c = ch.data() as ChildDocDB;

    if (c.classId) {
      const classRef = db.collection("classes").doc(c.classId);
      const clsSnap = await tx.get(classRef);
      const cls = clsSnap.exists ? (clsSnap.data() as ClassDocDB) : undefined;

      const scope = await loadAdminScope(uid);
      await ensureLocationAllowed(scope, cls?.locationId);

      if (clsSnap.exists) {
        tx.update(classRef, { volume: Math.max(0, (cls!.volume ?? 0) - 1) });
      }
    }

    const nextStatus = computeStatus(c.parentId, undefined);

    tx.update(ref, {
      classId: admin.firestore.FieldValue.delete(),
      enrollmentStatus: nextStatus,
      enrollmentDate:
        nextStatus === Types.EnrollmentStatus.New
          ? c.enrollmentDate
          : c.enrollmentDate ?? new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const saved = await ref.get();
  return toDTO(saved.id, saved.data() as ChildDocDB);
}

export async function withdrawChild(childId: string, uid?: string): Promise<Types.Child> {
  return unassignChild(childId, uid);
}

export async function reEnrollChild(
  childId: string,
  classId: string,
  uid?: string
): Promise<Types.Child> {
  return assignChildToClass(childId, classId, uid);
}
