// app/layout.tsx
'use client';
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import "./globals.css"; 

// Wrap the entire app with AuthProvider
export default function RootLayout({ children }: { children: ReactNode }) {
  // Protecting the entire app with AuthProvider and Admin check4
  
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