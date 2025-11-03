// backend/src/services/mobile/entriesService.ts
import { db } from "../../lib/firebase";
import type {
  BulkEntryCreateRequest,
  BulkEntryCreateResult,
  EntryCreateInput,
  EntryDoc,
  EntryType,
  AttendanceSubtype,
  SleepSubtype,
} from "../../../../shared/types/type";

/* =========
 * Types
 * ========= */

type AuthCtx = {
  userDocId: string;
  daycareId?: string;   // now optional
  locationId?: string;
};

/* =========
 * Helpers
 * ========= */

// Validate ISO datetime string (e.g., 2025-11-01T12:34:56.789Z)
function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

// Attendance subtype → normalized status key
function mapAttendanceStatus(
  sub: AttendanceSubtype | undefined
): "check_in" | "check_out" | undefined {
  if (sub === "Check in") return "check_in";
  if (sub === "Check out") return "check_out";
  return undefined;
}

// Sleep "Started" → start, "Woke up" → end
function isSleepStart(sub: SleepSubtype | undefined) {
  return sub === "Started";
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

// Split array into chunks (Firestore batch hard limit is 500)
function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Expand children by class when applyToAllInClass is true.
 *  Otherwise return provided childIds (deduped).
 */
async function expandChildIds(item: EntryCreateInput): Promise<string[]> {
  if (!item.applyToAllInClass || !item.classId) {
    return uniq(item.childIds ?? []);
  }
  const snap = await db
    .collection("children")
    .where("classId", "==", item.classId)
    .get();
  const ids = snap.docs.map((d) => d.id);
  return uniq([...(item.childIds ?? []), ...ids]);
}

/** Create a base document for a single child. */
function buildDocBase(
  auth: AuthCtx,
  item: EntryCreateInput,
  childId: string
): EntryDoc {
  const nowIso = new Date().toISOString();

  const base: EntryDoc = {
    id: db.collection("entries").doc().id, // will be overridden by ref.id at write
    daycareId: String(auth.daycareId ?? ""), // allow blank
    locationId: String(auth.locationId ?? ""),
    classId: item.classId ?? null,
    childId,

    createdByUserId: auth.userDocId,
    createdByRole: "teacher",
    createdAt: nowIso,

    occurredAt: item.occurredAt, // validated
    type: item.type,

    data: {},
    detail: (item as any).detail,
    photoUrl: (item as any).photoUrl,

    visibleToParents: true,
    publishedAt: nowIso,
  };

  return base;
}

/** Validate a single create item. Throws Error(message) if invalid. */
function validateItem(item: EntryCreateInput) {
  // Common
  if (!isIsoDateTime(item.occurredAt)) throw new Error("invalid_occurredAt");

  // Type-specific
  switch (item.type as EntryType) {
    case "Attendance": {
      const status = mapAttendanceStatus((item as any).subtype);
      if (!status) throw new Error("attendance_subtype_required");
      break;
    }
    case "Food": {
      if (!(item as any).subtype) throw new Error("food_subtype_required");
      break;
    }
    case "Sleep": {
      if (!(item as any).subtype) throw new Error("sleep_subtype_required");
      break;
    }
    case "Toilet": {
      const tk = (item as any).toiletKind;
      if (tk !== "urine" && tk !== "bm") throw new Error("toilet_kind_required");
      break;
    }
    case "Activity": {
      if (!("detail" in item) || !item.detail?.trim())
        throw new Error("activity_detail_required");
      break;
    }
    case "Note": {
      if (!("detail" in item) || !item.detail?.trim())
        throw new Error("note_detail_required");
      break;
    }
    case "Health": {
      if (!("detail" in item) || !item.detail?.trim())
        throw new Error("health_detail_required");
      break;
    }
    case "Photo": {
      if (!("photoUrl" in item) || !item.photoUrl?.trim())
        throw new Error("photo_url_required");
      break;
    }
    default:
      throw new Error("unsupported_type");
  }

  // Extra: if fan-out across class, classId must be provided
  if ((item as any).applyToAllInClass && !item.classId) {
    throw new Error("classId_required_when_applyToAllInClass");
  }
}

/** Apply per-type mapping to the doc (subtype/data fields). */
function applyTypeMapping(doc: EntryDoc, item: EntryCreateInput) {
  switch (item.type as EntryType) {
    case "Attendance": {
      const status = mapAttendanceStatus((item as any).subtype);
      doc.subtype = (item as any).subtype;
      doc.data = { ...(doc.data || {}), status };
      break;
    }
    case "Food": {
      doc.subtype = (item as any).subtype;
      break;
    }
    case "Sleep": {
      doc.subtype = (item as any).subtype;
      const key = isSleepStart((item as any).subtype) ? "start" : "end";
      doc.data = { ...(doc.data || {}), [key]: item.occurredAt };
      break;
    }
    case "Toilet": {
      const tk = (item as any).toiletKind; // "urine" | "bm"
      doc.data = {
        ...(doc.data || {}),
        toiletTime: item.occurredAt,
        toiletKind: tk,
      };
      break;
    }
    case "Activity":
    case "Note":
    case "Health": {
      doc.data = { ...(doc.data || {}), text: item.detail?.trim() || "" };
      break;
    }
    case "Photo": {
      // nothing extra
      break;
    }
  }
}

/* =========
 * Service
 * ========= */

/** Bulk-create entries with optional class fan-out. */
export async function bulkCreateEntriesService(
  auth: AuthCtx,
  payload: BulkEntryCreateRequest
): Promise<BulkEntryCreateResult> {
  const created: { id: string; type: EntryType }[] = [];
  const failed: { index: number; reason: string }[] = [];

  // Require user + location; daycare is optional
  if (!auth.userDocId) throw new Error("missing_userDocId");
  if (!auth.locationId) throw new Error("missing_locationId");

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) return { created, failed };

  // Validate each item; keep processing others when one fails
  const validated: (EntryCreateInput | null)[] = items.map((it, idx) => {
    try {
      validateItem(it);
      return it;
    } catch (e: any) {
      failed.push({ index: idx, reason: String(e?.message || "invalid") });
      return null;
    }
  });

  // Build batched writes (fan-out per child)
  const writes: Array<{ index: number; refPath: string; doc: EntryDoc }> = [];

  for (let i = 0; i < validated.length; i++) {
    const item = validated[i];
    if (!item) continue;

    try {
      const childIds = await expandChildIds(item);
      if (childIds.length === 0) {
        failed.push({ index: i, reason: "no_children" });
        continue;
      }

      for (const childId of childIds) {
        const ref = db.collection("entries").doc();
        const doc = buildDocBase(auth, item, childId);
        doc.id = ref.id; // keep id == ref.id
        applyTypeMapping(doc, item);
        writes.push({ index: i, refPath: ref.path, doc });
      }
    } catch (e: any) {
      failed.push({ index: i, reason: String(e?.message || "expand_failed") });
    }
  }

  // Commit in safe chunks (<= 500 ops per batch; use a safety buffer)
  for (const part of chunk(writes, 450)) {
    const batch = db.batch();
    for (const w of part) {
      const ref = db.doc(w.refPath);
      batch.set(ref, w.doc);
      created.push({ id: w.doc.id, type: w.doc.type });
    }
    await batch.commit();
  }

  return { created, failed };
}
