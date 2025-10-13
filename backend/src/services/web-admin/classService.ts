// backend/services/web-admin/classService.ts
import { db, admin } from "../../lib/firebase";
import * as Types from "../../../../shared/types/type"; // shared DTO types

/**
 * Firestore "classes" DB model (backend only).
 * - Uses Firestore Timestamp/FieldValue internally.
 * - Externally, we always return DTO from shared/types.
 */
type ClassDocDB = {
  name: string;
  locationId?: string;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom?: string;
  teacherIds?: string[];
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};

/** User profile fields for scope calculation. */
type UserProfile = {
  role?: string;
  locationIds?: string[]; // ["*"] = wildcard → use daycare scope if present
  daycareId?: string;
};

/** Teacher shape (subset of users doc). */
type Teacher = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;     // "teacher"
  status?: string;   // "New" | "Active" | ...
  classIds?: string[];
};

/** Admin scope model. */
type AdminScope =
  | { kind: "all" }
  | { kind: "locations"; ids: string[] }
  | { kind: "daycare"; daycareId: string };

/* ------------------------------------------
 * Helpers: type guards, mappers, utilities
 * ------------------------------------------ */

/** Detect Firestore Timestamp without using any. */
function isTimestamp(v: unknown): v is FirebaseFirestore.Timestamp {
  return typeof v === "object" && v !== null && "toDate" in (v as { toDate?: () => Date });
}

/** Convert Timestamp/FieldValue to ISO string if it's a Timestamp. */
function tsToISO(
  v?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue
): string | undefined {
  if (v && isTimestamp(v)) {
    return v.toDate().toISOString();
  }
  return undefined;
}

/** DB -> DTO converter (shared Types.Class). */
function classDocToDTO(id: string, data: ClassDocDB): Types.Class {
  return {
    id,
    name: data.name,
    locationId: data.locationId,
    capacity: data.capacity,
    volume: data.volume,
    ageStart: data.ageStart,
    ageEnd: data.ageEnd,
    classroom: data.classroom,
    teacherIds: data.teacherIds,
    createdAt: tsToISO(data.createdAt),
    updatedAt: tsToISO(data.updatedAt),
  };
}

/** Split array into chunks (for Firestore 'in' limit of 10). */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ------------------------------------------
 * Scope helpers
 * ------------------------------------------ */

/** Build admin scope based on users/{uid}. */
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

/** Resolve all location ids under daycareProvider/{daycareId}/locations. */
async function resolveDaycareLocationIds(daycareId: string): Promise<string[]> {
  const ref = db.collection(`daycareProvider/${daycareId}/locations`);
  const snap = await ref.get();
  return snap.docs.map((d) => d.id);
}

/** Ensure a specific location is allowed by admin scope. */
async function ensureLocationAllowed(scope: AdminScope, locationId?: string): Promise<void> {
  const forbidden = (): never => {
    const err = new Error("Forbidden: location is not within admin scope") as Error & { status?: number };
    err.status = 403;
    throw err;
  };

  if (!locationId) {
    // No location on class: allowed only when scope is "all".
    if (scope.kind !== "all") forbidden();
    return;
  }

  if (scope.kind === "all") return;

  if (scope.kind === "locations") {
    if (!scope.ids.includes(locationId)) forbidden();
    return;
  }

  // scope.kind === "daycare": verify that this location belongs to daycare
  const locSnap = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  if (!locSnap.exists) forbidden();
}

/** Query classes by a set of location ids, handling Firestore 'in' batching. */
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

  // Deduplicate by id (defensive)
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

/** Query classes by admin scope. */
async function queryClassesByScope(scope: AdminScope) {
  if (scope.kind === "all") {
    const snap = await db.collection("classes").orderBy("name").get();
    return snap.docs;
  }
  if (scope.kind === "locations") {
    return queryByLocationIds(scope.ids);
  }
  // scope.kind === "daycare"
  const locIds = await resolveDaycareLocationIds(scope.daycareId);
  return queryByLocationIds(locIds);
}

/* ------------------------------------------
 * Services (public API for controllers)
 * ------------------------------------------ */

/** List classes according to admin scope. Returns shared DTOs. */
export async function listClasses(uid?: string): Promise<Types.Class[]> {
  const scope = await loadAdminScope(uid);
  const docs = await queryClassesByScope(scope);
  return docs.map((d) => classDocToDTO(d.id, d.data() as ClassDocDB));
}

