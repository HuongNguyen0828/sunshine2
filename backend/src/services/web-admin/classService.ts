// backend/services/web-admin/classService.ts
import { db, admin } from "../../lib/firebase";
import * as Types from "../../../../shared/types/type";
import { UserRole } from "../../models/user";

/**
 * Firestore "classes" DB model (backend only).
 * locationId is REQUIRED.
 */
type ClassDocDB = {
  name: string;
  locationId: string; // REQUIRED
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom?: string;
  teacherIds: string[];
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};

/** User profile fields for scope calculation. */
type UserProfile = {
  role?: string;
  daycareId?: string;  // single daycare scope
  locationId?: string; // single fixed location (overrides daycare)
};

/** Teacher shape (subset of users doc). */
type Teacher = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;     // "teacher"
  status?: string;   // "New" | "Active" | ...
  classIds?: string[];
  locationId?: string; // REQUIRED for location-safe assignment
};

/** Admin scope model - UNIFIED: single location only */
type AdminScope =
  | { kind: "all" }
  | { kind: "location"; id: string }
  | { kind: "daycare"; daycareId: string };

/* ------------------------------------------
 * Custom Errors
 * ------------------------------------------ */
class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
class ForbiddenError extends AppError {
  constructor(message = "Forbidden: location is not within admin scope") {
    super(403, message);
  }
}
class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}
class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}

/* ------------------------------------------
 * Helpers: type guards, mappers, utilities
 * ------------------------------------------ */

/** Detect Firestore Timestamp. */
function isTimestamp(v: unknown): v is FirebaseFirestore.Timestamp {
  return typeof v === "object" && v !== null && "toDate" in (v as { toDate?: () => Date });
}

/** Convert Timestamp/FieldValue to ISO string. */
function tsToISO(
  v: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue
): string {
  if (isTimestamp(v)) return v.toDate().toISOString();
  return new Date(0).toISOString();
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
    teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds : [],
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

  const loc = typeof u.locationId === "string" ? u.locationId.trim() : "";
  if (loc) return { kind: "location", id: loc };

  const daycare = typeof u.daycareId === "string" ? u.daycareId.trim() : "";
  if (daycare) return { kind: "daycare", daycareId: daycare };

  return { kind: "all" };
}

/** Resolve all location ids under daycareProvider/{daycareId}/locations. */
async function resolveDaycareLocationIds(daycareId: string): Promise<string[]> {
  const ref = db.collection(`daycareProvider/${daycareId}/locations`);
  const snap = await ref.get();
  return snap.docs.map((d) => d.id);
}

/** Ensure a specific location is allowed by admin scope (locationId is REQUIRED). */
async function ensureLocationAllowed(scope: AdminScope, locationId: string): Promise<void> {
  if (!locationId || !locationId.trim()) throw new BadRequestError("Location ID is required");
  if (scope.kind === "all") return;

  if (scope.kind === "location") {
    if (scope.id !== locationId) throw new ForbiddenError();
    return;
  }

  const locSnap = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  if (!locSnap.exists) throw new ForbiddenError();
}

/** Validate that a location exists. */
async function assertLocationExists(locationId: string, scope: AdminScope): Promise<void> {
  if (!locationId || !locationId.trim()) throw new NotFoundError("Location not found");

  if (scope.kind === "daycare") {
    const ref = db.collection(`daycareProvider/${scope.daycareId}/locations`).doc(locationId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundError("Location not found");
    return;
  }

  if (scope.kind === "location") return; // already validated

  const cg = await db
    .collectionGroup("locations")
    .where(admin.firestore.FieldPath.documentId(), "==", locationId)
    .limit(1)
    .get();
  if (cg.empty) throw new NotFoundError("Location not found");
}

/** Query classes by a set of location ids, handling Firestore 'in' batching. */
async function queryByLocationIds(ids: string[]) {
  if (ids.length === 0) return [] as FirebaseFirestore.QueryDocumentSnapshot[];

  const batches = chunk(ids, 10);
  const snapshots = await Promise.all(
    batches.map((group) =>
      db.collection("classes").where("locationId", "in", group).orderBy("name").get()
    )
  );

  const allDocs = snapshots.flatMap((qs) => qs.docs);
  const seen = new Set<string>();
  const unique: typeof allDocs = [];
  for (const doc of allDocs) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      unique.push(doc);
    }
  }
  return unique;
}

