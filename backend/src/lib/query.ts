import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

export async function fetchMyChildren() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(collection(db, "children"), where("guardianUids", "array-contains", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeMyChildren(cb: (rows: any[]) => void) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, "children"), where("guardianUids", "array-contains", uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
