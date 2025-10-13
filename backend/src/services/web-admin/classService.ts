// backend/services/web-admin/classService.ts
import { db, admin } from "../../lib/firebase";

// ----- Firestore document shapes -----
export type ClassDoc = {
  name: string;
  locationId?: string | undefined;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom?: string | undefined;
  createdAt?: FirebaseFirestore.FieldValue | undefined;
  updatedAt?: FirebaseFirestore.FieldValue | undefined;
};

type UserProfile = {
  role?: string;
  locationIds?: string[]; // ["*"] means wildcard → handled as "no explicit restriction" (use daycare scope if present)
  daycareId?: string;
};

// ----- Admin scope model -----
// Rule:
// - If admin.locationIds has one or more concrete ids (not just ["*"]), restrict to those locations.
// - Else (locationIds missing/empty or ["*"] present):
//     - if admin.daycareId exists => restrict to that daycare's locations
//     - else => no restriction (all)
type AdminScope =
  | { kind: "all" }
  | { kind: "locations"; ids: string[] }
  | { kind: "daycare"; daycareId: string };

// Utility: split large arrays into chunks of size n
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ----- Scope helpers -----
async function loadAdminScope(uid?: string): Promise<AdminScope> {
  if (!uid) return { kind: "all" };

  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return { kind: "all" };

  const u = snap.data() as UserProfile;

  const locs: string[] = Array.isArray(u.locationIds)
    ? u.locationIds.filter((v) => typeof v === "string" && v.trim().length > 0)
    : [];

  const hasWildcard = locs.includes("*");
  const concreteLocs = locs.filter((v) => v !== "*");

  if (concreteLocs.length > 0) {
    return { kind: "locations", ids: concreteLocs };
  }

  if (hasWildcard || concreteLocs.length === 0) {
    if (u.daycareId && u.daycareId.trim().length > 0) {
      return { kind: "daycare", daycareId: u.daycareId.trim() };
    }
  }

  return { kind: "all" };
}

async function resolveDaycareLocationIds(daycareId: string): Promise<string[]> {
  const ref = db.collection(`daycareProvider/${daycareId}/locations`);
  const snap = await ref.get();
  return snap.docs.map((d) => d.id);
}

async function ensureLocationAllowed(scope: AdminScope, locationId?: string): Promise<void> {
  const throwForbidden = (): never => {
    const err = new Error("Forbidden: location is not within admin scope") as Error & { status?: number };
    err.status = 403;
    throw err;
  };

  if (!locationId) {
    if (scope.kind !== "all") throwForbidden();
    return;
  }

  if (scope.kind === "all") return;

  if (scope.kind === "locations") {
    if (!scope.ids.includes(locationId)) throwForbidden();
    return;
  }

  // scope.kind === "daycare": check if this location belongs to that daycare
  const locSnap = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  if (!locSnap.exists) throwForbidden();
}

async function queryByLocationIds(ids: string[]) {
  if (ids.length === 0) return [] as FirebaseFirestore.QueryDocumentSnapshot[];
  const out: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const group of chunk(ids, 10)) {
    if (group.length === 0) continue;
    const qs = await db
      .collection("classes")
      .where("locationId", "in", group)
      .orderBy("name")
      .get();
    out.push(...qs.docs);
  }
  // uniq by id (defensive)
  const seen = new Set<string>();
  const uniq: typeof out = [];
  for (const d of out) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      uniq.push(d);
    }
  }
  return uniq;
}

async function queryClassesByScope(scope: AdminScope) {
  if (scope.kind === "all") {
    const snap = await db.collection("classes").orderBy("name").get();
    return snap.docs;
  }
  if (scope.kind === "locations") {
    return await queryByLocationIds(scope.ids);
  }
  // daycare
  const locIds = await resolveDaycareLocationIds(scope.daycareId);
  return await queryByLocationIds(locIds);
}

// ----- Services -----
// List classes according to the current admin's scope
export async function listClasses(uid?: string) {
  const scope = await loadAdminScope(uid);
  const docs = await queryClassesByScope(scope);
  return docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ClassDoc, "createdAt" | "updatedAt">),
  }));
}

// Create a class (scope + location existence validation)
export async function createClass(input: ClassDoc, uid?: string) {
  const { name, capacity, volume, ageStart, ageEnd, locationId } = input;
  if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null) {
    throw new Error("Missing fields");
  }

  // Permission check
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, locationId);

  // Validate location existence if provided
  if (locationId) {
    const cg = await db
      .collectionGroup("locations")
      .where(admin.firestore.FieldPath.documentId(), "==", locationId)
      .get();
    if (cg.empty) throw new Error("Location not found");
  }

  const payload: ClassDoc = {
    ...input,
    locationId: input.locationId || undefined,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("classes").add(payload);
  const snap = await ref.get();
  const data = snap.data() as ClassDoc | undefined;
  return { id: ref.id, ...(data ?? {}) };
}

