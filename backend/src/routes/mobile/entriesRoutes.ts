// backend/src/routes/mobile/entriesRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import { bulkCreateEntries, listEntries } from "../../controllers/mobile/entriesController";
import { verifyIdToken } from "../../middleware/verifyIdToken";
import { rateLimit } from "../../middleware/rateLimit";

const r = Router();

/* ===============================
 * Constants & Utilities
 * =============================== */

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

// Validate ISO datetime string (2025-11-01T12:34:56Z)
function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function toStr(v: unknown): string {
  return String(v ?? "").trim();
}

function sanitizeChildIds(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  const s = new Set<string>();
  for (const it of arr) {
    const id = toStr(it);
    if (id) s.add(id);
  }
  return Array.from(s);
}

/* ===============================
 * Validators
 * =============================== */

/** Validate request body for bulk entry creation. */
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

    // Validation rule: if applyToAllInClass = true → classId is required
    if (applyToAllInClass && !classId) {
      return res.status(400).json({ message: `classId_required_at_${i}` });
    }

    // Type-specific validations
    switch (type) {
      case "Attendance":
        if (!["Check in", "Check out"].includes(toStr(raw.subtype)))
          return res.status(400).json({ message: `attendance_subtype_required_at_${i}` });
        break;
      case "Food":
        if (!["Breakfast", "Lunch", "Snack"].includes(toStr(raw.subtype)))
          return res.status(400).json({ message: `food_subtype_required_at_${i}` });
        break;
      case "Sleep":
        if (!["Started", "Woke up"].includes(toStr(raw.subtype)))
          return res.status(400).json({ message: `sleep_subtype_required_at_${i}` });
        break;
      case "Toilet":
        if (!["urine", "bm"].includes(toStr(raw.toiletKind)))
          return res.status(400).json({ message: `toilet_kind_required_at_${i}` });
        break;
      case "Activity":
      case "Note":
      case "Health":
        if (!toStr(raw.detail))
          return res.status(400).json({ message: `detail_required_at_${i}` });
        break;
      case "Photo":
        if (!toStr(raw.photoUrl))
          return res.status(400).json({ message: `photo_url_required_at_${i}` });
        break;
    }

    // Normalize final sanitized object
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

/** Validate query parameters for listing entries. */
function listValidator(req: Request, res: Response, next: NextFunction) {
  const q = req.query as any;
  const out: any = {};

  if (q.childId) out.childId = toStr(q.childId);
  if (q.classId) out.classId = toStr(q.classId);
  if (q.type) {
    const t = toStr(q.type);
    if (!ENTRY_TYPES.has(t)) return res.status(400).json({ message: "invalid_type" });
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
