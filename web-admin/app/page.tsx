// web-admin/app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Cookies from "js-cookie";
import { useEffect, useRef } from "react";

export default function DashboardPage() {
  const { currentUser, loading, userRole, isAdmin } = useAuth();
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (loading || redirectedRef.current) return;

    if (!currentUser) {
      redirectedRef.current = true;
      router.replace("/login");
      // alert(currentUser);
      return;
    }

    const uidFromCookie = Cookies.get("uid");
    const uid = uidFromCookie ?? currentUser.uid;

    if (uid) {
      redirectedRef.current = true;
      router.replace(`/dashboard/${uid}`);
      return;
    }

  }, [currentUser, loading, userRole, router]);
  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}

