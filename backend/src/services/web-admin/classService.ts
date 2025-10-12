import { db, admin } from "../../lib/firebase";

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

export async function listClasses() {
  const snap = await db.collection("classes").orderBy("name").get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ClassDoc, "createdAt" | "updatedAt">),
  }));
}

export async function createClass(input: ClassDoc) {
  const { name, capacity, volume, ageStart, ageEnd, locationId } = input;
  if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null) {
    throw new Error("Missing fields");
  }
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
  return { id: ref.id, ...(snap.data() as object) };
}

export async function updateClassById(id: string, input: Partial<ClassDoc>) {
  if (!id) throw new Error("Missing class id");

  if (input.locationId) {
    const cg = await db
      .collectionGroup("locations")
      .where(admin.firestore.FieldPath.documentId(), "==", input.locationId)
      .get();
    if (cg.empty) throw new Error("Location not found");
  }

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Class not found");

  await ref.update({
    ...input,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  return { id, ...(updated.data() as object) };
}

export async function deleteClassById(id: string) {
  if (!id) throw new Error("Missing class id");

  const ref = db.collection("classes").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Class not found");

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

// Optional utility to fetch teacher candidates within service (if controllers prefer delegating)
export async function listTeacherCandidates(onlyNew = true) {
  let q = db.collection("users").where("role", "==", "teacher");
  if (onlyNew) q = q.where("status", "==", "New");
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }));
}

export async function assignTeachersToClass(classId: string, teacherIds?: string[]) {
  if (!classId) throw new Error("Missing class id");

  const classRef = db.collection("classes").doc(classId);
  const classSnap = await classRef.get();
  if (!classSnap.exists) throw new Error("Class not found");

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

  const currentAssignedSnap = await db
    .collection("users")
    .where("classIds", "array-contains", classId)
    .get();
  const current = new Set(currentAssignedSnap.docs.map((d) => d.id));
  const selected = new Set(validIds);

  const toAdd = validIds.filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !selected.has(id));

  await db.runTransaction(async (tx) => {
    if (toAdd.length) {
      tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayUnion(...toAdd) });
    }
    if (toRemove.length) {
      tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayRemove(...toRemove) });
    }

    for (const id of toAdd) {
      const uRef = db.collection("users").doc(id);
      const uSnap = await tx.get(uRef);
      if (!uSnap.exists) continue;

      tx.update(uRef, { classIds: admin.firestore.FieldValue.arrayUnion(classId) });

      const u = uSnap.data() as { status?: string } | undefined;
      if (u?.status === "New") {
        tx.update(uRef, { status: "Active" });
      }
    }

    for (const id of toRemove) {
      const uRef = db.collection("users").doc(id);
      tx.update(uRef, { classIds: admin.firestore.FieldValue.arrayRemove(classId) });
    }
  });

  return { assigned: toAdd, unassigned: toRemove, ignoredInvalid: invalid, classId };
}
