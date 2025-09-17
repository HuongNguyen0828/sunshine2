// src/lib/auth.tsx
'use client';
import React, { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, IdTokenResult} from "firebase/auth";
import app  from "./firebase"; // your firebase web config



interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  userLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

  

  // check user role from Firebase custom claims
  const checkUserRole = async (user: User) => {
    // if no user, reset role and admin status
    if (!user) {
      setUserRole(null);
      setIsAdmin(false);
      return false;
    }

    try {
      const idTokenResult: IdTokenResult = await user.getIdTokenResult();
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

  // Listen for auth state changes
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
      
      // Check if user has admin role AFTER successful sign-in
      const adminStatus = await checkUserRole(userCredential.user);
      
      if (!adminStatus) {
        // If not admin, sign them out and show error
        await signOut(auth);
        throw new Error("Access denied. Admin privileges required.");
      }
      
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw new Error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOutUser = async () => {
    await signOut(auth);
    // Reset state on sign out
    setUserRole(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, userLoggedIn, signIn, isAdmin, userRole, signOutUser }}>
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