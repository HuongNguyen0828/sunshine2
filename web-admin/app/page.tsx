// app/dashboard/page.tsx (Server Component)
"use client";
import { redirect } from "next/navigation"
import { useAuth } from "@/lib/auth";
import Cookies from "js-cookie";

export default function DashboardPage() {
  
  const currentUser = useAuth();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.userRole !== "admin") {
    redirect("/unauthorized");
  }

  if (currentUser && currentUser.userRole === "admin") {
    const uid = Cookies.get("uid");
    redirect(`/dashboard/${uid}`); // Redirect to the specific admin dashboard
  }
}