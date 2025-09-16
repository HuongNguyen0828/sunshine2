import { db } from "../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function checkIn({ childId, staffId }: { childId: string; staffId: string }) {
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Attendance", subtype: "check in", createdAt: serverTimestamp() });
}

export async function checkOut({ childId, staffId }: { childId: string; staffId: string }) {
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Attendance", subtype: "Check-out", createdAt: serverTimestamp() });
}

export async function addMeal({ childId, staffId, menu }: { childId: string; staffId: string; menu: string[] }) {
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Food", detail: { menu }, createdAt: serverTimestamp() });
}

export async function addNap({ childId, staffId, minutes }: { childId: string; staffId: string; minutes: number }) {
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Sleep", detail: { duration_min: minutes }, createdAt: serverTimestamp() });
}

export async function addNote({ childId, staffId, text }: { childId: string; staffId: string; text: string }) {
  await addDoc(collection(db, "entries"), { childId, staffId, type: "Note", detail: { text }, createdAt: serverTimestamp() });
}
