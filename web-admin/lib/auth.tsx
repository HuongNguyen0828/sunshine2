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
import { FirebaseError } from "firebase/app";
import { useRouter } from "next/navigation";
import app from "./firebase";

/** Public shape of the Auth context */
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  isAdmin: boolean;
  userRole: string | null;
  signOutUser: () => Promise<void>;
}

/** Backend response types (adjust if your API differs) */
type CheckEmailResponse = { role: string };
type GetAdminResponse = { user: { role: string } };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = getAuth(app);
  const router = useRouter(); // App Router navigation (client-only)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  /** Keep Firebase Auth state in sync with React state */
  useEffect(() => {
    // Optional: rehydrate role from localStorage before first render
    const cachedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (cachedRole) {
      setUserRole(cachedRole);
      setIsAdmin(cachedRole === "admin");
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);

      // When signed out, clear cached role state as well
      if (!user) {
        setUserRole(null);
        setIsAdmin(false);
        localStorage.removeItem("userRole");
      }
    });
    return () => unsubscribe();
  }, [auth]);

  /** Sign up:
   *  1) Check email with backend
   *  2) Create Firebase user
   *  3) Tell backend to verify/set role and create profile
   */
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // 1) Email check against backend policy
      const res = await fetch("http://localhost:5000/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error("Email not authorized. Your daycare must register with Sunshine.");
      }
      const { role } = (await res.json()) as CheckEmailResponse;
      // (role is available if you need to branch UX here)

      // 2) Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      // 3) Ask backend to verify role / create user document
      const idToken = await cred.user.getIdToken();
      await fetch("http://localhost:5000/auth/verify-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name }),
      });
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/email-already-in-use") {
          throw new Error("Email already exists. Please login or use another email.");
        }
      }
      if (err instanceof Error) throw err;
      throw new Error("Unknown error during sign up.");
    }
  };

  /** Sign in:
   *  1) Firebase sign-in
   *  2) Get ID token
   *  3) Ask backend if this user is admin (protected route)
   *  4) Cache role locally
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("http://localhost:5000/auth/get-admin", {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        let message = "Access denied";
        try {
          const data = (await res.json()) as Partial<{ message: string }>;
          if (data.message) message = data.message;
        } catch {
          // ignore JSON parse error
        }
        throw new Error(message);
      }

      const data = (await res.json()) as GetAdminResponse;
      localStorage.setItem("userRole", data.user.role);
      setUserRole(data.user.role);
      setIsAdmin(data.user.role === "admin");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/invalid-credential") {
          throw new Error("Invalid Email or Password");
        }
      }
      if (err instanceof Error) throw err;
      throw new Error("Unknown error during sign in.");
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
