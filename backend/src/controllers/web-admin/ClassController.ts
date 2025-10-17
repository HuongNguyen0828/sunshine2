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

/** Minimal user profile (SINGLE-FIELD model). */
type UserProfile = {
  role?: string;
  daycareId?: string;  // single daycare scope
  locationId?: string; // single fixed location (if present, overrides daycare scope)
};

/** Teacher data we expose from users collection. */
type Teacher = {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;   // "teacher"
  status?: string; // "New" | "Active" | ...
  classIds?: string[];
};

/** Admin scope model - UNIFIED: single location only */
type AdminScope =
  | { kind: "all" }
  | { kind: "location"; id: string }      // single fixed location
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
 * Utilities
 * ------------------------------------------ */

function isTimestamp(v: unknown): v is FirebaseFirestore.Timestamp {
  return typeof v === "object" && v !== null && "toDate" in (v as { toDate?: () => Date });
}

/** Convert Timestamp/FieldValue to ISO string (serverTimestamp fallback -> epoch). */
function tsToISO(v: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue): string {
  if (isTimestamp(v)) return v.toDate().toISOString();
  return new Date(0).toISOString();
}

/** DB -> DTO converter. */
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
 * Scope helpers (SINGLE-FIELD: daycareId / locationId)
 * ------------------------------------------ */

/** Load admin scope from current user document. */
async function loadAdminScope(req: AuthRequest): Promise<AdminScope> {
  const uid = req.user?.uid;
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

/** 
 * UNIFIED: Ensure provided location is permitted by scope; throws ForbiddenError if not.
 * locationId is REQUIRED - will throw if empty/undefined.
 */
async function ensureLocationAllowed(scope: AdminScope, locationId: string): Promise<void> {
  // locationId is required - validate it exists and is not empty
  if (!locationId || !locationId.trim()) {
    throw new BadRequestError("Location ID is required");
  }

  // If scope is "all", any location is allowed
  if (scope.kind === "all") return;

  // If scope is fixed to one location, must match exactly
  if (scope.kind === "location") {
    if (scope.id !== locationId) {
      throw new ForbiddenError();
    }
    return;
  }

  // scope.kind === "daycare": verify the location belongs to this daycare
  const locSnap = await db
    .collection(`daycareProvider/${scope.daycareId}/locations`)
    .doc(locationId)
    .get();
  
  if (!locSnap.exists) {
    throw new ForbiddenError();
  }
}

/**
 * UNIFIED: Validate location exists.
 * Uses collectionGroup for "all" scope, direct path for scoped access.
 */
async function assertLocationExists(locationId: string, scope: AdminScope): Promise<void> {
  if (!locationId || !locationId.trim()) {
    throw new NotFoundError("Location not found");
  }

  if (scope.kind === "daycare") {
    // Check within daycare's locations subcollection
    const ref = db
      .collection(`daycareProvider/${scope.daycareId}/locations`)
      .doc(locationId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundError("Location not found");
    }
    return;
  }

  if (scope.kind === "location") {
    // Already validated in ensureLocationAllowed
    return;
  }

  // scope.kind === "all" - use collectionGroup to find anywhere
  const cg = await db
    .collectionGroup("locations")
    .where(admin.firestore.FieldPath.documentId(), "==", locationId)
    .limit(1)
    .get();
  
  if (cg.empty) {
    throw new NotFoundError("Location not found");
  }
}

/**
 * Centralized error handler
 */
function handleError(e: unknown, res: Response): Response {
  const err = e as AppError;
  console.error("[Controller Error]:", err);
  
  const isDev = process.env.NODE_ENV !== "production";
  
  if (err.status) {
    return res.status(err.status).json({ 
      message: err.message,
      ...(isDev && { stack: err.stack })
    });
  }
  
  return res.status(500).json({
    message: "Internal server error",
    ...(isDev && { error: String(err.message || err) }),
  });
}

/* ------------------------------------------
 * Controllers
 * ------------------------------------------ */

/** GET /classes */
export async function getAllClasses(req: AuthRequest, res: Response) {
  try {
    const scope = await loadAdminScope(req);

    let snap: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;

    if (scope.kind === "all") {
      snap = await db.collection("classes").orderBy("name").get();
    } else if (scope.kind === "location") {
      // Filter by single fixed location
      snap = await db
        .collection("classes")
        .where("locationId", "==", scope.id)
        .orderBy("name")
        .get();
    } else {
      // scope.kind === "daycare" -> fetch all daycare locations
      const locsSnap = await db
        .collection(`daycareProvider/${scope.daycareId}/locations`)
        .get();
      const locIds = locsSnap.docs.map((d) => d.id);

      if (locIds.length === 0) {
        return res.json([]);
      }

      // Firestore 'in' supports up to 10 values - batch if needed
      const batches: string[][] = [];
      for (let i = 0; i < locIds.length; i += 10) {
        batches.push(locIds.slice(i, i + 10));
      }

      // Parallel execution for better performance
      const allSnapshots = await Promise.all(
        batches.map(group =>
          db.collection("classes")
            .where("locationId", "in", group)
            .orderBy("name")
            .get()
        )
      );

      const allDocs = allSnapshots.flatMap(qs => qs.docs);

      // Deduplicate by id
      const seen = new Set<string>();
      const uniqueDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      for (const doc of allDocs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          uniqueDocs.push(doc);
        }
      }

      const items: Types.Class[] = uniqueDocs.map((d) => 
        classDocToDTO(d.id, d.data() as ClassDocDB)
      );
      return res.json(items);
    }

    const items: Types.Class[] = snap.docs.map((d) => 
      classDocToDTO(d.id, d.data() as ClassDocDB)
    );
    return res.json(items);
  } catch (e) {
    return handleError(e, res);
  }
}

