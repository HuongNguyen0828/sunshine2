import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

// Fetches the list of children for the currently logged-in parent.
export async function fetchMyChildren() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(collection(db, "children"), where("guardianUids", "array-contains", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// Calls the callback with the list of children and re-calls it whenever the list changes.
// Returns an unsubscribe function to stop listening for changes.
export function subscribeMyChildren(cb: (rows: any[]) => void) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    cb([]);
    // If no user is logged in, return a no-op unsubscribe function
    return () => {};
  }
  const q = query(collection(db, "children"), where("guardianUids", "array-contains", uid));
  // Listen for updates to the query
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
