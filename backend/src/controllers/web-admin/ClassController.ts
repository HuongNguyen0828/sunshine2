// backend/controllers/web-admin/classController.ts
import { Response } from "express";
import { db, admin } from "../../lib/firebase";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as Types from "../../../../shared/types/type";

/**
 * Firestore "classes" document shape (server-side DB model).
 * locationId is REQUIRED.
 */
type ClassDocDB = {
  name: string;
  locationId: string;
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom?: string;
  teacherIds: string[];
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};

/** Minimal user profile stored in "users" collection. */
type UserProfile = {
  role?: string;
  daycareId?: string;
  locationId?: string;
  allowedDaycareIds?: string[];
  allowedLocationIds?: string[];
};

/** Teacher model read from "users" collection. */
type Teacher = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;   // "teacher"
  status?: string; // "New" | "Active" | ...
  classIds?: string[];
  locationId?: string; // REQUIRED for location-safe assignment
};

/** Admin scope model. */
type AdminScope =
  | { kind: "all" }
  | { kind: "location"; id: string }
  | { kind: "daycare"; daycareId: string };

/* ------------------------------------------
 * Errors
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
 * Utilities
 * ------------------------------------------ */
function isTimestamp(v: unknown): v is FirebaseFirestore.Timestamp {
  return typeof v === "object" && v !== null && "toDate" in (v as { toDate?: () => Date });
}

function tsToISO(v: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue): string {
  if (isTimestamp(v)) return v.toDate().toISOString();
  return new Date(0).toISOString();
}

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

/* ------------------------------------------
 * Scope helpers
 * ------------------------------------------ */
async function loadAdminScope(req: AuthRequest): Promise<AdminScope> {
  const uid = req.user?.uid;
  if (!uid) return { kind: "all" };

  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return { kind: "all" };

  const u = snap.data() as UserProfile;
  const role = (u.role ?? "").trim().toLowerCase();

  if (role === "adminowner" || role === "superadmin" || role === "owner") {
    return { kind: "all" };
  }

  const daycare = typeof u.daycareId === "string" ? u.daycareId.trim() : "";
  if (daycare) return { kind: "daycare", daycareId: daycare };

  const loc = typeof u.locationId === "string" ? u.locationId.trim() : "";
  if (loc) return { kind: "location", id: loc };

  return { kind: "all" };
}

