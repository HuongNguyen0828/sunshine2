// backend/src/services/mobile/entriesService.ts

import { db } from "../../lib/firebase";
import {
  upsertDailyReportsForEntries,
} from "./dailyReportService";

import type {
  BulkEntryCreateRequest,
  BulkEntryCreateResult,
  EntryCreateInput,
  EntryDoc,
  EntryType,
} from "../../../../shared/types/type";

/* =========
 * Types
 * ========= */

type AuthCtx = {
  userDocId: string;
  locationId: string;
  daycareId?: string | null;
};

const ENTRIES_COLLECTION = "entries";
const CHILDREN_COLLECTION = "children";

/* =========
 * Small helpers
 * ========= */

function isIsoDateTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// Attendance subtype → status key
function mapAttendanceStatus(
  sub: string | undefined
): "check_in" | "check_out" | undefined {
  if (sub === "Check in") return "check_in";
  if (sub === "Check out") return "check_out";
  return undefined;
}

// Sleep subtype helper
function isSleepStart(sub: string | undefined) {
  return sub === "Started";
}

/* =========
 * Fan-out helpers
 * ========= */

/**
 * When applyToAllInClass is true, expand to all children in that class.
 * Otherwise just return provided childIds.
 */
async function expandChildIds(item: EntryCreateInput): Promise<string[]> {
  const anyItem = item as any;

  if (!anyItem.applyToAllInClass || !anyItem.classId) {
    const ids = Array.isArray(anyItem.childIds) ? anyItem.childIds : [];
    return uniq(ids as string[]);
  }

  const snap = await db
    .collection(CHILDREN_COLLECTION)
    .where("classId", "==", anyItem.classId)
    .get();

  const classChildIds = snap.docs.map((d) => d.id);
  const explicitIds = Array.isArray(anyItem.childIds) ? anyItem.childIds : [];

  return uniq<string>([...explicitIds, ...classChildIds]);
}

/* =========
 * Validation / mapping
 * ========= */

/**
 * Validate one EntryCreateInput.
 * Returns error string if invalid, otherwise null.
 */
function validateItem(item: EntryCreateInput): string | null {
  const anyItem = item as any;

  if (!isIsoDateTime(anyItem.occurredAt)) {
    return "invalid_occurredAt";
  }

  const type = anyItem.type as EntryType;

  switch (type) {
    case "Attendance": {
      const sub = anyItem.subtype as string | undefined;
      if (!mapAttendanceStatus(sub)) {
        return "attendance_subtype_required";
      }
      break;
    }
    case "Food": {
      if (!anyItem.subtype) return "food_subtype_required";
      if (!String(anyItem.detail ?? "").trim()) {
        return "food_detail_required";
      }
      break;
    }
    case "Sleep": {
      if (!anyItem.subtype) return "sleep_subtype_required";
      break;
    }
    case "Toilet": {
      const tk = anyItem.toiletKind as string | undefined;
      if (tk !== "urine" && tk !== "bm") {
        return "toilet_kind_required";
      }
      break;
    }
    case "Activity":
    case "Note":
    case "Health": {
      if (!String(anyItem.detail ?? "").trim()) {
        return "detail_required";
      }
      break;
    }
    case "Photo": {
      if (!String(anyItem.photoUrl ?? "").trim()) {
        return "photo_url_required";
      }
      break;
    }
    default:
      return "unsupported_type";
  }

  if (anyItem.applyToAllInClass && !anyItem.classId) {
    return "classId_required_when_applyToAllInClass";
  }

  return null;
}

/**
 * Build base EntryDoc for one child.
 * Many fields are casted to any to avoid TS strictness.
 */
function buildDocBase(
  auth: AuthCtx,
  item: EntryCreateInput,
  childId: string
): EntryDoc {
  const anyItem = item as any;
  const nowIso = new Date().toISOString();

  const doc: any = {
    id: "", // will be filled with Firestore id
    daycareId: auth.daycareId ?? "",
    locationId: auth.locationId,
    classId: anyItem.classId ?? null,
    childId,
    childName: anyItem.childName ?? undefined,
    className: anyItem.className ?? undefined,

    createdByUserId: auth.userDocId,
    createdByRole: "teacher",
    createdAt: nowIso,

    occurredAt: anyItem.occurredAt,
    type: anyItem.type,

    data: {},
    detail: anyItem.detail ?? null,
    photoUrl: anyItem.photoUrl ?? null,

    visibleToParents: true,
    publishedAt: nowIso,
  };

  return doc as EntryDoc;
}

