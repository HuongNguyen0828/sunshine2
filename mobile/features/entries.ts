// mobile/features/entries.ts
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, setDoc } from "firebase/firestore";

/**
 * Writes a new entry AND updates the child's current status in status/{childId}.
 * Suggested status schema per child:
 * {
 *   attendance?: { state: "In" | "Out"; at: Timestamp },
 *   meal?:       { menu: string[]; at: Timestamp },
 *   nap?:        { duration_min: number; at: Timestamp },
 *   toilet?:     { note?: string; at: Timestamp },
 * }
 */

export async function checkIn({ childId, staffId }: { childId: string; staffId: string }) {
  const at = serverTimestamp();
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Attendance", subtype: "Check in", createdAt: at });
  await setDoc(doc(db, "status", childId), { attendance: { state: "In", at } }, { merge: true });
}

export async function checkOut({ childId, staffId }: { childId: string; staffId: string }) {
  const at = serverTimestamp();
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Attendance", subtype: "Check out", createdAt: at });
  await setDoc(doc(db, "status", childId), { attendance: { state: "Out", at } }, { merge: true });
}

export async function addMeal({ childId, staffId, menu }: { childId: string; staffId: string; menu: string[] }) {
  const at = serverTimestamp();
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Food", detail: { menu }, createdAt: at });
  await setDoc(doc(db, "status", childId), { meal: { menu, at } }, { merge: true });
}

export async function addNap({ childId, staffId, minutes }: { childId: string; staffId: string; minutes: number }) {
  const at = serverTimestamp();
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Nap", detail: { duration_min: minutes }, createdAt: at });
  await setDoc(doc(db, "status", childId), { nap: { duration_min: minutes, at } }, { merge: true });
}

export async function addToilet({ childId, staffId, note }: { childId: string; staffId: string; note?: string }) {
  const at = serverTimestamp();
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Toilet", detail: { note }, createdAt: at });
  await setDoc(doc(db, "status", childId), { toilet: { note, at } }, { merge: true });
}

export async function addNote({ childId, staffId, text }: { childId: string; staffId: string; text: string }) {
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Note", detail: { text }, createdAt: serverTimestamp() });
}
