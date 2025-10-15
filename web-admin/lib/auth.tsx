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

// Is the user from middleware 
type GetAdminResponse = { user: { uid: string, email: string, role: string, daycareID: string, locationId: string} };

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
  
  /** Keep Firebase Auth state in sync with React state */
  useEffect(() => {
   
    // Determine initial auth state: when user already login and idToken valid and not expired
    // onAuthStateChanged will be triggered right away with current user (or null)
    // We wait for that before marking loading=false
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      const idToken = Cookies.get("idToken");
      if (idToken) {
        // Verify token with backend
        setCurrentUser(user);
        const cachedRole = Cookies.get("userRole");
        if (cachedRole) {
          setUserRole(cachedRole);
          setIsAdmin(cachedRole === "admin");
        }
      } else {
        setUserRole(null);
        setIsAdmin(false);
        if (typeof window !== "undefined") {
          Cookies.remove("userRole");
          Cookies.remove("idToken");
          Cookies.remove("uid");
        }
      }
      setLoading(false); // always mark done at the end
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

      // 1) Email check against backend policy
      console.log('  Step 1: Checking email with backend...');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-email`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include", // add this matching with CORS
      });
      console.log(`  ✅ Authorized role: ${check.role}`);

      // Only respond ok is valid email
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message)
      }
      const { role } = await res.json(); // get the role: example: role: "parent"

      // Step 2: create Firebase Authentication user
      console.log('  Step 2: Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, { displayName: name });

      // Step 3: Verify role in backend, and create users collection with same uid
      console.log('  Step 3: Verifying role and creating user profile...');
      const idToken = await userCredential.user.getIdToken();

      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name }),
      });

      console.log(`  Response status: ${verifyRes.status}`);

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        throw new Error(errorData.message);
      }

    } catch (error: any) {
      if(error.code == "auth/email-already-in-use") throw new Error("Already existing email. Please login or use other email");
      throw error;

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
      // 1. Firebase Auth login
      console.log('  Step 1: Authenticating with Firebase...');
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 2. Get ID token
      const idToken = await userCredential.user.getIdToken();

      // 3. Call backend to get role

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/get-admin`, {
        method: "GET",
        // Input Header autherization inside Request extended
        headers: { Authorization: `Bearer ${idToken}` },
      });

      console.log(`  Response status: ${res.status}`);

      // Case not Admin
      if (!res.ok) {
        // Extract message from respond: custome with role-based or general message
        const errData = await res.json();
        console.log('Access denied:', errData.message);
        throw new Error(errData.message || "Access denied");
      }
      // else, Case: Admin
      const data = await res.json();
      const uid = data.user.uid;
      // 4. Store user in cache/localStorage (for reduce fetching check-role and user once they login)
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userId", uid);

      // Updating AuthContext: On reload, rehydrate from localStorage.
      setUserRole(data.user.role);
      setIsAdmin(data.user.role === "admin");

    } catch (error: any) {
      // Error from Frontend: Firebase Auth errors with signInWithEmailAndPassword
      if (error.code === "auth/invalid-credential")  throw new Error("Invalid Email or Password");
      // else, error from role-base
      throw error;
    }
  };

  /** Full sign out: clear Firebase session + local role state */
  const signOutUser = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserRole(null);
    setIsAdmin(false);
    localStorage.removeItem("userRole");
    // Redirect after logout (comment out if you prefer page-guard redirection)
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
