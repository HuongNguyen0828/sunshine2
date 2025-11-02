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

const BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:5001/api/mobile"
    : "http://localhost:5001/api/mobile";

// Types that require a subtype
const NEEDS_SUBTYPE: EntryType[] = ["Attendance", "Food", "Sleep"];
// Types that require a free-text detail
const NEEDS_DETAIL: EntryType[] = ["Activity", "Note", "Health"];
// Types that require a photo url
const NEEDS_PHOTO: EntryType[] = ["Photo"];

// Toilet requires toiletKind but no subtype; keep it explicit
function needsToiletKind(t: EntryType) {
  return t === "Toilet";
}

function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function nowIso() {
  return new Date().toISOString();
}

async function authHeader() {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${idToken}` };
}

function toStr(v: unknown) {
  return String(v ?? "").trim();
}

/** Client-side validation before hitting the API */
function validateItem(p: EntryCreateInput): string | null {
  if (!Array.isArray(p.childIds)) return "childIds must be an array";
  if (!p.applyToAllInClass && p.childIds.length === 0) return "At least one child is required";
  if (!isIsoDateTime((p as any).occurredAt ?? "")) return "occurredAt must be an ISO datetime";

  if (NEEDS_SUBTYPE.includes(p.type as EntryType) && !(p as any).subtype) {
    return "Subtype is required";
  }
  if (needsToiletKind(p.type as EntryType) && !toStr((p as any).toiletKind)) {
    return "toiletKind is required";
  }
  if (NEEDS_PHOTO.includes(p.type as EntryType) && !toStr((p as any).photoUrl)) {
    return "Photo URL is required";
  }
  if (NEEDS_DETAIL.includes(p.type as EntryType) && !toStr((p as any).detail)) {
    return "Detail is required";
  }
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

/** POST /v1/entries/bulk */
export async function bulkCreateEntries(
  items: EntryCreateInput[]
): Promise<ApiRes<BulkEntryCreateResult>> {
  try {
    if (!items?.length) return { ok: false, reason: "No items" };

    // Validate each item on client to provide quick feedback
    for (const it of items) {
      const err = validateItem(normalizeItem(it));
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

/** Convenience: apply to all in class */
export async function createForClass(
  base: Omit<EntryCreateInput, "childIds"> & { classId: string }
) {
  return bulkCreateEntries([
    {
      ...base,
      childIds: [],
      applyToAllInClass: true,
    } as EntryCreateInput,
  ]);
}

/** Convenience: apply to specific children */
export async function createForChildren(
  base: Omit<EntryCreateInput, "childIds">,
  childIds: string[]
) {
  return bulkCreateEntries([
    {
      ...base,
      childIds,
      applyToAllInClass: false,
    } as EntryCreateInput,
  ]);
}

/** GET /v1/entries */
export async function listEntries(filter: EntryFilter = {}, limit = 50): Promise<ApiRes<any[]>> {
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
