// app/page.tsx (server component)
"use client"
import { redirect, useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function Home() {

  const router = useRouter();
  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    const uid = localStorage.getItem("userId");

    if (!userRole) {
      redirect("/login");
    } else {
      router.push(`/dashboard/${uid}`);
    }
  }, [router]);

  return null; // nothing rendered, just redirects
}