/** Query classes by admin scope. */
async function queryClassesByScope(scope: AdminScope) {
  if (scope.kind === "all") {
    const snap = await db.collection("classes").orderBy("name").get();
    return snap.docs;
  }
  if (scope.kind === "location") {
    const snap = await db
      .collection("classes")
      .where("locationId", "==", scope.id)
      .orderBy("name")
      .get();
    return snap.docs;
  }
  const locIds = await resolveDaycareLocationIds(scope.daycareId);
  return queryByLocationIds(locIds);
}

/** Helper: read class and return its locationId (throws if missing). */
async function getClassLocationId(classId: string): Promise<string> {
  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) throw new NotFoundError("Class not found");
  const cls = classSnap.data() as ClassDocDB;
  const loc = (cls.locationId ?? "").trim();
  if (!loc) throw new BadRequestError("Class has no locationId");
  return loc;
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

  if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null || !locationId) {
    throw new BadRequestError("Missing required fields (name, capacity, volume, ageStart, ageEnd, locationId)");
  }

  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, locationId);
  await assertLocationExists(locationId, scope);

  const payload: ClassDocDB = {
    name,
    locationId,
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
  if (!id) throw new BadRequestError("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError("Class not found");

  const current = doc.data() as ClassDocDB;
  const nextLocationId = input.locationId ?? current.locationId;
  if (!nextLocationId) throw new BadRequestError("Location ID is required");

  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, nextLocationId);

  if (input.locationId && input.locationId !== current.locationId) {
    await assertLocationExists(input.locationId, scope);
  }

  const updatePayload: Partial<ClassDocDB> = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.locationId !== undefined && { locationId: input.locationId }),
    ...(input.capacity !== undefined && { capacity: input.capacity }),
    ...(input.volume !== undefined && { volume: input.volume }),
    ...(input.ageStart !== undefined && { ageStart: input.ageStart }),
    ...(input.ageEnd !== undefined && { ageEnd: input.ageEnd }),
    ...(input.classroom !== undefined && { classroom: input.classroom || undefined }),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.update(updatePayload);
  const updated = await ref.get();
  return classDocToDTO(id, updated.data() as ClassDocDB);
}

/** Delete a class by id (scope checked) and clean users[].classIds. */
export async function deleteClassById(id: string, uid?: string): Promise<void> {
  if (!id) throw new BadRequestError("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new NotFoundError("Class not found");

  const cls = doc.data() as ClassDocDB;

  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, cls.locationId);

  await db.runTransaction(async (tx) => {
    const usersSnap = await db
      .collection("users")
      .where("classIds", "array-contains", id)
      .get();

    usersSnap.forEach((u) => {
      const d = u.data() as { classIds?: string[] };
      const curr = Array.isArray(d.classIds) ? d.classIds : [];
      tx.update(u.ref, { classIds: curr.filter((c) => c !== id) });
    });

    tx.delete(ref);
  });
}

/**
 * List teacher candidates with location guard.
 * - If locationId is provided, enforce it.
 * - Else if classId is provided, derive locationId from the class.
 * - Enforces admin scope against resolved locationId.
 */
// export async function listTeacherCandidates(opts?: {
//   onlyNew?: boolean;
//   locationId?: string;
//   classId?: string;
//   uid?: string;
// }): Promise<(Teacher & { id: string })[]> {
//   const onlyNew = opts?.onlyNew ?? true;

//   // Resolve target location (locationId > classId -> location)
//   let targetLocationId = (opts?.locationId ?? "").trim();
//   if (!targetLocationId && opts?.classId) {
//     targetLocationId = await getClassLocationId(opts.classId);
//   }
//   if (!targetLocationId) throw new BadRequestError("locationId or classId is required");

//   // Scope check
//   const scope = await loadAdminScope(opts?.uid);
//   await ensureLocationAllowed(scope, targetLocationId);

//   // Query teachers by location (+ optional status)
//   let q: FirebaseFirestore.Query = db
//     .collection("users")
//     .where("role", "==", "teacher")
//     .where("locationId", "==", targetLocationId);

//   if (onlyNew) q = q.where("status", "==", "New");

//   const snap = await q.get();
//   return snap.docs.map((d) => {
//     const data = d.data() as Teacher;
//     return {
//       id: d.id,
//       firstName: data.firstName,
//       lastName: data.lastName,
//       email: data.email,
//       role: data.role,
//       status: data.status,
//       classIds: Array.isArray(data.classIds) ? data.classIds : [],
//       locationId: data.locationId ?? undefined,
//     };
//   });
// }

