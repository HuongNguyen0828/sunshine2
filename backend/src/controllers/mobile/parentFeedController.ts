// backend/src/controllers/mobile/parentFeedController.ts
import { Response } from "express";
import admin from "firebase-admin";
import { AuthRequest } from "../../middleware/authMiddleware";
import { ParentFeedEntry } from "../../../../shared/types/type";

const db = admin.firestore();

function tsToIso(v: any): string | undefined {
  if (v && typeof v.toMillis === "function") {
    return new Date(v.toMillis()).toISOString();
  }
  if (typeof v === "string") return v;
  return undefined;
}

export const getParentFeed = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ ok: false, message: "Missing authenticated user" });
    }

    if (user.role && user.role !== "parent") {
      return res
        .status(403)
        .json({ ok: false, message: "Only parents can access parent feed" });
    }

    const userDocId = user.userDocId;
    if (!userDocId) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing userDocId in token" });
    }

    const userSnap = await db.collection("users").doc(userDocId).get();
    if (!userSnap.exists) {
      return res
        .status(404)
        .json({ ok: false, message: "User document not found" });
    }

    const userData = userSnap.data() || {};
    const rawRels = userData.childRelationships || [];

    const rels = Array.isArray(rawRels)
      ? rawRels
      : Object.values(rawRels as Record<string, unknown>);

    let childIds: string[] = rels
      .map((r: any) => r?.childId)
      .filter((id: unknown) => typeof id === "string" && !!id) as string[];

    const queryChildId =
      typeof req.query.childId === "string" ? req.query.childId : undefined;
    if (queryChildId) {
      childIds = childIds.filter((id) => id === queryChildId);
    }

    if (childIds.length === 0) {
      return res.status(200).json({ ok: true, count: 0, entries: [] });
    }

    const batchIds = childIds.slice(0, 10);

    const snap = await db
      .collection("entries")
      .where("childId", "in", batchIds)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const entries: ParentFeedEntry[] = snap.docs.map((d) => {
      const data = d.data() as any;

      const createdAt = tsToIso(data.createdAt);
      const occurredAt = tsToIso(data.occurredAt ?? data.createdAt);

      const entry: ParentFeedEntry = {
        id: d.id,
        type: data.type,
        subtype: data.subtype,
        detail: data.detail,
        childId: data.childId,
        occurredAt,
        createdAt,
        photoUrl: data.photoUrl,
        classId: data.classId,
        teacherName: data.teacherName,
        childName: data.childName,
      };

      return entry;
    });

    return res.status(200).json({
      ok: true,
      count: entries.length,
      entries,
    });
  } catch (err: any) {
    console.error("Error fetching parent feed:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch parent feed",
      error: err?.message || String(err),
    });
  }
};
