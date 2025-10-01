import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import AsyncStorage from "@react-native-async-storage/async-storage"; // equivenlent to local storage in web-admin
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
  try {
    // 1. Firebase Auth login
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // 2. Get ID token
    const idToken = await userCredential.user.getIdToken();

    // 3. Call backend to get role
    const res = await fetch(`${BASE_URL}/auth/get-mobile`, {
      method: "GET",
      // Input Header autherization inside Request extended
      headers: { Authorization: `Bearer ${idToken}` },
    });

    // Case not Admin
    if (!res.ok) {
      // Extract message from respond: custome with role-based or general message
      const errData = await res.json();
      throw new Error(errData.message || "Access denied");
    }
    // else, Case: Admin
    const data = await res.json();

    // 4. Store role in cache/localStorage (for reduce fetching check-role and user once they login)
    await AsyncStorage.setItem("userRole", data.user.role);
    // const role = await AsyncStorage.getItem("userRole");

  } catch (error: any) {
    // Error from Frontend: Firebase Auth errors with signInWithEmailAndPassword
    if (error.code === "auth/invalid-credential")  throw new Error("Invalid Email or Password");
    // else, error from role-base
    throw error;
  }
}

export async function signOutUser() {
  await signOut(auth);
  // Clear user from AsyncStorage
  await AsyncStorage.removeItem("userRole");
}

// Listener when user changed instead of using AuthContext
export function onUserChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
