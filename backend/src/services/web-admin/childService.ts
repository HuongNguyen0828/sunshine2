// backend/services/web-admin/childService.ts
import { db, admin } from "../../lib/firebase";
import * as Types from "../../../../shared/types/type";
import {
  daycareLocationIds,
  checkingIfEmailIsUnique,
  updateEmailFirebaseAuth,
  deleteUserFirebaseAuth,
} from "../authService";


type ChildDocDB = {
  firstName: string;
  lastName: string;
  gender: string; // Added gender
  birthDate: string;
  parentId: string[];
  classId?: string;
  locationId?: string;
  enrollmentStatus: Types.EnrollmentStatus;
  startDate: string;
  notes?: string;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};

/// This matching NewChildInput type inside web-admin
type AddChildPayload = {
  firstName: string;
  lastName: string; // YYYY-MM-DD
  gender: string;
  status: string;
  birthDate: string;
  parentId: string[];
  classId?: string;
  locationId: string;
  notes?: string;
  enrollmentStatus: Types.EnrollmentStatus;
  startDate: string,
};

// This matching NewParentInput from web-admin
// Update the ParentDocDB type in childService.ts
type ParentChildRelationship = {
  childId: string;
  relationship: string; // e.g., "mother", "father", "guardian", "grandparent", etc.
};

type AddParentPayload = {
  firstName: string;
  lastName: string;
  email: string;           // username for login
  phone: string;
  newChildRelationship: string; // Changed from childIds  address1: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  postalcode?: string;
  maritalStatus: string;
  locationId?: string;

}

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
  firstName?: string;
  lastName?: string;
  status?: Types.EnrollmentStatus;
  childIds?: string[];
};

type ParentDocDB = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: Types.EnrollmentStatus;
  childRelationships: ParentChildRelationship[]; // Changed from childIds
  childIds: string[];
  daycareId?: string;
  locationId?: string;
  createdAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
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


/**
 * Child Status Logic:
 * - Withdraw: Manually set by admin, effective when withdrawDate <= today
 * - Active: Has class assigned AND startDate <= today AND not withdrawn
 * - New: Has class assigned BUT startDate > today (not started yet)
 * - Waitlist: No class assigned, manually selected by admin
 * 
 * Status precedence: Withdraw > Active > New > Waitlist
 */
function computeStatus(
  providedStatus?: Types.EnrollmentStatus, // Current status in DB
  classId?: string,
  startDate?: string,    // Class start date
  withdrawDate?: string, // Optional withdraw date
): Types.EnrollmentStatus {

  // Today
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 1. Check for Withdraw status first (highest priority)
  if (providedStatus === Types.EnrollmentStatus.Withdraw && withdrawDate) {
    if (today >= withdrawDate) {
      return Types.EnrollmentStatus.Withdraw; // Withdrawal is effective
    }
    // If withdraw date is in future, fall through to other status checks
  }

  // 2. Check if child has a class assigned
  const hasClass = Boolean(classId);
  
  if (hasClass) {
    // 3. Check if class has started
    if (startDate && today >= startDate) {
      return Types.EnrollmentStatus.Active;
    } else {
      return Types.EnrollmentStatus.New; // Has class but not started yet
    }
  }

  // 4. No class assigned
  if (providedStatus === Types.EnrollmentStatus.Waitlist) {
    return Types.EnrollmentStatus.Waitlist;
  }

  // 5. Default fallback - should not normally reach here
  return Types.EnrollmentStatus.New;
}