/** Ensure the given locationId is allowed under admin scope. */
async function ensureLocationAllowed(scope: AdminScope, locationId: string): Promise<void> {
  if (!locationId || !locationId.trim()) {
    throw new BadRequestError("Location ID is required");
  }
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

/** Assert the location exists. */
async function assertLocationExists(locationId: string, scope: AdminScope): Promise<void> {
  if (!locationId || !locationId.trim()) {
    throw new NotFoundError("Location not found");
  }

  if (scope.kind === "daycare") {
    const ref = db.collection(`daycareProvider/${scope.daycareId}/locations`).doc(locationId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundError("Location not found");
    return;
  }

  if (scope.kind === "location") {
    return; // already validated by ensureLocationAllowed
  }

  const cg = await db
    .collectionGroup("locations")
    .where(admin.firestore.FieldPath.documentId(), "==", locationId)
    .limit(1)
    .get();
  if (cg.empty) throw new NotFoundError("Location not found");
}

/** Centralized error handler. */
function handleError(e: unknown, res: Response): Response {
  const err = e as AppError;
  // eslint-disable-next-line no-console
  console.error("[Controller Error]:", err);
  const isDev = process.env.NODE_ENV !== "production";
  if (err.status) {
    return res.status(err.status).json({
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
  }
  return res.status(500).json({
    message: "Internal server error",
    ...(isDev && { error: String((err as any)?.message || err) }),
  });
}

/* ------------------------------------------
 * Controllers
 * ------------------------------------------ */
export async function getAllClasses(req: AuthRequest, res: Response) {
  try {
    const scope = await loadAdminScope(req);

    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;

    if (scope.kind === "all") {
      snap = await db.collection("classes").orderBy("name").get();
    } else if (scope.kind === "location") {
      snap = await db
        .collection("classes")
        .where("locationId", "==", scope.id)
        .orderBy("name")
        .get();
    } else {
      const locsSnap = await db.collection(`daycareProvider/${scope.daycareId}/locations`).get();
      const locIds = locsSnap.docs.map((d) => d.id);
      if (locIds.length === 0) return res.json([]);

      const batches: string[][] = [];
      for (let i = 0; i < locIds.length; i += 10) batches.push(locIds.slice(i, i + 10));

      const allSnapshots = await Promise.all(
        batches.map((group) =>
          db.collection("classes").where("locationId", "in", group).orderBy("name").get()
        )
      );

      const allDocs = allSnapshots.flatMap((qs) => qs.docs);
      const seen = new Set<string>();
      const uniqueDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      for (const doc of allDocs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          uniqueDocs.push(doc);
        }
      }

      const items: Types.Class[] = uniqueDocs.map((d) => classDocToDTO(d.id, d.data() as ClassDocDB));
      return res.json(items);
    }

    const items: Types.Class[] = snap.docs.map((d) => classDocToDTO(d.id, d.data() as ClassDocDB));
    return res.json(items);
  } catch (e) {
    return handleError(e, res);
  }
}

export async function addClass(req: AuthRequest, res: Response) {
  try {
    const body = req.body as Partial<Types.Class>;
    const { name, capacity, volume, ageStart, ageEnd, locationId, classroom } = body;

    if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null || !locationId) {
      throw new BadRequestError("Missing required fields (name, capacity, volume, ageStart, ageEnd, locationId)");
    }

    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, locationId);
    await assertLocationExists(locationId, scope);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload: ClassDocDB = {
      name,
      locationId,
      capacity,
      volume,
      ageStart,
      ageEnd,
      classroom,
      teacherIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection("classes").add(payload);
    const snap = await ref.get();
    const dto = classDocToDTO(ref.id, snap.data() as ClassDocDB);
    return res.status(201).json(dto);
  } catch (e) {
    return handleError(e, res);
  }
}

export async function updateClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) throw new BadRequestError("Missing class id");

    const input = req.body as Partial<Types.Class>;
    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundError("Class not found");

    const current = doc.data() as ClassDocDB;
    const nextLocationId = input.locationId ?? current.locationId;
    if (!nextLocationId) throw new BadRequestError("Location ID is required");

    const scope = await loadAdminScope(req);
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
    const dto = classDocToDTO(id, updated.data() as ClassDocDB);
    return res.json(dto);
  } catch (e) {
    return handleError(e, res);
  }
}

export async function deleteClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) throw new BadRequestError("Missing class id");

    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundError("Class not found");

    const cls = doc.data() as ClassDocDB;
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, cls.locationId);

    await db.runTransaction(async (tx) => {
      const usersSnap = await db.collection("users").where("classIds", "array-contains", id).get();

      usersSnap.forEach((u) => {
        const d = u.data() as { classIds?: string[] };
        const curr = Array.isArray(d.classIds) ? d.classIds : [];
        tx.update(u.ref, { classIds: curr.filter((c) => c !== id) });
      });

      tx.delete(ref);
    });

    return res.status(204).send();
  } catch (e) {
    return handleError(e, res);
  }
}

/**
 * GET /users/teacher-candidates?onlyNew=true&locationId=LOCID or &classId=CLASSID
 * Enforces location filter and admin scope.
 */
export async function getTeacherCandidates(req: AuthRequest, res: Response) {
  try {
    const onlyNew = (req.query.onlyNew ?? "true") === "true";
    const qLoc = typeof req.query.locationId === "string" ? req.query.locationId.trim() : "";
    const qClass = typeof req.query.classId === "string" ? req.query.classId.trim() : "";

    let targetLocationId = qLoc;
    if (!targetLocationId && qClass) {
      const classSnap = await db.collection("classes").doc(qClass).get();
      if (!classSnap.exists) throw new NotFoundError("Class not found");
      const cls = classSnap.data() as ClassDocDB;
      targetLocationId = cls.locationId;
    }
    if (!targetLocationId) throw new BadRequestError("locationId or classId is required");

    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, targetLocationId);

    let q: FirebaseFirestore.Query = db
      .collection("users")
      .where("role", "==", "teacher")
      .where("locationId", "==", targetLocationId);

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
        locationId: data.locationId ?? null,
      };
    });

    return res.json(items);
  } catch (e) {
    return handleError(e, res);
  }
}

