"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Cookies from "js-cookie";
import { useEffect, useRef } from "react";

export default function DashboardPage() {
  const { currentUser, loading, userRole } = useAuth();
  const router = useRouter();

  // Prevent double redirects during fast refresh or state flaps
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (loading || redirectedRef.current) return; // wait until auth settles; avoid duplicate redirects

    // Not signed in → go login
    if (!currentUser) {
      redirectedRef.current = true;
      router.replace("/login");
      return;
    }

    // Signed in but not admin → unauthorized
    if (userRole !== "admin") {
      redirectedRef.current = true;
      router.replace("/unauthorized");
      return;
    }

    // Admin: prefer cookie uid, fallback to firebase uid
    const uidFromCookie = Cookies.get("uid");
    const uid = uidFromCookie ?? currentUser.uid;

    // If we have a uid, go to dashboard
    if (uid) {
      redirectedRef.current = true;
      router.replace(`/dashboard/${uid}`);
      return;
    }

    // No uid anywhere → safe fallback
    redirectedRef.current = true;
    router.replace("/dashboard");
  }, [currentUser, loading, userRole, router]);

  // Render a minimal placeholder while deciding where to go
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