/** Create a class with scope and location validation. Returns DTO. */
export async function createClass(input: Types.Class, uid?: string): Promise<Types.Class> {
  const { name, capacity, volume, ageStart, ageEnd, locationId, classroom } = input;
  if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null) {
    throw new Error("Missing fields");
  }

  // Permission
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, locationId ?? undefined);

  // Location existence check
  if (locationId) {
    const cg = await db
      .collectionGroup("locations")
      .where(admin.firestore.FieldPath.documentId(), "==", locationId)
      .get();
    if (cg.empty) throw new Error("Location not found");
  }

  const payload: ClassDocDB = {
    name,
    locationId: locationId || undefined,
    capacity,
    volume,
    ageStart,
    ageEnd,
    classroom,
    teacherIds: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("classes").add(payload);
  const snap = await ref.get();
  return classDocToDTO(ref.id, snap.data() as ClassDocDB);
}

/** Update a class by id (scope + location validation). Returns DTO. */
export async function updateClassById(
  id: string,
  input: Partial<Types.Class>,
  uid?: string
): Promise<Types.Class> {
  if (!id) throw new Error("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Class not found");

  const current = doc.data() as ClassDocDB | undefined;
  const nextLocationId = input.locationId ?? current?.locationId;

  // Permission
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, nextLocationId);

  // Location existence if changed/provided
  if (input.locationId) {
    const cg = await db
      .collectionGroup("locations")
      .where(admin.firestore.FieldPath.documentId(), "==", input.locationId)
      .get();
    if (cg.empty) throw new Error("Location not found");
  }

  await ref.update({
    ...(input.locationId !== undefined ? { locationId: input.locationId || undefined } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
    ...(input.volume !== undefined ? { volume: input.volume } : {}),
    ...(input.ageStart !== undefined ? { ageStart: input.ageStart } : {}),
    ...(input.ageEnd !== undefined ? { ageEnd: input.ageEnd } : {}),
    ...(input.classroom !== undefined ? { classroom: input.classroom || undefined } : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return classDocToDTO(id, updated.data() as ClassDocDB);
}

/** Delete a class by id (scope checked) and clean users[].classIds. */
export async function deleteClassById(id: string, uid?: string): Promise<void> {
  if (!id) throw new Error("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Class not found");

  const cls = doc.data() as ClassDocDB | undefined;

  // Permission
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, cls?.locationId);

  // Cleanup referencing users.classIds
  const usersSnap = await db
    .collection("users")
    .where("classIds", "array-contains", id)
    .get();

  const batch = db.batch();
  usersSnap.forEach((u) => {
    const d = u.data() as { classIds?: string[] };
    const curr = Array.isArray(d.classIds) ? d.classIds : [];
    batch.update(u.ref, { classIds: curr.filter((c) => c !== id) });
  });
  batch.delete(ref);
  await batch.commit();
}

/** Optional: list teacher candidates (role=teacher, optionally status=New). */
export async function listTeacherCandidates(onlyNew = true): Promise<(Teacher & { id: string })[]> {
  let q = db.collection("users").where("role", "==", "teacher");
  if (onlyNew) q = q.where("status", "==", "New");
  const snap = await q.get();
  return snap.docs.map((d) => {
    const data = d.data() as Teacher;
    return {
      id: d.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
      status: data.status,
      classIds: Array.isArray(data.classIds) ? data.classIds : [],
    };
  });
}

/**
 * Assign teachers to a class.
 * - If teacherIds omitted/empty: auto-pick users with role=teacher & status=New.
 * - On assigning, set users/{id}.status = "Active".
 * - Returns the diff result (assigned/unassigned/ignoredInvalid).
 */
export async function assignTeachersToClass(
  classId: string,
  teacherIds?: string[],
  uid?: string
): Promise<{ assigned: string[]; unassigned: string[]; ignoredInvalid: string[]; classId: string }> {
  if (!classId) throw new Error("Missing class id");

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) throw new Error("Class not found");

  const cls = classSnap.data() as ClassDocDB | undefined;

  // Permission based on class.locationId
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
    return { assigned: [], unassigned: [], ignoredInvalid: [], classId };
  }

  // Validate user existence & role
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
    return { assigned: [], unassigned: [], ignoredInvalid: invalid, classId };
  }

  // Current assignment state (users where classIds contains classId)
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
        status: "Active", // set to Active upon assignment
      });
    }

    for (const id of toRemove) {
      const uRef = db.collection("users").doc(id);
      tx.update(uRef, { classIds: admin.firestore.FieldValue.arrayRemove(classId) });
    }
  });

  return { assigned: toAdd, unassigned: toRemove, ignoredInvalid: invalid, classId };
}
