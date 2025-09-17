import { db } from "./firebase";
import { addDoc, collection, serverTimestamp, doc, setDoc } from "firebase/firestore";

export async function createChild(input: { name: string; dob?: string; classroomId?: string; status?: string }) {
  const payload = {
    name: input.name.trim(),
    dob: input.dob || "",
    classroomId: input.classroomId || "",
    status: input.status || "enrolled",
    guardianUids: [],
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "children"), payload);
  return ref.id;
}

export async function createParentInvite(email: string, childId: string) {
  const e = email.trim().toLowerCase();
  if (!e) return;
  const ref = doc(collection(db, "invites"));
  await setDoc(ref, {
    email: e,
    role: "parent",
    childIds: [childId],
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