// Update a class by id (scope + location existence validation)
export async function updateClassById(id: string, input: Partial<ClassDoc>, uid?: string) {
  if (!id) throw new Error("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Class not found");

  const current = doc.data() as ClassDoc | undefined;
  const nextLocationId = input.locationId ?? current?.locationId;

  // Permission check
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, nextLocationId);

  // Validate location existence if provided
  if (input.locationId) {
    const cg = await db
      .collectionGroup("locations")
      .where(admin.firestore.FieldPath.documentId(), "==", input.locationId)
      .get();
    if (cg.empty) throw new Error("Location not found");
  }

  await ref.update({
    ...input,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const data = updated.data() as ClassDoc | undefined;
  return { id, ...(data ?? {}) };
}

// Delete a class by id (scope checked, then cleanup users[].classIds)
export async function deleteClassById(id: string, uid?: string) {
  if (!id) throw new Error("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Class not found");

  const cls = doc.data() as ClassDoc | undefined;

  // Permission check
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, cls?.locationId);

  // Cleanup references in users[].classIds
  const usersSnap = await db
    .collection("users")
    .where("classIds", "array-contains", id)
    .get();

  const batch = db.batch();
  usersSnap.forEach((u) => {
    const curr = (u.data().classIds as string[]) || [];
    batch.update(u.ref, { classIds: curr.filter((c) => c !== id) });
  });
  batch.delete(ref);
  await batch.commit();
}

// Optional utility: teacher candidates (role=teacher, optionally status=New)
export async function listTeacherCandidates(onlyNew = true) {
  let q = db.collection("users").where("role", "==", "teacher");
  if (onlyNew) q = q.where("status", "==", "New");
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
}

// Assign teachers to a class; if ids omitted, auto-pick role=teacher & status=New
// On assign, set users/{id}.status = "Active"
export async function assignTeachersToClass(classId: string, teacherIds?: string[], uid?: string) {
  if (!classId) throw new Error("Missing class id");

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) throw new Error("Class not found");

  const cls = classSnap.data() as ClassDoc | undefined;

  // Permission check based on class.locationId
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, cls?.locationId);

  // Normalize / auto-pick
  let candidateIds: string[] =
    Array.isArray(teacherIds) && teacherIds.length
      ? Array.from(new Set(teacherIds.map((s) => s.trim()).filter((s) => s.length > 0)))
      : [];

  if (candidateIds.length === 0) {
    const elig = await db
      .collection("users")
      .where("role", "==", "teacher")
      .where("status", "==", "New")
      .get();
    candidateIds = elig.docs.map((d) => d.id);
  }
  if (candidateIds.length === 0) {
    return { assigned: [] as string[], unassigned: [] as string[], ignoredInvalid: [] as string[], classId };
  }

  // Validate user existence and role
  const userSnaps = await Promise.all(candidateIds.map((id) => db.collection("users").doc(id).get()));
  const validIds: string[] = [];
  const invalid: string[] = [];
  userSnaps.forEach((snap, i) => {
    const id = candidateIds[i];
    if (!snap.exists) {
      invalid.push(id);
      return;
    }
    const data = snap.data() as { role?: string } | undefined;
    if (data?.role === "teacher") validIds.push(id);
    else invalid.push(id);
  });
  if (validIds.length === 0) {
    return { assigned: [] as string[], unassigned: [] as string[], ignoredInvalid: invalid, classId };
  }

  // Current assignment state
  const currentAssignedSnap = await db
    .collection("users")
    .where("classIds", "array-contains", classId)
    .get();
  const current = new Set(currentAssignedSnap.docs.map((d) => d.id));
  const selected = new Set(validIds);

  const toAdd = validIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !selected.has(id));

  // Transaction (write-only)
  await db.runTransaction(async (tx) => {
    if (toAdd.length) {
      tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayUnion(...toAdd) });
    }
    if (toRemove.length) {
      tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayRemove(...toRemove) });
    }

    for (const id of toAdd) {
      const uRef = db.collection("users").doc(id);
      tx.update(uRef, {
        classIds: admin.firestore.FieldValue.arrayUnion(classId),
        status: "Active", // requirement: set to Active on assignment
      });
    }

    for (const id of toRemove) {
      const uRef = db.collection("users").doc(id);
      tx.update(uRef, { classIds: admin.firestore.FieldValue.arrayRemove(classId) });
    }
  });

  return { assigned: toAdd, unassigned: toRemove, ignoredInvalid: invalid, classId };
}
