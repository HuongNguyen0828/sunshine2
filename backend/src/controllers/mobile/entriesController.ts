// backend/src/controllers/mobile/entriesController.ts
import type { Request, Response } from "express";
import { db } from "../../lib/firebase";
import { bulkCreateEntriesService } from "../../services/mobile/entriesService";
import type {
  BulkEntryCreateRequest,
  EntryFilter,
  EntryDoc,
  EntryType,
} from "../../../../shared/types/type"; 

/* =========
 * Helpers
 * ========= */

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

function clampLimit(v: unknown, def = 50, min = 1, max = 100) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(n, max));
}

/* =========
 * Controllers
 * ========= */

/** POST /v1/entries/bulk
 * Body: BulkEntryCreateRequest
 * Scope: teacher only
 */
export async function bulkCreateEntries(req: Request, res: Response) {
  try {
    const auth = getAuthCtx(req);
    if (auth.role !== "teacher") {
      return res.status(403).json({ message: "forbidden_role" });
    }
    if (!auth.userDocId || !auth.locationId || !auth.daycareId) {
      return res.status(401).json({ message: "missing_auth_scope" });
    }

    const body: BulkEntryCreateRequest = (req.body as any) || { items: [] };
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
 * Role rules:
 *  - parent: must see only visible entries and MUST provide childId (ownership check can be added later)
 *  - teacher: limited to their locationId; optional additional filters
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

    // Role-based scoping
    if (role === "parent") {
      // Parents only see items marked visible
      q = q.where("visibleToParents", "==", true);
      // For now require childId in query to keep scope minimal
      if (!childId) {
        return res.status(400).json({ message: "childId_required_for_parent" });
      }
      q = q.where("childId", "==", String(childId));
    } else if (role === "teacher") {
      if (!auth.locationId) {
        return res.status(401).json({ message: "missing_location_scope" });
      }
      q = q.where("locationId", "==", auth.locationId);
      if (childId) q = q.where("childId", "==", String(childId));
    } else {
      return res.status(403).json({ message: "forbidden_role" });
    }

    // Optional filters
    if (classId) q = q.where("classId", "==", String(classId));
    if (type) q = q.where("type", "==", String(type) as EntryType);

    // Date range filter (occurredAt)
    if (dateFrom && isIso(dateFrom)) q = q.where("occurredAt", ">=", dateFrom);
    if (dateTo && isIso(dateTo)) q = q.where("occurredAt", "<", dateTo);

    // Order and limit
    q = q.orderBy("occurredAt", "desc");
    const limitNum = clampLimit(limitQ, 50, 1, 100);
    q = q.limit(limitNum);

    const snap = await q.get();
    const items: EntryDoc[] = snap.docs.map((d) => d.data() as EntryDoc);

    return res.json(items);
  } catch (e: any) {
    return res.status(400).json({ message: String(e?.message || "list_failed") });
  }
}
