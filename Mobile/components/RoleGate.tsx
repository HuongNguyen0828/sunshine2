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
      if (!u) return router.replace("/auth/sign-in");
      const snap = await getDoc(doc(db, "users", u.uid));
      const role = (snap.data()?.role as string) || "parent";
      if (!allow.includes(role)) {
        if (role === "staff" || role === "admin") router.replace("/(teacher)/(tabs)/dashboard");
        else router.replace("/(parent)/(tabs)/dashboard");
        return;
      }
      setOk(true);
    });
    return () => off();
  }, []);
  if (!ok) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  return <>{children}</>;
}
