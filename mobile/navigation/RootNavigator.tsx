import { ReactNode, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onUserChanged } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function RoleGate({ allow, children }: { allow: string[]; children: ReactNode }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const off = onUserChanged(async (u) => {
      if (!u) return router.replace("/auth/sign-in");  // not logged in → sign-in page

      const snap = await getDoc(doc(db, "users", u.uid)); // get user data
      const role = (snap.data()?.role as string) || "parent";
      if (!allow.includes(role)) { 
        if (role === "teacher") router.replace("/(teacher)/(tabs)/dashboard");
        else router.replace("/(parent)/(tabs)/dashboard"); 
        return; // role not allowed → redirect to their main page
      }
      setOk(true); // role allowed → render this page
    });
    return () => off();  // unsubscribe on unmount
  }, [allow]);
  // Show loading indicator while checking role
  if (!ok) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  return <>{children}</>;
}
