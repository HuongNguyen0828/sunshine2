// backend/src/controllers/mobile/entriesController.ts
import type { Request, Response } from "express";
import { db } from "../../lib/firebase";
import {
  bulkCreateEntriesService,
} from "../../services/mobile/entriesService";
import type {
  BulkEntryCreateRequest,
  EntryFilter,
  EntryDoc,
  EntryType,
} from "../../../../shared/types/type";

/** Extract auth context from middleware-injected token */
function getAuthCtx(req: Request) {
  const tok: any = (req as any).userToken || {};
  return {
    role: String(tok.role || ""),
    userDocId: String(tok.userDocId || ""),
    locationId: tok.locationId ? String(tok.locationId) : undefined,
    daycareId: tok.daycareId ? String(tok.daycareId) : undefined,
  };
}

function isIso(v?: string) {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

/** POST /v1/entries/bulk
 * Body: BulkEntryCreateRequest
 */
export async function bulkCreateEntries(req: Request, res: Response) {
  try {
    const auth = getAuthCtx(req);
    if (auth.role !== "teacher") {
      return res.status(403).json({ message: "forbidden_role" });
    }
    if (!auth.userDocId) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const body: BulkEntryCreateRequest = req.body || { items: [] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ message: "empty_items" });
    }

    const result = await bulkCreateEntriesService(
      { userDocId: auth.userDocId, daycareId: auth.daycareId, locationId: auth.locationId },
      body
    );

    return res.json(result);
  } catch (e: any) {
    return res.status(400).json({ message: String(e?.message || "bulk_failed") });
  }
}

/** GET /v1/entries
 * Query: childId?, classId?, type?, dateFrom?, dateTo?, limit?
 * Notes:
 *  - Parents: only visible entries (visibleToParents == true)
 *  - Teachers: scoped by locationId (from token); can view their location entries
 */
export async function listEntries(req: Request, res: Response) {
  try {
    const auth = getAuthCtx(req);
    const role = auth.role;

    const {
      childId,
      classId,
      type,
      dateFrom,
      dateTo,
      limit: limitQ,
    } = (req.query || {}) as Partial<EntryFilter> & { limit?: string };

    let q: FirebaseFirestore.Query = db.collection("entries");

    // Scope by role
    if (role === "parent") {
      q = q.where("visibleToParents", "==", true);
      if (!childId) {
        return res
          .status(400)
          .json({ message: "childId_required_for_parent" });
      }
    } else if (role === "teacher") {
      if (auth.locationId) {
        q = q.where("locationId", "==", auth.locationId);
      }
    } else {
      return res.status(403).json({ message: "forbidden_role" });
    }

    // Optional filters
    if (childId) q = q.where("childId", "==", childId);
    if (classId) q = q.where("classId", "==", classId);
    if (type) q = q.where("type", "==", type as EntryType);

    // Date range (occurredAt)
    if (dateFrom && isIso(dateFrom)) {
      q = q.where("occurredAt", ">=", dateFrom);
    }
    if (dateTo && isIso(dateTo)) {
      q = q.where("occurredAt", "<", dateTo);
    }

    // Ordering & limit
    q = q.orderBy("occurredAt", "desc");
    const limitNum = Math.max(
      1,
      Math.min( Number(limitQ ?? 50), 100 )
    );
    q = q.limit(limitNum);

    const snap = await q.get();
    const items: EntryDoc[] = snap.docs.map((d) => d.data() as EntryDoc);

    return res.json(items);
  } catch (e: any) {
    return res.status(400).json({ message: String(e?.message || "list_failed") });
  }
}
