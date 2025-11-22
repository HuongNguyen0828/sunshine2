// backend/src/controllers/mobile/entriesController.ts

import type { Response } from "express";
import { db } from "../../lib/firebase";
import { bulkCreateEntriesService } from "../../services/mobile/entriesService";
import type {
  BulkEntryCreateRequest,
  EntryFilter,
  EntryDoc,
  EntryType,
} from "../../../../shared/types/type";
import type { AuthRequest } from "../../middleware/authMiddleware";

/* =========
 * Helpers
 * ========= */

// Extract auth info from AuthRequest injected by authMiddleware
function getAuthCtx(req: AuthRequest) {
  const u = req.user;
  return {
    role: u?.role ? String(u.role) : "",
    userDocId: u?.userDocId ? String(u.userDocId) : "",
    locationId: u?.locationId ? String(u.locationId) : undefined,
    daycareId: u?.daycareId ? String(u.daycareId) : undefined,
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
function normalizeOptional(v?: string | string[] | null) {
  if (Array.isArray(v)) {
    v = v[0];
  }
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const t = s.toLowerCase();
  if (t === "all" || t === "all classes" || t === "all children") return undefined;
  return s;
}

/* =========
 * Controllers
 * ========= */

/**
 * POST /api/mobile/entries/bulk
 * Body: BulkEntryCreateRequest
 * Scope: teacher only
 */
export async function bulkCreateEntries(req: AuthRequest, res: Response) {
  try {
    const auth = getAuthCtx(req);

    if (auth.role !== "teacher") {
      return res.status(403).json({ message: "forbidden_role" });
    }

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
        daycareId: auth.daycareId,
      },
      body
    );

    return res.json(result);
  } catch (e: any) {
    console.error("bulkCreateEntries error:", e);
    return res
      .status(400)
      .json({ message: String(e?.message || "bulk_failed") });
  }
}

/**
 * GET /api/mobile/entries
 * Query: childId?, classId?, type?, dateFrom?, dateTo?, limit?
 *
 * Role rules:
 *  - parent: only visibleToParents == true AND must provide childId
 *  - teacher: limited to their locationId; other filters optional
 */
export async function listEntries(req: AuthRequest, res: Response) {
  try {
    const auth = getAuthCtx(req);
    const role = auth.role;

    const {
      childId: rawChildId,
      classId: rawClassId,
      type: rawType,
      dateFrom,
      dateTo,
      limit: limitQ,
    } = (req.query || {}) as Partial<EntryFilter> & { limit?: string | string[] };

    const childId = normalizeOptional(rawChildId);
    const classId = normalizeOptional(rawClassId);
    const type = normalizeOptional(rawType) as EntryType | undefined;

    let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db.collection("entries");

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
    const items: EntryDoc[] = snap.docs.map((d) => {
      const data = d.data() as EntryDoc;
      return { ...data, id: d.id };
    });

    return res.json(items);
  } catch (e: any) {
    console.error("listEntries error:", e);
    return res
      .status(400)
      .json({ message: String(e?.message || "list_failed") });
  }
}
