"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import app from "./firebase";
import Cookies from "js-cookie";

/** Public shape of the Auth context */
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  isAdmin: boolean;
  userRole: string | null;
  signOutUser: () => Promise<void>;
}

/** Backend response types (adjust if your API differs) */
type CheckEmailResponse = { role: string };
type GetAdminResponse = { user: { role: string } };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Type guards and helpers for error handling */
function isFirebaseError(e: unknown): e is FirebaseError {
  return typeof e === "object" && e !== null && "code" in e;
}
function isRecord(e: unknown): e is Record<string, unknown> {
  return typeof e === "object" && e !== null;
}
function errorMessage(e: unknown): string {
  if (isRecord(e) && typeof e.message === "string") return e.message;
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/** Ensure JSON response or throw readable error */
async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (ct.includes("application/json")) {
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const msg =
        typeof data.message === "string"
          ? data.message
          : `[${res.status}] Request failed`;
      throw new Error(msg);
    }
    const text = await res.text();
    throw new Error(`[${res.status}] ${text.slice(0, 200)}`);
  }

  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const auth = getAuth(app);
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Development bypass (skip backend role checks)
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

  /** Keep Firebase Auth state in sync with React state */
  useEffect(() => {
    const cachedRole = Cookies.get("userRole");
    if (cachedRole) {
      setUserRole(cachedRole);
      setIsAdmin(cachedRole === "admin");
    }
    // Determine initial auth state: when user already login and idToken valid and not expired
    // onAuthStateChanged will be triggered right away with current user (or null)
    // We wait for that before marking loading=false
    const unsubscribe = onAuthStateChanged(auth, (user) => {

      const idToken = Cookies.get("idToken");
      if (idToken) {
        // Verify token with backend
        setCurrentUser(user);
        setLoading(false);
      } else {
        setUserRole(null);
        setIsAdmin(false);
        if (typeof window !== "undefined") {
          Cookies.remove("userRole");
          Cookies.remove("idToken");
          Cookies.remove("uid");
        }
      }
    });
    return () => unsubscribe();
  }, [auth, bypassAuth]);

  /**
   * Sign up flow:
   * 1) Check email with backend
   * 2) Create Firebase user
   * 3) Verify role on backend and create user profile
   */
  const signUp = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      console.log("\n🚀 [Frontend SignUp] Starting signup");
      console.log(`  Name: ${name}`);
      console.log(`  Email: ${email}`);

      // Step 1: email check
      console.log("  Step 1: Checking email against backend...");
      const check = await fetchJson<CheckEmailResponse>("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      console.log(`  ✅ Authorized role: ${check.role}`);

      // Step 2: create Firebase user
      console.log("  Step 2: Creating Firebase user...");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      console.log(`  ✅ Firebase user created: ${cred.user.uid}`);

      // Step 3: verify role + create profile in backend
      console.log("  Step 3: Verifying role & creating profile...");
      const idToken = await cred.user.getIdToken();
      const verify = await fetchJson<{ ok: true }>("/api/auth/verify-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name }),
      });
      console.log("  ✅ Signup complete", verify);
    } catch (error: unknown) {
      console.log("  ❌ Signup error:", error);
      if (isFirebaseError(error) && error.code === "auth/email-already-in-use") {
        throw new Error(
          "Already existing email. Please login or use other email"
        );
      }
      throw new Error(errorMessage(error));
    }
  };

  /**
   * Sign in flow:
   * 1) Firebase signIn
   * 2) Get ID token from returned user
   * 3) Ask backend for role (or bypass in dev)
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      console.log("\n🔐 [Frontend SignIn] Starting");
      console.log(`  Email: ${email}`);

      // Step 1: Firebase signIn
      console.log("  Step 1: Firebase auth...");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log(`  ✅ Firebase OK. UID: ${cred.user.uid}`);

      // Step 2: get token from returned user
      console.log("  Step 2: Getting ID token...");
      const idToken = await cred.user.getIdToken();
      console.log("  ✅ Token ready");

      // Step 3: role from backend (or bypass)
      let role: string;
      if (bypassAuth) {
        console.log("  ⚠️ Bypass mode: force role=admin");
        role = "admin";
      } else {
        console.log("  Step 3: Calling backend /api/auth/get-admin ...");
        const data = await fetchJson<GetAdminResponse>("/api/auth/get-admin", {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        role = data.user.role;
        console.log("  ✅ Backend role:", role);
      }

      if (typeof window !== "undefined") {
        Cookies.set("userRole", role, { expires: 7 });
        Cookies.set("idToken", idToken, { expires: 7 });
        Cookies.set("uid", cred.user.uid, { expires: 7 });
      }
      setUserRole(role);
      setIsAdmin(role === "admin");
      console.log("  ✅ Sign in complete");
    } catch (error: unknown) {
      console.log("  ❌ Sign in error:", error);
      if (isFirebaseError(error) && error.code === "auth/invalid-credential") {
        throw new Error("Invalid Email or Password");
      }
      throw new Error(errorMessage(error));
    }
  };

  /** Full sign out: clear Firebase session + local role state */
  const signOutUser = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserRole(null);
    setIsAdmin(false);
    if (typeof window !== "undefined") {
      Cookies.remove("userRole");
      Cookies.remove("idToken");
      Cookies.remove("uid");
    }
    router.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signIn,
        signUp,
        isAdmin,
        userRole,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/** Hook to consume the Auth context safely */
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
