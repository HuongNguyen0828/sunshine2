import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "./firebase";
import { db } from "./firebase";

export async function registerUser(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  if (name.trim()) {
    try { await updateProfile(cred.user, { displayName: name.trim() }); } catch {}
  }
  await setDoc(
    doc(db, "users", cred.user.uid),
    {
      role: null, // role is set after by admin for testing and being default to null. After web-admin working with add parent and teacher, role is signed by admin UI
      name: name.trim(),
      email: cred.user.email, // just for testing. Later, we must check if email is exist inside of userDetail collection, created by admin
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return cred.user;
}

export async function signIn(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function signOutUser() {
  await signOut(auth);
}

export function onUserChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}