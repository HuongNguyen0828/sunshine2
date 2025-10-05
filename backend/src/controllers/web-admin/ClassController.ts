import { Request, Response } from "express";
import { db, admin } from "../../lib/firebase";
import { AuthRequest } from "../../middleware/authMiddleware";

// Firestore Class doc shape
type ClassDoc = {
  name: string;
  locationId?: string | undefined;          // optional
  capacity: number;
  volume: number;
  ageStart: number;
  ageEnd: number;
  classroom?: string | undefined;
  createdAt?: FirebaseFirestore.FieldValue | undefined;
  updatedAt?: FirebaseFirestore.FieldValue | undefined;
};

// GET /class
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

// POST /class
export async function addClass(req: AuthRequest, res: Response) {
  try {
    const body = req.body as ClassDoc;
    const { name, capacity, volume, ageStart, ageEnd, locationId, classroom } = body;

    if (!name || capacity == null || volume == null || ageStart == null || ageEnd == null) {
      return res.status(400).send({ message: "Missing fields" });
    } 

    // If provided, make sure location exists
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

// PUT /class/:id 
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

// DELETE /class/:id  
export async function deleteClass(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params as { id?: string };
    if (!id) return res.status(400).send({ message: "Missing class id" });

    const ref = db.collection("classes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send({ message: "Class not found" });

    // Optional: clean up teacher.classIds that still contain this classId
    const teachersSnap = await db
      .collection("teachers")
      .where("classIds", "array-contains", id)
      .get();

    const batch = db.batch();
    teachersSnap.forEach((t) => {
      const curr = (t.data().classIds as string[]) || [];
      batch.update(t.ref, { classIds: curr.filter((c) => c !== id) });
    });
    batch.delete(ref);
    await batch.commit();

    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).send({ message: "Failed to delete class" });
  }
}

// POST /class/:id/assign-teachers
// Body: { teacherIds: string[] }

export async function assignTeachers(req: AuthRequest, res: Response) {
  try {
    // 1) Validate path param and body payload
    const classId = req.params?.id || req.params?.classId;
    if (!classId) return res.status(400).json({ message: "Missing class id" });

    // Normalize & validate teacherIds into string[]
    const teacherIdsRaw: unknown[] = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds : [];
    const teacherIds: string[] = Array.from(
      new Set<string>(
        teacherIdsRaw
          .filter((v: unknown): v is string => typeof v === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );

    // 2) Ensure class exists
    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ message: "Class not found" });

    // Ensure all teachers exist (avoid creating ghost documents)
    const teacherDocs = await Promise.all(
      teacherIds.map((id) => db.collection("teachers").doc(id).get())
    );

    // Build the invalid list without out-of-bounds risks
    const invalid = teacherIds.reduce<string[]>((acc, id, i) => {
      const snap = teacherDocs[i];
      if (!snap || !snap.exists) acc.push(id); // 'id' is string, safe to push
      return acc;
    }, []);

    if (invalid.length) {
      return res.status(400).json({ message: "Invalid teacherIds", invalid });
    }

    // 4) Find currently assigned teachers for this class
    const currentAssignedSnap = await db
      .collection("teachers")
      .where("classIds", "array-contains", classId)
      .get();
    const current = new Set(currentAssignedSnap.docs.map(d => d.id));
    const selected = new Set(teacherIds);

    // Compute diffs
    const toAdd = teacherIds.filter(id => !current.has(id));
    const toRemove = [...current].filter(id => !selected.has(id));

    // 5) Apply changes atomically in a transaction (prevents race conditions)
    await db.runTransaction(async tx => {
      if (toAdd.length) {
        tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayUnion(...toAdd) });
      }
      if (toRemove.length) {
        tx.update(classRef, { teacherIds: admin.firestore.FieldValue.arrayRemove(...toRemove) });
      }

      toAdd.forEach(id => {
        const tRef = db.collection("teachers").doc(id);
        tx.update(tRef, { classIds: admin.firestore.FieldValue.arrayUnion(classId) });
      });

      toRemove.forEach(id => {
        const tRef = db.collection("teachers").doc(id);
        tx.update(tRef, { classIds: admin.firestore.FieldValue.arrayRemove(classId) });
      });
    });

    // 6) Disable caches and return success
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true, classId, teacherIds });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to assign teachers" });
  }
}

