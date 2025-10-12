import { Response } from "express";
import { db, admin } from "../../lib/firebase";
import { AuthRequest } from "../../middleware/authMiddleware";

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

// GET /classes
export async function getAllClasses(req: AuthRequest, res: Response) {
  try {
    const snap = await db.collection("classes").orderBy("name").get();
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClassDoc, "createdAt" | "updatedAt">),
    }));
    return res.json(items);
  } catch (e) {
    console.error(e);
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
    const err = e as Error;
    console.error("[addClass] failed:", err);
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

    if (input.locationId) {
      const cg = await db
        .collectionGroup("locations")
        .where(admin.firestore.FieldPath.documentId(), "==", input.locationId)
        .get();
      if (cg.empty) return res.status(404).send({ message: "Location not found" });
    }

    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ message: "Class not found" });

    await ref.update({
      ...input,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();
    return res.json({ id, ...(updated.data() as object) });
  } catch (e) {
    console.error(e);
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
    console.error(e);
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
    console.error(e);
    return res.status(500).json({ message: "Failed to load teacher candidates" });
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

    const teacherIdsRaw: unknown[] = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds : [];
    let candidateIds: string[] = Array.from(
      new Set(
        teacherIdsRaw
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
        .get();
      candidateIds = elig.docs.map((d) => d.id);
    }
    if (candidateIds.length === 0) return res.status(404).json({ message: "No eligible teachers found" });

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
      return res.status(400).json({ message: "No valid teachers in selection", invalid });
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
      // 1) update class.teacherIds
      if (toAdd.length) {
        tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayUnion(...toAdd) });
      }
      if (toRemove.length) {
        tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayRemove(...toRemove) });
      }

      // 2) add assignments: users.classIds += classId, users.status = "Active"
      for (const id of toAdd) {
        const uRef = db.collection("users").doc(id);
        tx.update(uRef, {
          classIds: admin.firestore.FieldValue.arrayUnion(classId),
          status: "Active", // no need to read; requirement says set to Active on assign
        });
      }


      for (const id of toRemove) {
        const uRef = db.collection("users").doc(id);
        tx.update(uRef, { classIds: admin.firestore.FieldValue.arrayRemove(classId) });
      }
    });

    res.set("Cache-Control", "no-store");
    return res.json({ ok: true, classId, assigned: toAdd, unassigned: toRemove, ignoredInvalid: invalid });
  } catch (e) {
    const err = e as Error;
    console.error("[assignTeachers] failed:", err);

    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      message: "Failed to assign teachers",
      ...(isDev && { error: err.message, stack: err.stack }),
    });
  }
}
