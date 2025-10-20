import { db, admin } from "../lib/firebase";
import type { UserProfile, AdminScope } from "../models/user";


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

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(400, message);
  }
}


/* ------------------------------------------
 * Helpers: type guards, mappers, utilities
 * ------------------------------------------ */

/** Detect Firestore Timestamp. */
export function isTimestamp(v: unknown): v is FirebaseFirestore.Timestamp {
  return typeof v === "object" && v !== null && "toDate" in (v as { toDate?: () => Date });
}

/** Convert Timestamp/FieldValue to ISO string. */
export function tsToISO(
  v: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue
): string {
  if (isTimestamp(v)) {
    return v.toDate().toISOString();
  }
  return new Date(0).toISOString();
}


/* ------------------------------------------
 * Scope helpers
 * ------------------------------------------ */

/** Build admin scope based on users/{uid}. */
export async function loadAdminScope(uid?: string): Promise<AdminScope> {
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
export async function resolveDaycareLocationIds(daycareId: string): Promise<string[]> {
  const ref = db.collection(`daycareProvider/${daycareId}/locations`);
  const snap = await ref.get();
  return snap.docs.map((d) => d.id);
}

/**
 * UNIFIED: Ensure a specific location is allowed by admin scope.
 * locationId is REQUIRED.
 */
export async function ensureLocationAllowed(scope: AdminScope, locationId: string): Promise<void> {
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

  // scope.kind === "daycare": verify that this location belongs to daycare
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
export async function assertLocationExists(locationId: string, scope: AdminScope): Promise<void> {
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