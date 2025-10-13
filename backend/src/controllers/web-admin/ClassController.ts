// backend/controllers/web-admin/classController.ts
import { Response } from "express";
import { db, admin } from "../../lib/firebase";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as Types from "../../../../shared/types/type"; 

/**
 * Firestore "classes" document shape for the backend (DB model).
 * This differs from shared DTO because it uses Firestore Timestamp/FieldValue.
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

/** User profile fields we read for scoping. */
type UserProfile = {
  role?: string;
  locationIds?: string[]; // ["*"] means wildcard → treat as "no explicit location restriction" (use daycare if present)
  daycareId?: string;     // used when locationIds missing/empty or ["*"]
};

/** Teacher fields we expose from users collection. */
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
 * Helpers: type guards & small utilities
 * ------------------------------------------ */

/** Detect Firestore Timestamp without using 'any'. */
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

/** DB -> DTO converter (shared Types.Class) */
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

/** Split large arrays into chunks of fixed size (for Firestore 'in' constraints). */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ------------------------------------------
 * Scope helpers
 * ------------------------------------------ */

/** Build admin scope from current user document. */
async function loadAdminScope(req: AuthRequest): Promise<AdminScope> {
  const uid = req.user?.uid;
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

/** Get location IDs under a daycareProvider/{daycareId}/locations subcollection. */
async function resolveDaycareLocationIds(daycareId: string): Promise<string[]> {
  const ref = db.collection(`daycareProvider/${daycareId}/locations`);
  const snap = await ref.get();
  return snap.docs.map((d) => d.id);
}

/** Query classes by scope; batches 'in' queries by 10. */
async function queryClassesByScope(scope: AdminScope) {
  if (scope.kind === "all") {
    const snap = await db.collection("classes").orderBy("name").get();
    return snap.docs;
  }

  let ids: string[] = [];
  if (scope.kind === "locations") {
    ids = scope.ids;
  } else {
    // scope.kind === "daycare"
    ids = await resolveDaycareLocationIds(scope.daycareId);
  }

  if (ids.length === 0) return [];

  const results: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const group of chunk(ids, 10)) {
    const qs = await db
      .collection("classes")
      .where("locationId", "in", group)
      .orderBy("name")
      .get();
    results.push(...qs.docs);
  }

  // Deduplicate by id (defensive)
  const seen = new Set<string>();
  const uniq: typeof results = [];
  for (const d of results) {
    if (!seen.has(d.id)) {
      seen.add(d.id);
      uniq.push(d);
    }
  }
  return uniq;
}

/** Ensure location is allowed by current scope; throw 403 if not. */
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

  // scope.kind === "daycare": verify membership
  const locSnap = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  if (!locSnap.exists) throwForbidden();
}

/* ------------------------------------------
 * Controllers
 * ------------------------------------------ */

/** GET /classes */
export async function getAllClasses(req: AuthRequest, res: Response) {
  try {
    const scope = await loadAdminScope(req);
    const docs = await queryClassesByScope(scope);
    const items: Types.Class[] = docs.map((d) => classDocToDTO(d.id, d.data() as ClassDocDB));
    return res.json(items);
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[getAllClasses] failed:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).send({ message: "Failed to fetch classes" });
  }
}

/** POST /classes */
export async function addClass(req: AuthRequest, res: Response) {
  try {
    const body = req.body as Types.Class; // we accept DTO-like payload (id ignored)
    const { name, capacity, volume, ageStart, ageEnd, locationId, classroom } = body;

    if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null) {
      return res.status(400).send({ message: "Missing fields" });
    }

    // Permission: provided location must be within scope
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, locationId ?? undefined);

    // Validate location exists if provided
    if (locationId) {
      const cg = await db
        .collectionGroup("locations")
        .where(admin.firestore.FieldPath.documentId(), "==", locationId)
        .get();
      if (cg.empty) return res.status(404).send({ message: "Location not found" });
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
    const dto = classDocToDTO(ref.id, snap.data() as ClassDocDB);
    return res.status(201).json(dto);
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[addClass] failed:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });

    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      message: "Failed to add class",
      ...(isDev && { error: err.message, stack: err.stack }),
    });
  }
}

