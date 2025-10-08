// app/dashboard/page.tsx (Server Component)
"use client";
import { redirect } from "next/navigation"

export default function DashboardPage() {
  
  const userRole = localStorage.getItem("userRole");

  if (!userRole) {
    redirect("/login");
  }

  if (localStorage.getItem("userRole") !== "admin") {
    redirect("/unauthorized");
  }

  if (localStorage.getItem("userRole") === "admin") {
    redirect("/dashboard");
  }
}