/**
 * GET /api/users/teachers?locationId=LOCID&classId=CLASSID
 * Optionally filters by classId and/or locationId with scope enforcement.
 */
export async function getTeachers(req: AuthRequest, res: Response) {
  try {
    const qClass = typeof req.query.classId === "string" ? req.query.classId.trim() : "";
    const qLoc = typeof req.query.locationId === "string" ? req.query.locationId.trim() : "";

    let targetLocationId = qLoc;
    if (!targetLocationId && qClass) {
      const classSnap = await db.collection("classes").doc(qClass).get();
      if (!classSnap.exists) throw new NotFoundError("Class not found");
      const cls = classSnap.data() as ClassDocDB;
      targetLocationId = cls.locationId;
    }

    let q: FirebaseFirestore.Query = db.collection("users").where("role", "==", "teacher");

    if (qClass) q = q.where("classIds", "array-contains", qClass);
    if (targetLocationId) {
      const scope = await loadAdminScope(req);
      await ensureLocationAllowed(scope, targetLocationId);
      q = q.where("locationId", "==", targetLocationId);
    }

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
        locationId: data.locationId ?? null,
      };
    });

    return res.json(items);
  } catch (e) {
    return handleError(e, res);
  }
}

/**
 * POST /classes/:id/assign-teachers
 * Enforces: teacher.locationId must equal class.locationId.
 */
export async function assignTeachers(req: AuthRequest, res: Response) {
  try {
    const classId = (req.params as { id?: string; classId?: string }).id || (req.params as any)?.classId;
    if (!classId) throw new BadRequestError("Missing class id");

    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) throw new NotFoundError("Class not found");

    const cls = classSnap.data() as ClassDocDB;

    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, cls.locationId);

    const raw: unknown[] = Array.isArray((req.body as any)?.teacherIds) ? (req.body as any).teacherIds : [];
    let candidateIds: string[] = Array.from(
      new Set(
        raw
          .filter((v: unknown): v is string => typeof v === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

    if (candidateIds.length === 0) {
      const elig = await db
        .collection("users")
        .where("role", "==", "teacher")
        .where("status", "==", "New")
        .where("locationId", "==", cls.locationId)
        .get();
      candidateIds = elig.docs.map((d) => d.id);
    }
    if (candidateIds.length === 0) throw new NotFoundError("No eligible teachers found");

    const checks = await Promise.all(candidateIds.map((id) => db.collection("users").doc(id).get()));
    const validIds: string[] = [];
    const invalid: string[] = [];

    checks.forEach((snap, i) => {
      const id = candidateIds[i];
      if (!snap.exists) {
        invalid.push(id);
        return;
      }
      const data = snap.data() as Teacher | undefined;
      if (data?.role === "teacher") validIds.push(id);
      else invalid.push(id);
    });

    if (validIds.length === 0) {
      throw new BadRequestError(`No valid teachers in selection. Invalid IDs: ${invalid.join(", ")}`);
    }

    const teacherDocs = await Promise.all(validIds.map((id) => db.collection("users").doc(id).get()));
    const wrongLocationIds: string[] = [];
    teacherDocs.forEach((snap, i) => {
      const t = snap.data() as Teacher | undefined;
      const loc = (t?.locationId ?? "").trim();
      if (!loc || loc !== cls.locationId) wrongLocationIds.push(validIds[i]);
    });
    if (wrongLocationIds.length > 0) {
      throw new BadRequestError(
        `Teachers must belong to the same location as the class. class.locationId=${cls.locationId}, mismatched teacherIds=${wrongLocationIds.join(", ")}`
      );
    }

    const currentAssignedSnap = await db.collection("users").where("classIds", "array-contains", classId).get();

    const current = new Set(currentAssignedSnap.docs.map((d) => d.id));
    const selected = new Set(validIds);

    const toAdd = validIds.filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !selected.has(id));

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
        tx.update(uRef, {
          classIds: admin.firestore.FieldValue.arrayUnion(classId),
          status: "Active",
        });
      }

      for (const id of toRemove) {
        const uRef = db.collection("users").doc(id);
        tx.update(uRef, {
          classIds: admin.firestore.FieldValue.arrayRemove(classId),
        });
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
    return handleError(e, res);
  }
}
