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
  signUp: ( name: string, email: string, password: string) => Promise<void>;
  isAdmin: boolean;
  userRole: string | null;
  signOutUser: () => Promise<void>;
}

/** Backend response types (adjust if your API differs) */
type CheckEmailResponse = { role: string };
type GetAdminResponse = { user: { role: string } };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const auth = getAuth(app);
  const router = useRouter(); // App Router navigation (client-only)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Development bypass
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

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
  }, [auth, bypassAuth]);

  /** Sign up:
   *  1) Check email with backend
   *  2) Create Firebase user
   *  3) Tell backend to verify/set role and create profile
   */
  const signUp = async (name: string, email: string, password: string ) => {
    try {
      console.log('\n🚀 [Frontend SignUp] Starting signup process...');
      console.log(`  Name: ${name}`);
      console.log(`  Email: ${email}`);

      // 1) Email check against backend policy
      console.log('  Step 1: Checking email with backend...');
      const res = await fetch("http://localhost:5001/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include", // 👈 add this
      });

      console.log(`  Response status: ${res.status}`);

      // Only respond ok is valid email
      if (!res.ok) {
        const errorData = await res.json();
        console.log('  ❌ Email check failed:', errorData.message);
        throw new Error(errorData.message)
      }
      const { role } = await res.json(); // get the role: example: role: "parent"
      console.log(`  ✅ Email authorized as: ${role}`);

      // Step 2: create Firebase Authentication user
      console.log('  Step 2: Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(`  ✅ Firebase user created with UID: ${userCredential.user.uid}`);

      await updateProfile(userCredential.user, { displayName: name });
      console.log(`  ✅ Display name set to: ${name}`);

      // Step 3: Verify role in backend, and create users collection with same uid
      console.log('  Step 3: Verifying role and creating user profile...');
      const idToken = await userCredential.user.getIdToken();
      console.log('  Got ID token, sending to backend...');

      const verifyRes = await fetch("http://localhost:5001/auth/verify-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name }),
      });

      console.log(`  Response status: ${verifyRes.status}`);

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json();
        console.log('  ❌ Role verification failed:', errorData.message);
        throw new Error(errorData.message);
      }

      const verifyData = await verifyRes.json();
      console.log('  ✅ Signup complete!', verifyData);

    } catch (error: any) {
      console.log('  ❌ Signup error:', error);
      if(error.code == "auth/email-already-in-use") throw new Error("Already existing email. Please login or use other email");
      throw error;

    }

  };

  // Sign in:
  // 4 cases:
  // Case 1: user is extenal of our system: email doesn't exist-> throw error: Unrecognized email.  Your daycare registered with Sunshine to signUp and login
  // Case 2: user is parent or teacher: throw error: Hello, parent (teacher), please login in Sunshine mobile app
  // Case 3. user is admin, entering wrong password: throw error: Hello admin, Invalid passowrd
  // Case 4. Success: user is admin and all correct: redirect into dashboard.
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      console.log('\n🔐 [Frontend SignIn] Starting sign in process...');
      console.log(`  Email: ${email}`);

      // 1. Firebase Auth login
      console.log('  Step 1: Authenticating with Firebase...');
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(`  ✅ Firebase auth successful. UID: ${userCredential.user.uid}`);

      // 2. Get ID token
      console.log('  Step 2: Getting ID token...');
      const idToken = await userCredential.user.getIdToken();
      console.log('  ✅ ID token retrieved');

      // 3. Call backend to get role
      console.log('  Step 3: Verifying admin role with backend...');
      const res = await fetch("http://localhost:5001/auth/get-admin", {
        method: "GET",
        // Input Header autherization inside Request extended
        headers: { Authorization: `Bearer ${idToken}` },
      });

      console.log(`  Response status: ${res.status}`);

      // Case not Admin
      if (!res.ok) {
        // Extract message from respond: custome with role-based or general message
        const errData = await res.json();
        console.log('  ❌ Access denied:', errData.message);
        throw new Error(errData.message || "Access denied");
      }
      // else, Case: Admin
      const data = await res.json();
      console.log('  ✅ Admin access granted. Role:', data.user.role);

      // 4. Store role in cache/localStorage (for reduce fetching check-role and user once they login)
      localStorage.setItem("userRole", data.user.role);
      console.log('  ✅ Role stored in localStorage');

      // Updating AuthContext: On reload, rehydrate from localStorage.
      setUserRole(data.user.role);
      setIsAdmin(data.user.role === "admin");
      console.log('  ✅ Sign in complete!');

    } catch (error: any) {
      console.log('  ❌ Sign in error:', error);
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
