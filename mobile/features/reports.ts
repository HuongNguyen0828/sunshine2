import { db } from "../lib/firebase";
import { collection, getDocs, orderBy, query, where, Timestamp } from "firebase/firestore";
import { Entry } from "./types";

export async function getDailyReport(childId: string, dateISO: string) {
  const start = new Date(dateISO + "T00:00:00");
  const end = new Date(dateISO + "T23:59:59");
  const q = query(
    collection(db, "entries"),
    where("childId", "==", childId),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<=", Timestamp.fromDate(end)),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  const entries: Entry[] = snap.docs.map((d) => {
    const v = d.data() as any;
    return {
      id: d.id,
      childId: v.childId,
      staffId: v.staffId,
      type: v.type,
      subtype: v.subtype,
      note: v.detail?.text,
      photoUrl: v.photoUrl,
      createdAt: v.createdAt?.toDate?.() ? v.createdAt.toDate().toISOString() : new Date().toISOString()
    };
  });
  return { date: dateISO, entries };
}
