'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DevWrapperProps {
  children: React.ReactNode;
}

export default function DevWrapper({ children }: DevWrapperProps) {
  const { userLoggedIn, loading } = useAuth();
  const router = useRouter();
  const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  useEffect(() => {
    if (!loading && (userLoggedIn || bypassAuth)) {
      router.push('/dashboard');
    }
  }, [userLoggedIn, loading, bypassAuth, router]);

  if (bypassAuth) {
    router.push('/dashboard');
    return <div>Redirecting to dashboard...</div>;
  }

  return <>{children}</>;
}