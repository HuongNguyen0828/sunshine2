// app/page.tsx (server component)
"use client"
import { redirect, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Cookies from "js-cookie"


export default function Home() {

  const router = useRouter();
  useEffect(() => {
    const userRole = Cookies.get("userRole");
    const uid = Cookies.get("userId");

    if (!userRole) {
      redirect("/login");
    } else {
      router.push(`/dashboard/${uid}`);
    }
  }, [router]);

  return null; // nothing rendered, just redirects
}