/** PUT /classes/:id */
export async function updateClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) return res.status(400).send({ message: "Missing class id" });

    const input = req.body as Partial<Types.Class>;

    // Load current class to decide final location to validate
    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ message: "Class not found" });

    const current = doc.data() as ClassDocDB | undefined;
    const nextLocationId = input.locationId ?? current?.locationId;

    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, nextLocationId);

    // If locationId is provided, validate existence
    if (input.locationId) {
      const cg = await db
        .collectionGroup("locations")
        .where(admin.firestore.FieldPath.documentId(), "==", input.locationId)
        .get();
      if (cg.empty) return res.status(404).send({ message: "Location not found" });
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
    const dto = classDocToDTO(id, updated.data() as ClassDocDB);
    return res.json(dto);
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[updateClass] failed:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).send({ message: "Failed to update class" });
  }
}

/** DELETE /classes/:id */
export async function deleteClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) return res.status(400).send({ message: "Missing class id" });

    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ message: "Class not found" });

    const cls = doc.data() as ClassDocDB | undefined;

    // Permission: class location must be within admin scope
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, cls?.locationId);

    // Clean up users[].classIds and delete class document
    const usersSnap = await db.collection("users").where("classIds", "array-contains", id).get();

    const batch = db.batch();
    usersSnap.forEach((u) => {
      const d = u.data() as { classIds?: string[] };
      const curr = Array.isArray(d.classIds) ? d.classIds : [];
      batch.update(u.ref, { classIds: curr.filter((c) => c !== id) });
    });
    batch.delete(ref);
    await batch.commit();

    return res.status(204).send();
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[deleteClass] failed:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).send({ message: "Failed to delete class" });
  }
}

/** GET /users/teacher-candidates?onlyNew=true */
export async function getTeacherCandidates(req: AuthRequest, res: Response) {
  try {
    const onlyNew = (req.query.onlyNew ?? "true") === "true";
    let q = db.collection("users").where("role", "==", "teacher");
    if (onlyNew) q = q.where("status", "==", "New");
    const snap = await q.get();
    const items = snap.docs.map((d) => {
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
    return res.json(items);
  } catch (e) {
    console.error("[getTeacherCandidates] failed:", e);
    return res.status(500).json({ message: "Failed to load teacher candidates" });
  }
}

/** GET /api/users/teachers */
export async function getTeachers(req: AuthRequest, res: Response) {
  try {
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;

    let q = db.collection("users").where("role", "==", "teacher");
    if (classId) q = q.where("classIds", "array-contains", classId);

    const snap = await q.get();
    const items = snap.docs.map((d) => {
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

    return res.json(items);
  } catch (e) {
    console.error("[getTeachers] failed:", e);
    return res.status(500).json({ message: "Failed to load teachers" });
  }
}

/** POST /classes/:id/assign-teachers */
export async function assignTeachers(req: AuthRequest, res: Response) {
  try {
    const classId = req.params?.id || req.params?.classId;
    if (!classId) return res.status(400).json({ message: "Missing class id" });

    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ message: "Class not found" });

    const cls = classSnap.data() as ClassDocDB | undefined;

    // Permission: class location must be within scope
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, cls?.locationId);

    // Normalize teacherIds
    const raw: unknown[] = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds : [];
    let candidateIds: string[] = Array.from(
      new Set(
        raw
          .filter((v: unknown): v is string => typeof v === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

    // Auto-pick (role=teacher, status=New) if none provided
    if (candidateIds.length === 0) {
      const elig = await db
        .collection("users")
        .where("role", "==", "teacher")
        .where("status", "==", "New")
        .get();
      candidateIds = elig.docs.map((d) => d.id);
    }
    if (candidateIds.length === 0) {
      return res.status(404).json({ message: "No eligible teachers found" });
    }

    // Validate existence & role
    const checks = await Promise.all(candidateIds.map((id) => db.collection("users").doc(id).get()));
    const validIds: string[] = [];
    const invalid: string[] = [];
    checks.forEach((snap, i) => {
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
      return res.status(400).json({ message: "No valid teachers in selection", invalid });
    }

    // Compute diffs using users[].classIds
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
          status: "Active",
        });
      }

      for (const id of toRemove) {
        const uRef = db.collection("users").doc(id);
        tx.update(uRef, { classIds: admin.firestore.FieldValue.arrayRemove(classId) });
      }
    });

    res.set("Cache-Control", "no-store");
    return res.json({
      ok: true,
      classId,
      assigned: toAdd,
      unassigned: toRemove,
      ignoredInvalid: invalid,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[assignTeachers] failed:", err);

    if (err.status) return res.status(err.status).json({ message: err.message });

    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      message: "Failed to assign teachers",
      ...(isDev && { error: err.message, stack: err.stack }),
    });
  }
}
