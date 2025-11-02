// mobile/services/useEntriesAPI.ts
import { Platform } from "react-native";
import { auth } from "@/lib/firebase";
import type {
  EntryCreateInput,
  EntryFilter,
  EntryType,
  BulkEntryCreateRequest,
  BulkEntryCreateResult,
} from "../../shared/types/type";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; reason?: string };
export type ApiRes<T> = Ok<T> | Err;

/* ===============================
 * API base (Android emulator uses 10.0.2.2)
 * =============================== */
const BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:5001/api/mobile"
    : "http://localhost:5001/api/mobile";

/* ===============================
 * Client-side rules (mirror of server)
 * =============================== */

// Types that require a subtype
const NEEDS_SUBTYPE: EntryType[] = ["Attendance", "Food", "Sleep"];

// Types that require a free-text detail
const NEEDS_DETAIL: EntryType[] = ["Activity", "Note", "Health"];

// Types that require a photo url
const NEEDS_PHOTO: EntryType[] = ["Photo"];

// Toilet requires toiletKind but no subtype
function needsToiletKind(t: EntryType) {
  return t === "Toilet";
}

/* ===============================
 * Small utilities
 * =============================== */

// ISO datetime guard
function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

// Now in ISO
function nowIso() {
  return new Date().toISOString();
}

// Build auth header using Firebase ID token
async function authHeader() {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${idToken}` };
}

function toStr(v: unknown) {
  return String(v ?? "").trim();
}

/* ===============================
 * Validation & normalization
 * =============================== */

/** Client-side validation before hitting the API */
function validateItem(p: EntryCreateInput): string | null {
  // childIds rule: unless applyToAllInClass is true, we need at least one child
  if (!Array.isArray(p.childIds)) return "childIds must be an array";
  if (!p.applyToAllInClass && p.childIds.length === 0) {
    return "At least one child is required";
  }

  // occurredAt rule
  const occ = (p as any).occurredAt;
  if (!isIsoDateTime(occ ?? "")) return "occurredAt must be an ISO datetime";

  // subtype rules
  if (NEEDS_SUBTYPE.includes(p.type as EntryType) && !(p as any).subtype) {
    return "Subtype is required";
  }

  // toiletKind rule
  if (needsToiletKind(p.type as EntryType) && !toStr((p as any).toiletKind)) {
    return "toiletKind is required";
  }

  // photo rule
  if (NEEDS_PHOTO.includes(p.type as EntryType) && !toStr((p as any).photoUrl)) {
    return "Photo URL is required";
  }

  // detail rule
  if (NEEDS_DETAIL.includes(p.type as EntryType) && !toStr((p as any).detail)) {
    return "Detail is required";
  }

  // applyToAllInClass requires classId
  if ((p as any).applyToAllInClass && !toStr(p.classId)) {
    return "classId is required when applyToAllInClass is true";
  }

  return null;
}

/** Normalize one item to the server shape (ensure occurredAt exists) */
function normalizeItem(p: EntryCreateInput) {
  return {
    ...p,
    occurredAt: (p as any).occurredAt && isIsoDateTime((p as any).occurredAt)
      ? (p as any).occurredAt
      : nowIso(),
  };
}

/* ===============================
 * API calls
 * =============================== */

/** POST /v1/entries/bulk */
export async function bulkCreateEntries(
  items: EntryCreateInput[]
): Promise<ApiRes<BulkEntryCreateResult>> {
  try {
    if (!items?.length) return { ok: false, reason: "No items" };

    // Validate each item on client to provide quick feedback
    for (const it of items) {
      const normalized = normalizeItem(it);
      const err = validateItem(normalized);
      if (err) return { ok: false, reason: err };
    }

    const headers = {
      "Content-Type": "application/json",
      ...(await authHeader()),
    };

    const payload: BulkEntryCreateRequest = {
      items: items.map(normalizeItem),
    };

    const res = await fetch(`${BASE_URL}/v1/entries/bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return { ok: false, reason: data?.message || data?.reason || `HTTP ${res.status}` };
    }

    return { ok: true, data: data as BulkEntryCreateResult };
  } catch (e: any) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

/** Convenience: create entries for all children in a class (server expands) */
export async function createForClass(
  base: Omit<EntryCreateInput, "childIds"> & { classId: string }
) {
  return bulkCreateEntries([
    {
      ...base,
      childIds: [],
      applyToAllInClass: true,
      occurredAt: (base as any).occurredAt ?? nowIso(),
    } as EntryCreateInput,
  ]);
}

/** Convenience: create entries for selected children only */
export async function createForChildren(
  base: Omit<EntryCreateInput, "childIds">,
  childIds: string[]
) {
  return bulkCreateEntries([
    {
      ...base,
      childIds,
      applyToAllInClass: false,
      occurredAt: (base as any).occurredAt ?? nowIso(),
    } as EntryCreateInput,
  ]);
}

/** GET /v1/entries */
export async function listEntries(
  filter: EntryFilter = {},
  limit = 50
): Promise<ApiRes<any[]>> {
  try {
    const headers = {
      ...(await authHeader()),
    };

    const qs = new URLSearchParams();
    if (filter.childId) qs.set("childId", filter.childId);
    if (filter.classId) qs.set("classId", filter.classId);
    if (filter.type) qs.set("type", filter.type as EntryType);
    if (filter.dateFrom) qs.set("dateFrom", filter.dateFrom);
    if (filter.dateTo) qs.set("dateTo", filter.dateTo);
    qs.set("limit", String(Math.max(1, Math.min(limit, 100))));

    const res = await fetch(`${BASE_URL}/v1/entries?${qs.toString()}`, {
      method: "GET",
      headers,
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      return { ok: false, reason: data?.message || data?.reason || `HTTP ${res.status}` };
    }
    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (e: any) {
    return { ok: false, reason: String(e?.message || e) };
  }
}
