// app/layout.tsx
'use client';
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { LoadScript } from "@react-google-maps/api"; // for using AutoComplete api throughout the web-app
// import { ConvexProvider, ConvexReactClient } from "convex/react";

// From console log: Performance warning! LoadScript has been reloaded unintentionally! You should not pass `libraries` prop as new array. Please keep an array of libraries as static class property for Components and PureComponents, or just a const variable outside of component, or somewhere in config files or ENV variables
const libraries: ("places")[] = ["places"];

// Initialize Convex client
// const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Wrap the entire app with AuthProvider
export default function RootLayout({ children }: { children: ReactNode }) {
  // Protecting the entire app with AuthProvider and Admin check4

  return (
    <html lang="en">
      <body>
        {/*<ConvexProvider client={convex}> */}
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
        {/*</ConvexProvider> */}
      </body>
    </html>
  );
}