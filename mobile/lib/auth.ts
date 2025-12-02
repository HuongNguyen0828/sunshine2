// mobile/lib/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// const BASE_URL =
  // Platform.OS === "android"
  //   ? "http://10.0.2.2:5001/api/mobile"
  //   : "http://localhost:5001/api/mobile";
  const BASE_URL = Platform.OS === "android" || Platform.OS === "ios"
  ? `${process.env.EXPO_PUBLIC_API_URL}/api/mobile` //replace with your computer LAN IP
  : "http://localhost:5001/api/mobile"; // fallback for web

const norm = (v: string) => v.trim().toLowerCase();
const isAllowedRole = (r?: unknown) => r === "teacher" || r === "parent";

/** Robust POST helper that never crashes on non-JSON responses and surfaces backend reason */
async function postJSON(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  let payload: any = null;
  const text = await res.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const reason =
      payload?.reason || payload?.message || payload?.raw || `HTTP ${res.status}`;
    const err = new Error(String(reason));
    (err as any).status = res.status;
    (err as any).payload = payload;
    throw err;
  }
  return payload;
}

function fbErr(code?: string, message?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email format.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-disabled":
      return "Account is disabled. Contact support.";
    case "auth/user-not-found":
      return "No account found with that email.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return message || "Authentication failed.";
  }
}

/** Registration flow: precheck → create Auth user → complete → refresh claims */
export async function registerWithPassword(
  name: string,
  email: string,
  password: string
) {
  const emailLower = norm(email);

  // 1) backend precheck (checks: email match, role=teacher/parent, status=Active, isRegistered=false, has locationId)
  const pre = await postJSON(`${BASE_URL}/v1/registration/precheck`, {
    emailLower,
  });
  if (!pre?.allowed) {
    const reason =
      pre?.reason || "Registration not allowed. Contact your daycare.";
    throw new Error(reason);
  }

  // 2) create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, emailLower, password);

  if (name.trim()) {
    try {
      await updateProfile(cred.user, { displayName: name.trim() });
    } catch {
      // non-critical
    }
  }

  // 3) complete registration (sets custom claims + marks isRegistered=true)
  const idToken = await cred.user.getIdToken();
  const complete = await postJSON(
    `${BASE_URL}/v1/registration/complete`,
    { emailLower, authUid: cred.user.uid, provider: "password" },
    { Authorization: `Bearer ${idToken}` }
  );
  if (!complete?.ok) {
    const reason = complete?.reason || "Could not finalize registration.";
    throw new Error(reason);
  }

  // 4) refresh token to pick up claims, cache role for faster boot
  await cred.user.getIdToken(true);
  const tok = await cred.user.getIdTokenResult();
  const role = tok.claims?.role as string | undefined;

  if (!isAllowedRole(role)) {
    await signOut(auth);
    throw new Error("Mobile access is limited to teacher or parent accounts.");
  }

  await AsyncStorage.setItem("userRole", role!);
  return cred.user;
}

/** Sign in: refresh claims and allow only teacher/parent */
export async function signIn(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, norm(email), password);
    await cred.user.getIdToken(true);
    const tok = await cred.user.getIdTokenResult();
    const role = tok.claims?.role as string | undefined;

    if (!isAllowedRole(role)) {
      await signOut(auth);
      throw new Error("Mobile access is limited to teacher or parent accounts.");
    }

    await AsyncStorage.setItem("userRole", role!);
    return cred.user; // return User so callers can route by claims
  } catch (e: any) {
    throw new Error(fbErr(e?.code, e?.message));
  }
}

export async function signOutUser() {
  await signOut(auth);
  await AsyncStorage.removeItem("userRole");
}

export function onUserChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
