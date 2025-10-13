// backend/controllers/web-admin/classController.ts
import { Response } from "express";
import { db, admin } from "../../lib/firebase";
import { AuthRequest } from "../../middleware/authMiddleware";

// ----- Firestore document shapes -----
type ClassDoc = {
  name: string;
  locationId?: string;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom?: string;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
};

type UserProfile = {
  role?: string;
  locationIds?: string[]; // ["*"] means wildcard (treat as "no explicit location restriction")
  daycareId?: string;     // used only if locationIds is ["*"] or empty/undefined
};

type Teacher = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;     // "teacher"
  status?: string;   // "New" | "Active" ...
  classIds?: string[];
};
// ----- Admin scope model -----
// Rule you asked for:
// - If admin.locationIds exists with one or more concrete ids (not just ["*"]),
//   scope is those locations only.
// - Else (locationIds missing/empty or ["*"]): if admin.daycareId exists,
//   scope is all locations under that daycareProvider.
// - Else: scope = all (no restriction).
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

// Load current admin scope from users/{uid} following the rule above
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

  // Case 1: concrete location ids provided → restrict to those
  if (concreteLocs.length > 0) {
    return { kind: "locations", ids: concreteLocs };
  }

  // Case 2: wildcard or no locationIds → use daycareId if present
  if (hasWildcard || concreteLocs.length === 0) {
    if (u.daycareId && u.daycareId.trim().length > 0) {
      return { kind: "daycare", daycareId: u.daycareId.trim() };
    }
  }

  // Case 3: fallback to all
  return { kind: "all" };
}

// Resolve locationIds for a daycare by reading its locations subcollection
async function resolveDaycareLocationIds(daycareId: string): Promise<string[]> {
  const ref = db.collection(`daycareProvider/${daycareId}/locations`);
  const snap = await ref.get();
  return snap.docs.map((d) => d.id);
}

// Query classes by scope; handles Firestore "in" limit (10) by batching
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

  if (ids.length === 0) return []; // no locations → no classes

  const results: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const group of chunk(ids, 10)) {
    const qs = await db
      .collection("classes")
      .where("locationId", "in", group)
      .orderBy("name")
      .get();
    results.push(...qs.docs);
  }
  // Uniq by id (defensive)
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

// Ensure a specific locationId is allowed by the scope (throws 403 if not)
async function ensureLocationAllowed(scope: AdminScope, locationId?: string): Promise<void> {
  const throwForbidden = (): never => {
    const err = new Error("Forbidden: location is not within admin scope") as Error & { status?: number };
    err.status = 403;
    throw err;
  };

  if (!locationId) {
    // class without locationId is considered not allowed when scope is restricted
    if (scope.kind !== "all") throwForbidden();
    return;
  }

  if (scope.kind === "all") return;

  if (scope.kind === "locations") {
    if (!scope.ids.includes(locationId)) throwForbidden();
    return;
  }

  // scope.kind === "daycare": verify that this locationId belongs to that daycare
  const locSnap = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  if (!locSnap.exists) throwForbidden();
}

// ----- Controllers -----
// GET /classes
export async function getAllClasses(req: AuthRequest, res: Response) {
  try {
    const scope = await loadAdminScope(req);
    const docs = await queryClassesByScope(scope);
    const items = docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClassDoc, "createdAt" | "updatedAt">),
    }));
    return res.json(items);
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[getAllClasses] failed:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).send({ message: "Failed to fetch classes" });
  }
}

// POST /classes
export async function addClass(req: AuthRequest, res: Response) {
  try {
    const body = req.body as ClassDoc;
    const { name, capacity, volume, ageStart, ageEnd, locationId, classroom } = body;

    if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null) {
      return res.status(400).send({ message: "Missing fields" });
    }

    // Permission: check admin scope against provided locationId
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, locationId);

    // Validate that location exists if provided
    if (locationId) {
      const cg = await db
        .collectionGroup("locations")
        .where(admin.firestore.FieldPath.documentId(), "==", locationId)
        .get();
      if (cg.empty) return res.status(404).send({ message: "Location not found" });
    }

    const payload: ClassDoc = {
      name,
      locationId: locationId || undefined,
      capacity,
      volume,
      ageStart,
      ageEnd,
      classroom,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("classes").add(payload);
    const snap = await ref.get();
    return res.status(201).json({ id: ref.id, ...(snap.data() as object) });
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

// PUT /classes/:id
export async function updateClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) return res.status(400).send({ message: "Missing class id" });

    const input = req.body as Partial<ClassDoc>;

    // Load current class to determine final locationId to validate
    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ message: "Class not found" });

    const current = doc.data() as ClassDoc | undefined;
    const nextLocationId = input.locationId ?? current?.locationId;

    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, nextLocationId);

    // If locationId provided, validate existence
    if (input.locationId) {
      const cg = await db
        .collectionGroup("locations")
        .where(admin.firestore.FieldPath.documentId(), "==", input.locationId)
        .get();
      if (cg.empty) return res.status(404).send({ message: "Location not found" });
    }

    await ref.update({
      ...input,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();
    return res.json({ id, ...(updated.data() as object) });
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[updateClass] failed:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).send({ message: "Failed to update class" });
  }
}

// DELETE /classes/:id
export async function deleteClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) return res.status(400).send({ message: "Missing class id" });

    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ message: "Class not found" });

    const cls = doc.data() as ClassDoc | undefined;

    // Permission: class location must be within scope
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, cls?.locationId);

    // Remove this classId from users[].classIds, then delete class
    const usersSnap = await db.collection("users").where("classIds", "array-contains", id).get();

    const batch = db.batch();
    usersSnap.forEach((u) => {
      const curr = (u.data().classIds as string[]) || [];
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

// GET /users/teacher-candidates?onlyNew=true
export async function getTeacherCandidates(req: AuthRequest, res: Response) {
  try {
    const onlyNew = (req.query.onlyNew ?? "true") === "true";
    let q = db.collection("users").where("role", "==", "teacher");
    if (onlyNew) q = q.where("status", "==", "New");
    const snap = await q.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }));
    return res.json(items);
  } catch (e) {
    console.error("[getTeacherCandidates] failed:", e);
    return res.status(500).json({ message: "Failed to load teacher candidates" });
  }
}
// GET /api/users/teachers
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
// POST /classes/:id/assign-teachers
export async function assignTeachers(req: AuthRequest, res: Response) {
  try {
    const classId = req.params?.id || req.params?.classId;
    if (!classId) return res.status(400).json({ message: "Missing class id" });

    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ message: "Class not found" });

    const cls = classSnap.data() as ClassDoc | undefined;

    // Permission: class location must be within admin scope
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

    // Compute diffs
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
