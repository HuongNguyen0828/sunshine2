// backend/src/controllers/mobile/parentFeedController.ts
import { Response } from "express";
import { parentFeedService } from "../../services/mobile/parentFeedService";
import { AuthRequest } from "../../middleware/authMiddleware";
import { ParentFeedEntry } from "../../../../shared/types/type";

function tsToIso(v: any): string | undefined {
  // Firestore Timestamp has toMillis()
  if (v && typeof v.toMillis === "function") {
    return new Date(v.toMillis()).toISOString();
  }
  // sometimes service might already give ISO
  if (typeof v === "string") return v;
  return undefined;
}

export const getParentFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userDocId = req.user?.userDocId;
    if (!userDocId) {
      return res.status(400).json({ ok: false, message: "Missing userDocId in token" });
    }

    // this still returns the raw service objects (with Timestamp)
    const rawEntries = await parentFeedService(userDocId);

    // normalize to shared ParentFeedEntry shape
    const entries: ParentFeedEntry[] = rawEntries.map((e: any) => ({
      id: e.id,
      type: e.type,
      subtype: e.subtype,
      detail: e.detail,
      childId: e.childId,
      occurredAt: tsToIso(e.occurredAt ?? e.createdAt),
      createdAt: tsToIso(e.createdAt),
      photoUrl: e.photoUrl,
      classId: e.classId,
      teacherName: e.teacherName,
      childName: e.childName,
    }));

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
