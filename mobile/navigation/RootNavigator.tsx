// mobile/navigation/RootNavigator.tsx 
import { ReactNode, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Props = {
  allow: Array<"teacher" | "parent">;
  children: ReactNode;
};

/**
 * RoleGate:
 * - Do NOT hit Firestore here; rely on ID token custom claims.
 * - Do NOT force refresh (index.tsx already refreshed claims after login/registration).
 * - Use <Redirect /> for navigation to avoid effect loops.
 */
export default function RoleGate({ allow, children }: Props) {
  const [state, setState] = useState<
    "loading" | "ok" | "to-signin" | "to-teacher" | "to-parent"
  >("loading");

  useEffect(() => {
    const off = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setState("to-signin");
        return;
      }
      try {
        const token = await u.getIdTokenResult(); // no force refresh here
        const role = (token.claims?.role as string | undefined) || "";

        if (allow.includes(role as any)) {
          setState("ok");
        } else if (role === "teacher") {
          setState("to-teacher");
        } else if (role === "parent") {
          setState("to-parent");
        } else {
          setState("to-signin");
        }
      } catch {
        setState("to-signin");
      }
    });
    return () => off();
    // join to keep dep stable across renders
  }, [allow.join(",")]);

  if (state === "loading") return null; // render nothing briefly

  if (state === "to-signin") return <Redirect href="/auth/sign-in" />;
  if (state === "to-teacher") return <Redirect href="/(teacher)/(tabs)/dashboard" />;
  if (state === "to-parent") return <Redirect href="/(parent)/(tabs)/dashboard" />;

  // ok
  return <>{children}</>;
}
