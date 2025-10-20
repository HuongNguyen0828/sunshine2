// backend/services/web-admin/classService.ts
import { db, admin } from "../../lib/firebase";
import * as Types from "../../../../shared/types/type";
import type { AdminScope } from "../../models/user";
import { tsToISO, resolveDaycareLocationIds, loadAdminScope, ensureLocationAllowed, assertLocationExists} from "../CRUDService"
import { BadRequestError,  NotFoundError} from "../CRUDService";


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


/** Teacher shape (subset of users doc). */
type Teacher = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;     // "teacher"
  status?: string;   // "New" | "Active" | ...
  classIds?: string[];
};



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
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}


/** Query classes by a set of location ids, handling Firestore 'in' batching. */
async function queryByLocationIds(ids: string[]) {
  if (ids.length === 0) {
    return [] as FirebaseFirestore.QueryDocumentSnapshot[];
  }

  // Parallel execution for better performance
  const batches = chunk(ids, 10);
  const snapshots = await Promise.all(
    batches.map(group =>
      db.collection("classes")
        .where("locationId", "in", group)
        .orderBy("name")
        .get()
    )
  );

  const allDocs = snapshots.flatMap(qs => qs.docs);

  // Deduplicate by id (defensive)
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
    // Single location - direct query
    const snap = await db
      .collection("classes")
      .where("locationId", "==", scope.id)
      .orderBy("name")
      .get();
    return snap.docs;
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
  
  // Validate required fields (locationId is REQUIRED)
  if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null || !locationId) {
    throw new BadRequestError("Missing required fields (name, capacity, volume, ageStart, ageEnd, locationId)");
  }

  // Permission check
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, locationId);
  await assertLocationExists(locationId, scope);

  const payload: ClassDocDB = {
    name,
    locationId, // REQUIRED
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

  // locationId is REQUIRED - use current if not provided
  const nextLocationId = input.locationId ?? current.locationId;
  if (!nextLocationId) {
    throw new BadRequestError("Location ID is required");
  }

  // Permission check
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, nextLocationId);

  // If location is being changed, validate new location exists
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

  // Permission check
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, cls.locationId);

  // Use transaction for atomic cleanup
  await db.runTransaction(async (tx) => {
    // Find all users with this class
    const usersSnap = await db
      .collection("users")
      .where("classIds", "array-contains", id)
      .get();

    // Remove class from all users
    usersSnap.forEach((u) => {
      const d = u.data() as { classIds?: string[] };
      const curr = Array.isArray(d.classIds) ? d.classIds : [];
      tx.update(u.ref, { classIds: curr.filter((c) => c !== id) });
    });

    // Delete the class
    tx.delete(ref);
  });
}

/** List teacher candidates (role=teacher, optionally status=New). */
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
  if (!classId) throw new BadRequestError("Missing class id");

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  
  if (!classSnap.exists) throw new NotFoundError("Class not found");

  const cls = classSnap.data() as ClassDocDB;

  // Permission check based on class.locationId
  const scope = await loadAdminScope(uid);
  await ensureLocationAllowed(scope, cls.locationId);

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
  const userSnaps = await Promise.all(
    candidateIds.map((id) => db.collection("users").doc(id).get())
  );
  
  const validIds: string[] = [];
  const invalid: string[] = [];
  
  userSnaps.forEach((snap, i) => {
    const id = candidateIds[i];
    if (!snap.exists) {
      invalid.push(id);
      return;
    }
    const data = snap.data() as { role?: string } | undefined;
    if (data?.role === "teacher") {
      validIds.push(id);
    } else {
      invalid.push(id);
    }
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

  // Transaction for atomic updates
  await db.runTransaction(async (tx) => {
    if (toAdd.length) {
      tx.update(classRef, { 
        teacherIds: admin.firestore.FieldValue.arrayUnion(...toAdd) 
      });
    }
    if (toRemove.length) {
      tx.update(classRef, { 
        teacherIds: admin.firestore.FieldValue.arrayRemove(...toRemove) 
      });
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
      tx.update(uRef, { 
        classIds: admin.firestore.FieldValue.arrayRemove(classId) 
      });
    }
  });

  return { assigned: toAdd, unassigned: toRemove, ignoredInvalid: invalid, classId };
}