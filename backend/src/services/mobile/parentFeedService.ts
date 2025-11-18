// backend/src/services/mobile/parentFeedService.ts
import { admin } from "../../lib/firebase";
import { ParentFeedEntry } from "../../../../shared/types/type";

function tsToIso(v: any): string | undefined {
  if (v && typeof v.toMillis === "function") {
    return new Date(v.toMillis()).toISOString();
  }
  if (typeof v === "string") return v;
  return undefined;
}

export const parentFeedService = async (
  userDocId: string
): Promise<ParentFeedEntry[]> => {
  const db = admin.firestore();

  // 1) load parent user doc
  const userSnap = await db.collection("users").doc(userDocId).get();
  if (!userSnap.exists) {
    return [];
  }

  const userData = userSnap.data() as any;
  const rels: Array<{ childId: string }> = Array.isArray(
    userData.childRelationships
  )
    ? userData.childRelationships
    : [];

  const childIds = rels.map((r) => r.childId).filter(Boolean);
  if (childIds.length === 0) {
    return [];
  }

  const entriesCol = db.collection("entries");
  const out: ParentFeedEntry[] = [];

  // Firestore 'in' query limit is 10
  const chunks: string[][] = [];
  for (let i = 0; i < childIds.length; i += 10) {
    chunks.push(childIds.slice(i, i + 10));
  }

  // 2) fetch entries for each chunk
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
        // prefer occurredAt if present, fallback to createdAt
        occurredAt: tsToIso(d.occurredAt ?? d.createdAt),
        createdAt: tsToIso(d.createdAt),
        photoUrl: d.photoUrl,
        classId: d.classId,
        teacherName: d.teacherName,
        childName: d.childName,
      });
    });
  }

  // 3) sort newest -> oldest
  out.sort((a, b) => {
    const ta = a.occurredAt ? Date.parse(a.occurredAt) : a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.occurredAt ? Date.parse(b.occurredAt) : b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  return out;
};