function toDTO(id: string, d: ChildDocDB): Types.Child {
  return {
    id,
    firstName: d.firstName,
    lastName: d.lastName,
    gender: d.gender,
    birthDate: d.birthDate,
    parentId: Array.isArray(d.parentId) ? d.parentId : [],
    classId: d.classId,
    locationId: d.locationId,
    enrollmentStatus: d.enrollmentStatus,
    startDate: d.startDate,
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

/**
 * 
 * @param uid 
 * @param filters 
 * @returns 
 */
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

/**
 * Fetch all chidren of that daycareId and locationId with 2 cases of locations:(1) locationId=child.locationId and (2) locationId="*";
 * @param daycareId: from admin scope
 * @param locationId: from admin scope 
 * @returns 
 */
export const getAllChildren = async (
  daycareId: string,
  locationId: string
): Promise<Types.Child[]> => {
  // Case when locationId = '*', use daycareId to take all locations Id of that daycare
  if (locationId === "*") {
    // Get all locations of that daycare
    const locationIds = await daycareLocationIds(daycareId);
    // If return empty location
    if (locationIds.length === 0) {
      console.log("No locations found for this provider");
      return [];
    }

    // Else,
    // Firestore 'in' operator can only take up to 30 values
    const chunks = [];
    while (locationIds.length) {
      chunks.push(locationIds.splice(0, 30));
    }

    const children: Types.Child[] = [];

    for (const idsChunk of chunks) {
      const snapshot = await db
        .collection("children")
        .where("locationId", "in", idsChunk) // match location
        .get();

      snapshot.forEach((doc) => {
        children.push({ id: doc.id, ...(doc.data() as any) } as Types.Child);
      });
    };

    return children;
  }

  // else, case when locationId is exactly match
  const snap = await db.collection("children")
    .where("locationId", "==", locationId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Types.Child));
}

/**
 * 
 * @param child Create child, then parent 1 and optional parent2 with linking bi-directial parent and child (using parent doc id)
 * @param locationId 
 * @param parent1 
 * @param parent2 
 * @returns 
 */
export async function addChildWithParents(
  locationId: string,
  child: AddChildPayload,
  parent1: AddParentPayload, 
  parent2?: AddParentPayload
): Promise<{ child: Types.Child; parent1: Types.Parent; parent2?: Types.Parent }> {
  
  return await db.runTransaction(async (transaction) => {
    // 1. Create Child Document
    const childRef = db.collection("children").doc();
    const childId = childRef.id;
    
    const childPayload: ChildDocDB = {
      firstName: child.firstName.trim(),
      lastName: child.lastName.trim(),
      gender: child.gender,
      birthDate: child.birthDate,
      parentId: [], // Will be populated below
      classId: undefined,
      locationId: child.locationId, // By input location
      enrollmentStatus: child.enrollmentStatus,
      startDate: child.startDate,
      notes: child.notes?.trim() || undefined,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    transaction.set(childRef, childPayload);

    // 2. Create Parents and Build Relationships
    const parentIds: string[] = [];
    const parents: { parent1: Types.Parent; parent2?: Types.Parent } = { parent1: {} as Types.Parent };

    // Parent 1
    const isUniqueEmail = await checkingIfEmailIsUnique(parent1.email);
    if (!isUniqueEmail) {
      throw new Error("Email already exists");
    }
    const parent1Ref = db.collection("users").doc();
    const parent1Id = parent1Ref.id;
    parentIds.push(parent1Id);
    
    const parent1Relationship: ParentChildRelationship = {
      childId,
      relationship: parent1.newChildRelationship
    };
    
    const parent1Payload = {
      ...parent1,
      docId: parent1Id, // Id fixed for matching child
      id: parent1Id, // Id flexible for matching uid from Firebase Auth
      locationId: child.locationId, // Location of parent could be multipule!!!!!!!!!!!!
      role: "parent" as const,
      isRegistered: false,
      childRelationships: [parent1Relationship],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    transaction.set(parent1Ref, parent1Payload);
    parents.parent1 = { ...parent1Payload, id: parent1Id } as Types.Parent;

    // Parent 2 (if provided)
    if (parent2) {
      const isUniqueEmail = await checkingIfEmailIsUnique(parent2.email);
      if (!isUniqueEmail) {
        throw new Error("Email already exists");
      }

      const parent2Ref = db.collection("users").doc();
      const parent2Id = parent2Ref.id;
      parentIds.push(parent2Id);
      
      const parent2Relationship: ParentChildRelationship = {
        childId,
        relationship: parent2.newChildRelationship
      };
      
      const parent2Payload = {
        ...parent2,
        docId: parent2Id,
        id: parent2Id,
        locationId: child.locationId, // Location of parent could be multipule!!!!!!!!!!!!
        role: "parent" as const,
        isRegistered: false,
        childRelationships: [parent2Relationship],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      transaction.set(parent2Ref, parent2Payload);
      parents.parent2 = { ...parent2Payload, id: parent2Id } as Types.Parent;
    }

    // 3. Update Child with All Parent IDs
    transaction.update(childRef, {
      parentId: parentIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. Return Results
    const childResult: Types.Child = {
      id: childId,
      ...childPayload,
      parentId: parentIds,
      createdAt: new Date().toISOString(), // Approximate for return
      updatedAt: new Date().toISOString(),
    };

    return {
      child: childResult,
      ...parents
    };
  });
}



export async function updateChildById(
  id: string,
  patch: Partial<
    Pick<
      Types.Child,
      "firstName" | "lastName" | "birthDate" | "locationId" | "notes" | "parentId" | "enrollmentStatus" | "startDate"
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

  const upd: Partial<ChildDocDB> = {
    firstName: patch.firstName ?? curr.firstName,
    lastName: patch.lastName ?? curr.lastName,
    birthDate: patch.birthDate ?? curr.birthDate,
    locationId: patch.locationId ?? curr.locationId,
    notes: patch.notes ?? curr.notes,
    parentId: nextParentIds,
    enrollmentStatus: patch.enrollmentStatus,
    startDate: patch.startDate,
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

  await ref.update({
    parentId: nextParents,
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


// This call after Parent and Child are created and linked. Now, we remove the link
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

  await ref.update({
    parentId: nextParents,
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
      throw errorWithStatus("Class is full", 409);
    }

    const nextStatus = computeStatus(child.enrollmentStatus, classId, child.startDate);

    tx.update(classRef, { volume: vol + 1 });
    tx.update(childRef, {
      classId,
      locationId: cls.locationId ?? child.locationId,
      enrollmentStatus: nextStatus,
      // enrollmentDate:
      //   nextStatus === Types.EnrollmentStatus.New
      //     ? child.enrollmentDate
      //     : child.enrollmentDate ?? new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const saved = await childRef.get();
  return toDTO(saved.id, saved.data() as ChildDocDB);
}

// export async function unassignChild(childId: string, uid?: string): Promise<Types.Child> {
//   if (!childId) throw errorWithStatus("Missing childId", 400);
//   const ref = db.collection("children").doc(childId);

//   await db.runTransaction(async (tx) => {
//     const ch = await tx.get(ref);
//     if (!ch.exists) throw errorWithStatus("Child not found", 404);
//     const c = ch.data() as ChildDocDB;

//     if (c.classId) {
//       const classRef = db.collection("classes").doc(c.classId);
//       const clsSnap = await tx.get(classRef);
//       const cls = clsSnap.exists ? (clsSnap.data() as ClassDocDB) : undefined;

//       const scope = await loadAdminScope(uid);
//       await ensureLocationAllowed(scope, cls?.locationId);

//       if (clsSnap.exists) {
//         tx.update(classRef, { volume: Math.max(0, (cls!.volume ?? 0) - 1) });
//       }
//     }

//     const nextStatus = computeStatus(c.parentId, undefined);

//     tx.update(ref, {
//       classId: admin.firestore.FieldValue.delete(),
//       enrollmentStatus: nextStatus,
//       enrollmentDate:
//         nextStatus === Types.EnrollmentStatus.New
//           ? c.enrollmentDate
//           : c.enrollmentDate ?? new Date().toISOString(),
//       updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//     });
//   });

//   const saved = await ref.get();
//   return toDTO(saved.id, saved.data() as ChildDocDB);
// }

export async function withdrawChild(childId: string, withdrawDate: string): Promise<Types.Child> {
  const ref = db.collection("children").doc(childId);

  const ch = await ref.get();
  if (!ch.exists) throw errorWithStatus("Child not found", 404);
  const childData = ch.data() as ChildDocDB;

  const newStatus = computeStatus(Types.EnrollmentStatus.Withdraw, undefined, childData.startDate, withdrawDate )
  return {id: childId, ...childData, enrollmentStatus: newStatus} as Types.Child;
}

export async function reEnrollChild(
  childId: string,
  classId: string,
  uid?: string
): Promise<Types.Child> {
  return assignChildToClass(childId, classId, uid);
}

// Additional helper functions from frontend conversion
export async function fetchParentsLiteByIds(ids: string[]): Promise<Array<{ id: string; firstName?: string; lastName?: string; email?: string }>> {
  const uniq = Array.from(new Set(ids.filter(Boolean)));
  if (uniq.length === 0) return [];

  const out: Array<{ id: string; firstName?: string; lastName?: string; email?: string }> = [];
  for (const group of chunk(uniq, 10)) {
    const q = db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", group)
      .where("role", "==", "parent");
    
    const snap = await q.get();
    snap.forEach((d) => {
      const data = d.data() as UserProfile;
      out.push({
        id: d.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      });
    });
  }
  return out;
}