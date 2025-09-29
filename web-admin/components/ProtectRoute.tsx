// components/ProtectedRoute.tsx
'use client';

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface Props {
  children: ReactNode;
  roles?: string[]; // roles allowed for this route
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { currentUser, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser || !userRole) {
      router.push("/"); // not logged in, redirect to login page
      return;
    }
    if (roles && !roles.includes(userRole)) {
      router.push("/unauthorized"); // logged in but wrong role
      return;
    }
  }, [currentUser, router, roles]);

  if (!currentUser || !userRole) return null; // or a spinner while redirecting
  if (roles && !roles.includes(userRole)) return null;

  return <>{children}</>;
}
