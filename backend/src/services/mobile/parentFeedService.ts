// backend/src/services/mobile/parentFeedService.ts
import { admin } from "../../lib/firebase";

type ParentEntry = {
  id: string;
  type: string;
  subtype?: string;
  detail?: any;
  childId: string;
  createdAt?: FirebaseFirestore.Timestamp;
  photoUrl?: string;
  classId?: string;
  teacherName?: string;
};

export const parentFeedService = async (userDocId: string): Promise<ParentEntry[]> => {
  const db = admin.firestore();

  const userSnap = await db.collection("users").doc(userDocId).get();
  if (!userSnap.exists) {
    return [];
  }

  const userData = userSnap.data() as any;
  const rels: Array<{ childId: string }> = Array.isArray(userData.childRelationships)
    ? userData.childRelationships
    : [];

  const childIds = rels.map((r) => r.childId).filter(Boolean);
  if (childIds.length === 0) {
    return [];
  }

  const entriesCol = db.collection("entries");
  const out: ParentEntry[] = [];

  const chunks: string[][] = [];
  for (let i = 0; i < childIds.length; i += 10) {
    chunks.push(childIds.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const q = entriesCol
      .where("childId", "in", chunk)
      .orderBy("createdAt", "desc")
      .limit(80);
    const snap = await q.get();
    snap.forEach((doc) => {
      const d = doc.data() as any;
      out.push({
        id: doc.id,
        type: d.type,
        subtype: d.subtype,
        detail: d.detail,
        childId: d.childId,
        createdAt: d.createdAt,
        photoUrl: d.photoUrl,
        classId: d.classId,
        teacherName: d.teacherName,
      });
    });
  }

  out.sort((a, b) => {
    const ta = a.createdAt ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });

  return out;
};
