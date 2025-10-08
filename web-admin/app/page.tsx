"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Cookies from "js-cookie";
import { useEffect } from "react";

export default function DashboardPage() {
  const { currentUser, loading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    if (userRole !== "admin") {
      router.replace("/unauthorized");
      return;
    }

    const uid = Cookies.get("uid");
    if (uid) {
      router.replace(`/dashboard/${uid}`);
    }
  }, [currentUser, loading, router]);

  // Optional: loading spinner or blank screen
  return (
    <div className="flex items-center justify-center h-screen">
      {loading ? <p>Loading...</p> : null}
    </div>
  );
}
