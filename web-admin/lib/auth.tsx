// src/lib/auth.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, IdTokenResult } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import app from './firebase';
import swal from "sweetalert2"

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  userLoggedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  isAdmin: boolean;
  userRole: string | null;
  signOutUser: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Sign up
const signUp = async (name: string, email: string, password: string ) => {

  try {
    const res = await fetch("http://localhost:5000/auth/signUp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({name, email, password}),
    });

    // Respond not ok
    if (!res.ok) {
      // Handle backend errors (including email not recognied, ...)
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to register")
    }

    // Else
    const data = await res.json();
    console.log(" Signup success", data.message);

    return data;

  } catch (error: any) {
    console.log(error.message)
    throw error; // Important: re-throw error
  }
}

// Access Error with admin
interface AccessDeniedError extends Error {
  name: 'AccessDeniedError';
}

const hasName = (x: unknown): x is { name: unknown } =>
  typeof x === 'object' && x !== null && 'name' in x;

const isAccessDeniedError = (e: unknown): e is AccessDeniedError =>
  hasName(e) && e.name === 'AccessDeniedError';

const isFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;

const makeAccessDeniedError = (): AccessDeniedError => {
  const err = new Error('Access denied. Admin privileges required.');
  (err as AccessDeniedError).name = 'AccessDeniedError';
  return err as AccessDeniedError;
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = getAuth(app);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkUserRole = async (user: User | null): Promise<boolean> => {
    if (!user) {
      setUserRole(null);
      setIsAdmin(false);
      return false;
    }
    try {
      const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as string | undefined;
      setUserRole(role ?? null);
      const admin = role === 'admin';
      setIsAdmin(admin);
      return admin;
    } catch {
      setUserRole(null);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setUserLoggedIn(!!user);
      void checkUserRole(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const ok = await checkUserRole(cred.user);
      if (!ok) {
        await signOut(auth);
        throw makeAccessDeniedError();
      }
    } catch (err: unknown) {
      if (isFirebaseError(err)) {
        if (err.code === 'auth/invalid-credential') throw new Error('Email or password is incorrect.');
        throw new Error(err.message);
      }
      if (isAccessDeniedError(err)) throw err;
      if (err instanceof Error) throw new Error(err.message || 'Sign-in failed.');
      throw new Error('Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUserRole(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, userLoggedIn, signIn, signUp, isAdmin, userRole, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
