// app/layout.tsx
'use client';
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth"; 
import { LoadScript } from "@react-google-maps/api"; // for using AutoComplete api throughout the web-app

const libraries: ("places")[] = ["places"]; // for using AutoComplete api throughout the web-app

// Wrap the entire app with AuthProvider
export default function RootLayout({ children }: { children: ReactNode }) {
  // Protecting the entire app with AuthProvider and Admin check4
  
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Wrap web-admin app with AuthContext, and then LoadScript */}
          {/* Only load once, otherwise, error */}
          <LoadScript 
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
            libraries={libraries}
          >
            {children}
          </LoadScript>
        </AuthProvider>
      </body>
    </html>
  );
}