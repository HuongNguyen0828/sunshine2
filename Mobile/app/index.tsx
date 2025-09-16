import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onUserChanged } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { colors } from "@/constants/color"

export default function Index() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const off = onUserChanged(async (u) => {
      if (!u) {
        router.replace("/auth/sign-in");
        setReady(true);
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const role = (snap.data()?.role as string) || "parent";
      if (role === "staff" || role === "admin") router.replace("/(staff)/(tabs)/dashboard");
      else router.replace("/(parent)/(tabs)/dashboard");
      setReady(true);
    });
    return () => off();
  }, []);
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator /></View>;
  return null;
}
