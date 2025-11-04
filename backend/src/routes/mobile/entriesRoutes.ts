// backend/src/routes/mobile/entriesRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import {
  bulkCreateEntries,
  listEntries,
} from "../../controllers/mobile/entriesController";
import { verifyIdToken } from "../../middleware/verifyIdToken";
import { rateLimit } from "../../middleware/rateLimit";

const r = Router();

/* ===============================
 * Constants & small utilities
 * =============================== */

// Allowed entry types (8 types)
const ENTRY_TYPES = new Set([
  "Attendance",
  "Food",
  "Sleep",
  "Toilet",
  "Activity",
  "Photo",
  "Note",
  "Health",
]);

// ISO datetime guard (e.g. 2025-11-01T12:34:56.789Z)
function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function toStr(v: unknown): string {
  return String(v ?? "").trim();
}

// Treat UI “All”, “All Classes”, “All Children” as undefined (no filter)
function normalizeAll(v?: unknown): string | undefined {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return undefined;
  if (s === "all" || s === "all classes" || s === "all children") return undefined;
  return String(v);
}

// Unique & sanitized childIds
function sanitizeChildIds(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  const out = new Set<string>();
  for (const item of arr) {
    const id = toStr(item);
    if (id) out.add(id);
  }
  return Array.from(out);
}

/* ===============================
 * Validators
 * =============================== */

/**
 * Validate request body for bulk creation and normalize payload.
 *
 * Rules:
 * - items must be a non-empty array
 * - each item must have a valid type
 * - each item must have occurredAt in ISO format
 * - applyToAllInClass=true → classId is required
 * - type-specific requirements checked here to give early feedback
 *
 * Note:
 * - We **allow** childIds to be empty when applyToAllInClass=false.
 *   The service layer will fan-out (or return "no_children") later.
 */
function bulkValidator(req: Request, res: Response, next: NextFunction) {
  const body = (req.body || {}) as { items?: any[] };
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ message: "empty_items" });
  }

  const normalized: any[] = [];

  for (let i = 0; i < body.items.length; i++) {
    const raw = body.items[i] || {};

    const type = toStr(raw.type);
    if (!ENTRY_TYPES.has(type)) {
      return res.status(400).json({ message: `invalid_type_at_${i}` });
    }

    const occurredAt = toStr(raw.occurredAt);
    if (!isIsoDateTime(occurredAt)) {
      return res.status(400).json({ message: `invalid_occurredAt_at_${i}` });
    }

    const classId = raw.classId == null ? null : toStr(raw.classId);
    const applyToAllInClass = Boolean(raw.applyToAllInClass);
    const childIds = sanitizeChildIds(raw.childIds);

    if (applyToAllInClass && !classId) {
      return res.status(400).json({ message: `classId_required_at_${i}` });
    }

    // Type-specific checks (mirror shared/types)
    switch (type) {
      case "Attendance":
        if (!["Check in", "Check out"].includes(toStr(raw.subtype))) {
          return res
            .status(400)
            .json({ message: `attendance_subtype_required_at_${i}` });
        }
        break;
      case "Food":
        if (!["Breakfast", "Lunch", "Snack"].includes(toStr(raw.subtype))) {
          return res
            .status(400)
            .json({ message: `food_subtype_required_at_${i}` });
        }
        break;
      case "Sleep":
        if (!["Started", "Woke up"].includes(toStr(raw.subtype))) {
          return res
            .status(400)
            .json({ message: `sleep_subtype_required_at_${i}` });
        }
        break;
      case "Toilet":
        if (!["urine", "bm"].includes(toStr(raw.toiletKind))) {
          return res
            .status(400)
            .json({ message: `toilet_kind_required_at_${i}` });
        }
        break;
      case "Activity":
      case "Note":
      case "Health":
        if (!toStr(raw.detail)) {
          return res
            .status(400)
            .json({ message: `detail_required_at_${i}` });
        }
        break;
      case "Photo":
        // Frontend will usually upload and send a URL
        if (!toStr(raw.photoUrl)) {
          return res
            .status(400)
            .json({ message: `photo_url_required_at_${i}` });
        }
        break;
    }

    normalized.push({
      type,
      occurredAt,
      classId,
      applyToAllInClass,
      childIds,
      subtype: raw.subtype ? toStr(raw.subtype) : undefined,
      detail: raw.detail ? toStr(raw.detail) : undefined,
      photoUrl: raw.photoUrl ? toStr(raw.photoUrl) : undefined,
      toiletKind: raw.toiletKind ? toStr(raw.toiletKind) : undefined,
    });
  }

  (req.body as any) = { items: normalized };
  next();
}

/**
 * Validate and normalize list query.
 *
 * - Converts “All …” to undefined
 * - Validates dates
 * - Clamps limit
 */
function listValidator(req: Request, res: Response, next: NextFunction) {
  const q = req.query as any;
  const out: any = {};

  const childId = normalizeAll(q.childId);
  const classId = normalizeAll(q.classId);
  const maybeType = normalizeAll(q.type);

  if (childId) out.childId = toStr(childId);
  if (classId) out.classId = toStr(classId);

  if (maybeType) {
    const t = toStr(maybeType);
    if (!ENTRY_TYPES.has(t)) {
      return res.status(400).json({ message: "invalid_type" });
    }
    out.type = t;
  }

  if (q.dateFrom) {
    const v = toStr(q.dateFrom);
    if (!isIsoDateTime(v)) return res.status(400).json({ message: "invalid_dateFrom" });
    out.dateFrom = v;
  }

  if (q.dateTo) {
    const v = toStr(q.dateTo);
    if (!isIsoDateTime(v)) return res.status(400).json({ message: "invalid_dateTo" });
    out.dateTo = v;
  }

  const lim = Number(q.limit ?? 50);
  out.limit = Number.isFinite(lim) ? Math.max(1, Math.min(lim, 100)) : 50;

  (req.query as any) = out;
  next();
}

/* ===============================
 * Routes
 * =============================== */

// POST /v1/entries/bulk → create multiple entries
r.post("/v1/entries/bulk", rateLimit, verifyIdToken, bulkValidator, bulkCreateEntries);

// GET /v1/entries → list entries with filters
r.get("/v1/entries", rateLimit, verifyIdToken, listValidator, listEntries);

export default r;
