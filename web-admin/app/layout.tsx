// app/layout.tsx
'use client';
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth"; 

// Wrap the entire app with AuthProvider
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}