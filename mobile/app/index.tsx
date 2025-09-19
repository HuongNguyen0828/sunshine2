import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onUserChanged } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { colors } from "@/constants/color"
import {signOutUser } from "@/lib/auth"



export default function Index() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const off = onUserChanged(async (u) => {
      // if no user, redirect to sign-in
      if (!u) {
        router.replace("/auth/sign-in");
        setReady(true);
        return;
      }

      // Case with current user already sign-in
      try {

        const snap = await getDoc(doc(db, "users", u.uid));
        // Problem when role is defined after sign in: const role = (snap.data()?.role as string) || "parent";
        // This role should not be default to parent
        const role = (snap.data()?.role as string) || null;
         // If no role, sign out and throw error message
        if (!role) {
          await signOutUser();
          const accessError = new Error("Wait to assign role.");
          accessError.name = "AccessDeniedError"; // custom error type
          throw accessError;
        }
        // Redirect based on role: wether parent or teacher
        if (role === "teacher") router.replace("/(teacher)/(tabs)/dashboard");
        if(role == "parent") router.replace("/(parent)/(tabs)/dashboard");
        setReady(true);
      }
      catch (error: any) {
        if (error.name == "AccessDeniedError") throw error;
        else {
          console.error("Sign in error:", error);
          throw new Error(error.message);
        }

      }
    });
    return () => off();
  }, []);
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator /></View>;
  return null;
}
