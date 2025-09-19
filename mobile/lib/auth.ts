import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  IdTokenResult,
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


// Need to be in try-catch block: handle specific error
export async function signIn(email: string, password: string) {

    return await signInWithEmailAndPassword(auth, email, password);


  // // check user role from Firebase custom claims
  // const checkUserRole = async (user: User) => {
  //   // if no user, reset role and admin status
  //   if (!user) {
  //     return null;
  //   }

  //   try {
  //     const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
  //     const role = idTokenResult.claims.role as string | undefined;
  //     return role || null;

  //   } catch (error) {
  //     console.error("Error fetching user role:", error);
  //     return null;
  //   }
  // }
  
  // try {
  //   const userCredential = await signInWithEmailAndPassword(auth, email, password);  
    
  //   const role = await checkUserRole(userCredential.user);
  //   //  Check the role here
  //   if (role == null) {
  //     await signOutUser();
  //       const accessError = new Error("Wait to assign role.");
  //       accessError.name = "AccessDeniedError"; // custom error type
  //       throw accessError;
  //   }
    
  // } catch (error: any) {
  //   // Handle specific Firebase auth errors
  //   if (error.code === "auth/invalid-credential") {
  //     throw new Error("Email or password is incorrect.");
  //   } else if (error.name == "AccessDeniedError") throw error;
  //   else {
  //     console.error("Sign in error:", error);
  //     throw new Error(error.message);
  //   }
  // }

}

export async function signOutUser() {
  await signOut(auth);
}

export function onUserChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}