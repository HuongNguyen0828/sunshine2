// mobile/features/children.ts
import { db } from "@/lib/firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/** Find a user uid by email from users collection */
export async function getUidByEmail(email: string): Promise<string | null> {
  // NOTE: requires users/{uid} documents to include an "email" field
  const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/** Create a child and attach an initial guardian (teacher can pass a parent uid or leave empty) */
export async function createChildForParent({
  name,
  dob, // "YYYY-MM-DD"
  classroomId,
  parentUid, // optional: if provided, added to guardianUids
}: {
  name: string;
  dob?: string;
  classroomId?: string;
  parentUid?: string;
}) {
  const payload: any = {
    name: name.trim(),
    dob: dob || null,
    classroomId: classroomId || null,
    guardianUids: parentUid ? [parentUid] : [],
    status: "enrolled",
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, "children"), payload);
  return docRef.id;
}

/** Link an existing child to a parent by email (arrayUnion) */
export async function linkChildToParentEmail({
  childId,
  parentEmail,
}: {
  childId: string;
  parentEmail: string;
}) {
  const uid = await getUidByEmail(parentEmail);
  if (!uid) throw new Error("Parent email not found");
  await updateDoc(doc(db, "children", childId), {
    guardianUids: arrayUnion(uid),
  });
  return uid;
}
