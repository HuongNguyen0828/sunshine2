import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onUserChanged, signOutUser } from "@/lib/auth";
import { colors } from "@/constants/color";

export default function Index() {
  const [ready, setReady] = useState(false);
  const retried = useRef(false);

  useEffect(() => {
    const off = onUserChanged(async (u) => {
      if (!u) {
        router.replace("/auth/sign-in");
        setReady(true);
        return;
      }
      try {
        // refresh to get latest custom claims after registration
        await u.getIdToken(true);
        let token = await u.getIdTokenResult();
        let role = (token.claims?.role as string | undefined) || "";

        // if claims not yet propagated, retry once
        if (!role && !retried.current) {
          retried.current = true;
          await u.getIdToken(true);
          token = await u.getIdTokenResult();
          role = (token.claims?.role as string | undefined) || "";
        }

        if (role === "teacher") {
          router.replace("/(teacher)/(tabs)/dashboard"); //  go to internal path
        } else if (role === "parent") {
          router.replace("/(parent)/(tabs)/dashboard");  //  go to internal path
        } else {
          await signOutUser();
          router.replace("/auth/sign-in");
        }
        setReady(true);
      } catch (e) {
        console.error("Bootstrap routing error:", e);
        await signOutUser();
        router.replace("/auth/sign-in");
        setReady(true);
      }
    });
    return () => off();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }
  return null;
}