/**
 * Apply per-type mapping to EntryDoc (subtype, data fields, etc.).
 */
function applyTypeMapping(doc: EntryDoc, item: EntryCreateInput) {
  const anyItem = item as any;
  const anyDoc = doc as any;

  const type = anyItem.type as EntryType;

  switch (type) {
    case "Attendance": {
      const sub = anyItem.subtype as string | undefined;
      const status = mapAttendanceStatus(sub);
      anyDoc.subtype = sub ?? null;
      anyDoc.data = {
        ...(anyDoc.data || {}),
        status,
      };
      break;
    }
    case "Food": {
      anyDoc.subtype = anyItem.subtype ?? null;
      break;
    }
    case "Sleep": {
      const sub = anyItem.subtype as string | undefined;
      anyDoc.subtype = sub ?? null;
      const key = isSleepStart(sub) ? "start" : "end";
      anyDoc.data = {
        ...(anyDoc.data || {}),
        [key]: anyItem.occurredAt,
      };
      break;
    }
    case "Toilet": {
      const tk = anyItem.toiletKind;
      anyDoc.data = {
        ...(anyDoc.data || {}),
        toiletTime: anyItem.occurredAt,
        toiletKind: tk,
      };
      break;
    }
    case "Activity":
    case "Note":
    case "Health": {
      anyDoc.data = {
        ...(anyDoc.data || {}),
        text: String(anyItem.detail ?? ""),
      };
      break;
    }
    case "Photo": {
      // photoUrl already set
      break;
    }
  }
}

/* =========
 * Service
 * ========= */

/**
 * Bulk-create entries (teacher scope).
 * Also triggers daily report upsert using the newly created entries only.
 */
export async function bulkCreateEntriesService(
  auth: AuthCtx,
  payload: BulkEntryCreateRequest
): Promise<BulkEntryCreateResult> {
  const created: { id: string; type: EntryType }[] = [];
  const failed: { index: number; reason: string }[] = [];

  if (!auth.userDocId || !auth.locationId) {
    throw new Error("missing_auth_scope");
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    return { created, failed } as unknown as BulkEntryCreateResult;
  }

  // 1) validate items
  const validated: (EntryCreateInput | null)[] = items.map((item, index) => {
    const err = validateItem(item);
    if (err) {
      failed.push({ index, reason: err });
      return null;
    }
    return item;
  });

  // 2) build Firestore writes and collect EntryDocs
  const writeOps: {
    ref: FirebaseFirestore.DocumentReference;
    doc: EntryDoc;
  }[] = [];

  const newEntries: EntryDoc[] = [];

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
        const ref = db.collection(ENTRIES_COLLECTION).doc();
        const doc = buildDocBase(auth, item, childId);
        (doc as any).id = ref.id;

        applyTypeMapping(doc, item);

        writeOps.push({ ref, doc });
        newEntries.push(doc);
        created.push({
          id: ref.id,
          type: (item as any).type as EntryType,
        });
      }
    } catch (e: any) {
      failed.push({
        index: i,
        reason: String(e?.message || "expand_failed"),
      });
    }
  }

  // 3) commit in batches
  for (const part of chunk(writeOps, 450)) {
    const batch = db.batch();
    for (const op of part) {
      batch.set(op.ref, op.doc as any);
    }
    await batch.commit();
  }

  // 4) update / create dailyReports for the affected children+dates
  try {
    await upsertDailyReportsForEntries(newEntries, {
      makeVisibleToParents: true,
    });
  } catch (e) {
    console.error("upsertDailyReportsForEntries error:", e);
    // do not fail the main API; entries are already written
  }

  return {
    created,
    failed,
  } as unknown as BulkEntryCreateResult;
}
