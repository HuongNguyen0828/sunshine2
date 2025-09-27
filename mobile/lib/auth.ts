import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  IdTokenResult,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

import { Platform } from "react-native";

// Remove Firestore access to shift login into backend
  // import { doc, setDoc, serverTimestamp } from "firebase/firestore";
  // import { db } from "./firebase";

// End point varied due to emulator(EITHER iso or android ) or Real device
const BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
// For real device
// const BASE_URL = "http://192.168.x.y:5000"; // your PC IP

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  try {
     // Step 1: check email
    const res = await fetch(`${BASE_URL}/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Only respond ok is valid email: throw error for external users
    if (!res.ok) throw new Error("Email not authorized. Your daycare need register with Sunshine");

    // Step 2: If valid user, create Firebase Authentication user
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );

    // Update display name
    if (name.trim()) {
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch {}
    }
    // Step 3: Verify role in backend, and create users collection with same uid
      const idToken = await cred.user.getIdToken();
      await fetch(`${BASE_URL}/auth/verify-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name }),
      });
  }
  catch(error: any) {
    if(error.code == "auth/email-already-in-use") throw new Error("Already existing email. Please login or use other email");
    throw error;
  }
}

// Need to be in try-catch block: handle specific error
export async function signIn(email: string, password: string) {
  // return await signInWithEmailAndPassword(auth, email, password);

  // check user role from Firebase custom claims
  const checkUserRole = async (user: User) => {
    // if no user,
    if (!user) {
      return null;
    }

    try {
      const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as string | undefined;
      return role || null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const role = await checkUserRole(userCredential.user);
    //Check the role here
    if (role == null) {
      await signOutUser();
      const accessError = new Error("Wait to assign role.");
      accessError.name = "AccessDeniedError"; // custom error type
      throw accessError;
    }
  } catch (error: any) {
    // Handle specific Firebase auth errors
    if (error.code === "auth/invalid-credential") {
      throw new Error("Email or password is incorrect.");
      // } else if (error.name == "AccessDeniedError") throw error;
    } else {
      console.error("Sign in error:", error);
      throw new Error(error.message);
    }
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function onUserChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