/**
 * Assign teachers to a class (location-safe).
 * - Enforces teacher.locationId === class.locationId.
 * - If teacherIds omitted/empty: auto-pick users with role=teacher & status=New in the same location as class.
 * - On assigning, set users/{id}.status = "Active".
 * - Returns the diff result (assigned/unassigned/ignoredInvalid).
 */
export async function assignTeachersToClass(
  classId: string,
  teacherIds?: string[],
  uid?: string
): Promise<{ assigned: string[]; unassigned: string[]; ignoredInvalid: string[]; classId: string }> {
  if (!classId) throw new BadRequestError("Missing class id");

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) throw new NotFoundError("Class not found");

  const cls = classSnap.data() as ClassDocDB;
  const classLoc = (cls.locationId ?? "").trim();
  if (!classLoc) throw new BadRequestError("Class has no locationId");

  // Scope check based on class location
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, classLoc);

  // Normalize candidateIds
  let candidateIds: string[] =
    Array.isArray(teacherIds) && teacherIds.length
      ? Array.from(new Set(teacherIds.map((s) => s.trim()).filter((s) => s.length > 0)))
      : [];

  // Auto-pick "New" teachers in the same location as the class
  if (candidateIds.length === 0) {
    const elig = await db
      .collection("users")
      .where("role", "==", "teacher")
      .where("status", "==", "New")
      .where("locationId", "==", classLoc)
      .get();
    candidateIds = elig.docs.map((d) => d.id);
  }

  if (candidateIds.length === 0) {
    return { assigned: [], unassigned: [], ignoredInvalid: [], classId };
  }

  // Validate existence, role, and location match
  const userSnaps = await Promise.all(candidateIds.map((id) => db.collection("users").doc(id).get()));

  const validIds: string[] = [];
  const invalid: string[] = [];

  userSnaps.forEach((snap, i) => {
    const id = candidateIds[i];
    if (!snap.exists) {
      invalid.push(id);
      return;
    }
    const data = snap.data() as Teacher | undefined;
    const roleOk = data?.role === "teacher";
    const locOk = (data?.locationId ?? "").trim() === classLoc;
    if (roleOk && locOk) validIds.push(id);
    else invalid.push(id);
  });

  if (validIds.length === 0) {
    return { assigned: [], unassigned: [], ignoredInvalid: invalid, classId };
  }

  // Compute diff with current assignments
  const currentAssignedSnap = await db
    .collection("users")
    .where("role", "==", UserRole.Teacher)
    .where("classIds", "array-contains", classId)
    .get();

  const current = new Set(currentAssignedSnap.docs.map((d) => d.id));
  const selected = new Set(validIds);

  const toAdd = validIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !selected.has(id));

  // Atomic updates
  await db.runTransaction(async (tx) => {
    if (toAdd.length) {
      tx.update(classRef, {
        teacherIds: admin.firestore.FieldValue.arrayUnion(...toAdd),
      });
    }
    if (toRemove.length) {
      tx.update(classRef, {
        teacherIds: admin.firestore.FieldValue.arrayRemove(...toRemove),
      });
    }

    for (const id of toAdd) {
      const uRef = db.collection("users").doc(id);
      const userSnap = await tx.get(uRef); // Read within transaction
      const userData = userSnap.data();
      
      // Check if user is a teacher and initialize classIds if missing
      if (userData?.role === "teacher") {
        const updateData: any = {
          status: "Active",
        };
        
        // Initialize classIds array if it doesn't exist
        if (!userData.classIds || !Array.isArray(userData.classIds)) {
          updateData.classIds = [classId];
        } else {
          updateData.classIds = admin.firestore.FieldValue.arrayUnion(classId);
        }
        
        tx.update(uRef, updateData);
      }
    }

    for (const id of toRemove) {
      const uRef = db.collection("users").doc(id);
      const userSnap = await tx.get(uRef); // Read within transaction
      const userData = userSnap.data();
      
      // Only remove from classIds if the field exists and is an array
      if (userData?.classIds && Array.isArray(userData.classIds)) {
        tx.update(uRef, {
          classIds: admin.firestore.FieldValue.arrayRemove(classId),
        });
      }
      // If classIds doesn't exist or isn't an array, no need to update
    }
  });

  return { assigned: toAdd, unassigned: toRemove, ignoredInvalid: invalid, classId };
}