// app/layout.tsx
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth"; // client component
import "./globals.css";

// Server component layout wrapping the app with the AuthProvider
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Provide Firebase Auth state to the whole app */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