/** POST /classes */
export async function addClass(req: AuthRequest, res: Response) {
  try {
    const body = req.body as Partial<Types.Class>;
    const { name, capacity, volume, ageStart, ageEnd, locationId, classroom } = body;

    // Validate required fields (locationId is REQUIRED)
    if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null || !locationId) {
      throw new BadRequestError("Missing required fields (name, capacity, volume, ageStart, ageEnd, locationId)");
    }

    // Scope validation
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, locationId);
    await assertLocationExists(locationId, scope);

    const now = admin.firestore.FieldValue.serverTimestamp();

    const payload: ClassDocDB = {
      name,
      locationId, // REQUIRED
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

/** PUT /classes/:id */
export async function updateClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) throw new BadRequestError("Missing class id");

    const input = req.body as Partial<Types.Class>;
    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    
    if (!doc.exists) throw new NotFoundError("Class not found");

    const current = doc.data() as ClassDocDB;

    // locationId is REQUIRED - use current if not provided
    const nextLocationId = input.locationId ?? current.locationId;
    if (!nextLocationId) {
      throw new BadRequestError("Location ID is required");
    }

    // Scope validation
    const scope = await loadAdminScope(req);
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
    const dto = classDocToDTO(id, updated.data() as ClassDocDB);
    return res.json(dto);
  } catch (e) {
    return handleError(e, res);
  }
}

/** DELETE /classes/:id */
export async function deleteClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) throw new BadRequestError("Missing class id");

    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    
    if (!doc.exists) throw new NotFoundError("Class not found");

    const cls = doc.data() as ClassDocDB;

    // Scope check by class location
    const scope = await loadAdminScope(req);
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

    return res.status(204).send();
  } catch (e) {
    return handleError(e, res);
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
    return handleError(e, res);
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
    return handleError(e, res);
  }
}

/** POST /classes/:id/assign-teachers */
export async function assignTeachers(req: AuthRequest, res: Response) {
  try {
    const classId = req.params?.id || req.params?.classId;
    if (!classId) throw new BadRequestError("Missing class id");

    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    
    if (!classSnap.exists) throw new NotFoundError("Class not found");

    const cls = classSnap.data() as ClassDocDB;

    // Scope check by class location
    const scope = await loadAdminScope(req);
    await ensureLocationAllowed(scope, cls.locationId);

    // Normalize teacherIds from body
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
      throw new NotFoundError("No eligible teachers found");
    }

    // Validate existence & role
    const checks = await Promise.all(
      candidateIds.map((id) => db.collection("users").doc(id).get())
    );
    
    const validIds: string[] = [];
    const invalid: string[] = [];
    
    checks.forEach((snap, i) => {
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
      throw new BadRequestError(`No valid teachers in selection. Invalid IDs: ${invalid.join(", ")}`);
    }

    // Get current assignment state
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
          status: "Active",
        });
      }

      for (const id of toRemove) {
        const uRef = db.collection("users").doc(id);
        tx.update(uRef, { 
          classIds: admin.firestore.FieldValue.arrayRemove(classId) 
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