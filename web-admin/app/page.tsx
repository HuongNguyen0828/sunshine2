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

    if (userRole !== "admin") {
      router.replace("/unauthorized");
      return;
    }

    if (userRole === "admin") {
      const uid = Cookies.get("uid");
      router.replace(`/dashboard/${uid}`);
    }
  }, [currentUser, loading, router, userRole]);

  // Optional: loading spinner or blank screen
  return (
    <div className="flex items-center justify-center h-screen">
      {loading ? <p>Loading...</p> : null}
    </div>
  );
}
