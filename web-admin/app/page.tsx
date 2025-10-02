// app/page.tsx (server component)
"use client"
import { redirect, useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function Home() {

  const router = useRouter();
  useEffect(() => {
    const user = localStorage.getItem("user");

    if (!user) {
      redirect("/login");
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  return null; // nothing rendered, just redirects
}
