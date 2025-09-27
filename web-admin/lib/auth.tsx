// src/lib/auth.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, IdTokenResult, createUserWithEmailAndPassword, updateProfile} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import app from './firebase';

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


// Access Error with admin
interface AccessDeniedError extends Error {
  name: 'AccessDeniedError';
}

const hasName = (x: unknown): x is { name: unknown } =>
  typeof x === 'object' && x !== null && 'name' in x;

const isAccessDeniedError = (e: unknown): e is AccessDeniedError =>
  hasName(e) && e.name === 'AccessDeniedError';

const isFirebaseError = (e: unknown): e is FirebaseError => e instanceof FirebaseError;




export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = getAuth(app);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkUserRole = async (user: User | null): Promise<string | null> => {
    if (!user) return null;
    try {
      const idTokenResult: IdTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role as string | undefined;
      setUserRole(role ?? null);
      setIsAdmin(role === "admin");
      return role ?? null;
    } catch {
      setUserRole(null);
      setIsAdmin(false);
      return null;
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

  // Produce custom-role error message: parameter is role
  const makeAccessDeniedError = (role: string | null): AccessDeniedError => {
    let err = null;
    // case role is null: external user
    if (role == null) err = new Error(`Unrecognized email. Admins only. Please register your daycare with Sunshine.`);
    // else: parent or teacher
    else err = new Error(`Access denied for ${role}. Admins only. Please use Sunshine mobile app`);
    (err as AccessDeniedError).name = 'AccessDeniedError';
    return err as AccessDeniedError;
  };

 
  // Sign up
  const signUp = async (name: string, email: string, password: string) => {
    // Step 1: check email
    const res = await fetch("http://localhost:5000/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    // Only respond ok is valid email
    if (!res.ok) throw new Error("Email not authorized");
    const { role } = await res.json(); // get the role: example: role: "parent"

    // Step 2: create Firebase Authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    // Step 3: Verify role in backend, and create users collection with same uid
    const idToken = await userCredential.user.getIdToken();
    await fetch("http://localhost:5000/auth/verify-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, name }),
    });
  };

    // Sign in: 
  // 4 cases:
    // Case 1: user is extenal of our system: email doesn't exist-> throw error: Unrecognized email.  Your daycare registered with Sunshine to signUp and login
    // Case 2: user is parent or teacher: throw error: Hello, parent (teacher), please login in Sunshine mobile app
    // Case 3. user is admin, entering wrong password: throw error: Hello admin, Invalid passowrd
    // Case 4. Success: user is admin and all correct: redirect into dashboard.
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      // 1. Firebase Auth login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 2. Get ID token
      const idToken = await userCredential.user.getIdToken();
      
      // 3. Call backend to get role
      const res = await fetch("http://localhost:5000/auth/get-role", {
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
      localStorage.setItem("userRole", data.user.role);

    } catch (error: any) {
      // Error from Frontend: Firebase Auth errors with signInWithEmailAndPassword
      if (error.code === "auth/invalid-credential") throw new Error("Invalid Email or Password");
      // else, error from role-base
      throw error;
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
