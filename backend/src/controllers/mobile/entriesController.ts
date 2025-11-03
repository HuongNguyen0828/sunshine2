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

// Extract auth info injected by verifyIdToken middleware
function getAuthCtx(req: Request) {
  const tok: any = (req as any).userToken || {};
  return {
    role: String(tok.role || ""),
    userDocId: String(tok.userDocId || ""),
    locationId: tok.locationId ? String(tok.locationId) : undefined,
    // daycareId can be missing; treat as optional
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

// Normalize UI "All ..." sentinel values to undefined (no filter)
function normalizeOptional(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const t = s.toLowerCase();
  if (t === "all" || t === "all classes" || t === "all children") return undefined;
  return s;
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
    // userDocId + locationId must exist; daycareId is optional
    if (!auth.userDocId || !auth.locationId) {
      return res.status(401).json({ message: "missing_auth_scope" });
    }

    const body: BulkEntryCreateRequest = (req.body as any) || { items: [] };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ message: "empty_items" });
    }

    const result = await bulkCreateEntriesService(
      {
        userDocId: auth.userDocId,
        locationId: auth.locationId,
        daycareId: auth.daycareId, // may be undefined
      },
      body
    );

    return res.json(result);
  } catch (e: any) {
    return res
      .status(400)
      .json({ message: String(e?.message || "bulk_failed") });
  }
}

/** GET /v1/entries
 * Query: childId?, classId?, type?, dateFrom?, dateTo?, limit?
 * Role rules:
 *  - parent: only visibleToParents == true AND must provide childId
 *  - teacher: limited to their locationId; other filters optional
 */
export async function listEntries(req: Request, res: Response) {
  try {
    const auth = getAuthCtx(req);
    const role = auth.role;

    // Remove "All ..." sentinels coming from UI
    const {
      childId: rawChildId,
      classId: rawClassId,
      type: rawType,
      dateFrom,
      dateTo,
      limit: limitQ,
    } = (req.query || {}) as Partial<EntryFilter> & { limit?: string };

    const childId = normalizeOptional(rawChildId);
    const classId = normalizeOptional(rawClassId);
    const type = normalizeOptional(rawType) as EntryType | undefined;

    let q: FirebaseFirestore.Query = db.collection("entries");

    // Role-based scoping
    if (role === "parent") {
      q = q.where("visibleToParents", "==", true);
      if (!childId) {
        return res
          .status(400)
          .json({ message: "childId_required_for_parent" });
      }
      q = q.where("childId", "==", childId);
    } else if (role === "teacher") {
      if (!auth.locationId) {
        return res.status(401).json({ message: "missing_location_scope" });
      }
      q = q.where("locationId", "==", auth.locationId);
      if (childId) q = q.where("childId", "==", childId);
    } else {
      return res.status(403).json({ message: "forbidden_role" });
    }

    // Optional filters
    if (classId) q = q.where("classId", "==", classId);
    if (type) q = q.where("type", "==", type);

    // Date range (by occurredAt)
    if (dateFrom && isIso(dateFrom)) q = q.where("occurredAt", ">=", dateFrom);
    if (dateTo && isIso(dateTo)) q = q.where("occurredAt", "<", dateTo);

    // Ordering & limit
    q = q.orderBy("occurredAt", "desc");
    const limitNum = clampLimit(limitQ, 50, 1, 100);
    q = q.limit(limitNum);

    const snap = await q.get();
    const items: EntryDoc[] = snap.docs.map((d) => d.data() as EntryDoc);

    return res.json(items);
  } catch (e: any) {
    return res
      .status(400)
      .json({ message: String(e?.message || "list_failed") });
  }
}
