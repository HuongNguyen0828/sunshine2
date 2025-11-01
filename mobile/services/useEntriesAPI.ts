// mobile/services/useEntriesAPI.ts
import { addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type {
  EntryCreateInput,
  EntryType,
  EntryFilter,
} from "../../shared/types/type";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; reason?: string };
export type ApiRes<T> = Ok<T> | Err;

const ENTRIES_COL = "entries";

const NEEDS_SUBTYPE: EntryType[] = ["Attendance", "Food", "Sleep", "Toilet"];
const NEEDS_DETAIL: EntryType[] = ["Schedule_note", "Supply Request", "Photo"];
const NEEDS_PHOTO: EntryType[] = ["Photo"];

function validatePayload(p: EntryCreateInput): string | null {
  if (!p.childIds?.length) return "At least one child is required";
  if (NEEDS_SUBTYPE.includes(p.type as EntryType) && !(p as any).subtype) return "Subtype is required";
  if (NEEDS_PHOTO.includes(p.type as EntryType) && !(p as any).photoUrl) return "Photo URL is required";
  if (NEEDS_DETAIL.includes(p.type as EntryType) && !(p as any).detail?.trim()) return "Detail is required";
  return null;
}

export async function createEntries(items: EntryCreateInput[]): Promise<ApiRes<{ ids: string[] }>> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return { ok: false, reason: "Not authenticated" };

    const ids: string[] = [];
    for (const it of items) {
      const err = validatePayload(it);
      if (err) return { ok: false, reason: err };

      const ref = await addDoc(collection(db, ENTRIES_COL), {
        type: it.type,
        subtype: (it as any).subtype ?? null,
        childIds: it.childIds,
        classId: it.classId ?? null,
        detail: (it as any).detail ?? null,
        photoUrl: (it as any).photoUrl ?? null,
        staffId: uid,
        createdAt: serverTimestamp(),
      });
      ids.push(ref.id);
    }
    return { ok: true, data: { ids } };
  } catch (e: any) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

export async function createEntriesPerChild(item: EntryCreateInput): Promise<ApiRes<{ ids: string[] }>> {
  try {
    const pieces = item.childIds.map((cid) => ({ ...item, childIds: [cid] }));
    return createEntries(pieces);
  } catch (e: any) {
    return { ok: false, reason: String(e?.message || e) };
  }
}

export async function listEntries(filter: EntryFilter = {}): Promise<ApiRes<any[]>> {
  try {
    const conds = [];
    if (filter.childId) conds.push(where("childIds", "array-contains", filter.childId));
    if (filter.classId) conds.push(where("classId", "==", filter.classId));
    if (filter.type) conds.push(where("type", "==", filter.type));
    const q = query(collection(db, ENTRIES_COL), ...conds, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => {
      const x = d.data() as any;
      const createdAtIso =
        x.createdAt instanceof Timestamp ? x.createdAt.toDate().toISOString() : String(x.createdAt ?? "");
      return { id: d.id, ...x, createdAt: createdAtIso };
    });
    return { ok: true, data: rows };
  } catch (e: any) {
    return { ok: false, reason: String(e?.message || e) };
  }
}
