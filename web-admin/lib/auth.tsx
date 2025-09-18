// src/lib/auth.tsx
'use client';
import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, User, IdTokenResult} from "firebase/auth";
import app  from "./firebase"; // your firebase web config



interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  userLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  isAdmin: boolean;
  userRole: string | null;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const auth = getAuth(app);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] =  useState(false);
  // Checking admin status to authorize admin routes
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  

  // check user role from Firebase custom claims: currently only "admin" role is used
  const checkUserRole = async (user: User) => {
    // if no user, reset role and admin status
    if (!user) {
      setUserRole(null);
      setIsAdmin(false);
      return false;
    }

    try {
      const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as string | undefined;
      setUserRole(role || null);
      setIsAdmin(role === "admin");
      return role === "admin";
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
      setIsAdmin(false);
      return false;
    }
  }

  // Listen for auth state changes: depends on Firebase auth state and user change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setUserLoggedIn(!!user);

      // Check user role when auth state changes
      checkUserRole(user as User);
      // set loading to false after auth state is determined
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Sign in with email & password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const isAdminStatus = await checkUserRole(userCredential.user);
      // Check if user has admin role AFTER successful sign-in
      // If not admin, sign them out and show error
      if (!isAdminStatus) {
        await signOut(auth);

        // Register error to be caught in the signIn function
        const accessError = new Error("Access denied. Admin privileges required.");
        accessError.name = "AccessDeniedError"; // custom error type
        throw accessError;
      }

    } catch (error: any) {
      // Handle specific Firebase auth errors
      if (error.code === "auth/invalid-credential") {
        throw new Error("Email or password is incorrect.");

      // Handle custom access denied error
      } else if (error.name === "AccessDeniedError") {
        throw error; // re-throw access denied error
      } else {
        console.error("Sign in error:", error);
        throw new Error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };


  // Sign up with name, email & password
  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        // Update display name
        await updateProfile(userCredential.user, { displayName: name });
        // Optionally, set custom claims via a backend function here
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      throw new Error(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  // Sign out
  const signOutUser = async () => {
    await signOut(auth);
    // Reset state on sign out
    setUserRole(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, userLoggedIn, signIn, isAdmin, userRole, signOutUser, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};